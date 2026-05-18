"""
Seed the database with real IGMIS Excel data exported to data_to_seed/csv.

Imports six CSVs in dependency order:
  1. students.csv          -> User + Student
  2. admission_records.csv -> AdmissionRecord (one per student)
  3. payments.csv          -> Payment (links to Student by roll_number)
  4. semester_summary.csv  -> SemesterSummary
  5. daily_accounts.csv    -> DailyAccount cashbook
  6. fee_structure_thm.csv -> FeeStructure reference

Use --wipe to clear existing Student/Payment/* before seeding.
"""

from __future__ import annotations

import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import Student, User
from payments.models import (
    AdmissionRecord,
    DailyAccount,
    FeeStructure,
    Payment,
    SemesterSummary,
)


DEFAULT_CSV_DIR = Path("F:/Projects/IGMIS LMS/data_to_seed/csv")

SEMESTER_LABEL_TO_CODE = {
    "1st Sem": "1st",
    "2nd Sem": "2nd",
    "3rd Sem": "3rd",
    "4th Sem": "4th",
    "5th Sem": "5th",
    "6th Sem": "6th",
    "7th Sem": "7th",
    "8th Sem": "8th",
}

DEFAULT_ADMISSION_DATE = datetime(2020, 1, 1).date()


def _to_decimal(value: str | None, default: Decimal = Decimal("0")) -> Decimal:
    if value is None:
        return default
    cleaned = str(value).strip().replace(",", "")
    if not cleaned:
        return default
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return default


def _to_int(value: str | None) -> int | None:
    if value is None:
        return None
    cleaned = str(value).strip().replace(",", "")
    if not cleaned:
        return None
    try:
        return int(float(cleaned))
    except (ValueError, TypeError):
        return None


def _to_date(value: str | None):
    if not value:
        return None
    cleaned = str(value).strip()
    if not cleaned or cleaned.lower() in {"nan", "none"}:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _split_name(full: str) -> tuple[str, str]:
    parts = (full or "").strip().split(None, 1)
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


def _split_program_code(program: str) -> str:
    program = (program or "").strip().upper()
    return program if program in {"BBA", "MBA", "CSE", "THM"} else "BBA"


class Command(BaseCommand):
    help = "Seed database with real IGMIS data from data_to_seed/csv."

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv-dir",
            default=str(DEFAULT_CSV_DIR),
            help="Directory containing the seed CSVs.",
        )
        parser.add_argument(
            "--wipe",
            action="store_true",
            help="Wipe existing student/payment data before seeding.",
        )
        parser.add_argument(
            "--skip-daily",
            action="store_true",
            help="Skip daily_accounts.csv (very large; skip for quick imports).",
        )

    def handle(self, *args, **options):
        csv_dir = Path(options["csv_dir"]).resolve()
        if not csv_dir.exists():
            raise CommandError(f"CSV directory not found: {csv_dir}")

        self.stdout.write(self.style.NOTICE(f"Seeding from: {csv_dir}"))

        if options["wipe"]:
            self._wipe()

        # Commit per section so progress is visible (and DB doesn't hold one
        # giant transaction across thousands of network round trips).
        roll_to_student = self._seed_students(csv_dir / "students.csv")
        self._seed_admissions(csv_dir / "admission_records.csv", roll_to_student)
        self._seed_payments(csv_dir / "payments.csv", roll_to_student)
        self._seed_semester_summaries(
            csv_dir / "semester_summary.csv", roll_to_student
        )
        self._seed_fee_structure(csv_dir / "fee_structure_thm.csv")

        if not options["skip_daily"]:
            self._seed_daily_accounts(csv_dir / "daily_accounts.csv")

        self._report()

    def _wipe(self) -> None:
        self.stdout.write(self.style.WARNING("Wiping existing seed data..."))
        DailyAccount.objects.all().delete()
        FeeStructure.objects.all().delete()
        SemesterSummary.objects.all().delete()
        AdmissionRecord.objects.all().delete()
        Payment.objects.all().delete()
        student_user_ids = list(Student.objects.values_list("user_id", flat=True))
        Student.objects.all().delete()
        User.objects.filter(id__in=student_user_ids).delete()
        self.stdout.write(self.style.WARNING("  cleared."))

    def _seed_students(self, path: Path) -> dict[str, Student]:
        self.stdout.write(self.style.NOTICE(f"Loading students from {path.name}..."))
        if not path.exists():
            raise CommandError(f"Missing CSV: {path}")

        # Parse CSV first.
        rows_by_roll: dict[str, dict] = {}
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                roll = (row.get("roll_number") or "").strip()
                if not roll or roll in rows_by_roll:
                    continue
                rows_by_roll[roll] = row

        valid_intakes = dict(Student.INTAKE_CHOICES)
        unusable = make_password(None)

        # Find Users that already exist for these rolls (mostly empty after wipe).
        existing_users = {u.username: u for u in User.objects.filter(username__in=rows_by_roll.keys())}

        # Bulk-create Users that don't exist yet.
        new_users = []
        for roll, row in rows_by_roll.items():
            if roll in existing_users:
                continue
            first, last = _split_name(row.get("name") or "")
            new_users.append(User(
                username=roll,
                first_name=first,
                last_name=last,
                role="STUDENT",
                is_active=True,
                password=unusable,
            ))
        if new_users:
            User.objects.bulk_create(new_users, batch_size=500, ignore_conflicts=True)
            self.stdout.write(self.style.SUCCESS(f"  bulk_created {len(new_users)} users."))

        # Reload to get IDs.
        users_by_username = {u.username: u for u in User.objects.filter(username__in=rows_by_roll.keys())}

        # Find Students that already exist (none after wipe, but guard).
        existing_student_ids = set(
            Student.objects.filter(roll_number__in=rows_by_roll.keys()).values_list("roll_number", flat=True)
        )

        to_create: list[Student] = []
        for roll, row in rows_by_roll.items():
            if roll in existing_student_ids:
                continue
            user = users_by_username.get(roll)
            if not user:
                continue
            name = (row.get("name") or "").strip()
            first, _ = _split_name(name)
            program = _split_program_code(row.get("program") or "BBA")
            intake = (row.get("intake_batch") or "").strip() or "15th"
            to_create.append(Student(
                user=user,
                student_id=f"STU{roll}",
                roll_number=roll,
                intake_batch=intake,
                full_name=name or first,
                registration_number=(row.get("registration_number") or "").strip() or None,
                course=program,
                intake=intake if intake in valid_intakes else "15th",
                semester="1st",
                admission_date=DEFAULT_ADMISSION_DATE,
                total_program_fee=_to_decimal(row.get("total_program_fee")),
                semester_fee=_to_decimal(row.get("semester_fee")),
                monthly_tuition_fee=_to_decimal(row.get("monthly_tuition_fee")),
                fee_waiver=_to_decimal(row.get("fee_waiver")),
                father_phone=(row.get("father_contact") or "").strip() or None,
            ))
        if to_create:
            Student.objects.bulk_create(to_create, batch_size=500, ignore_conflicts=True)

        # Reload — roll_to_student map for downstream sections.
        roll_to_student = {
            s.roll_number: s
            for s in Student.objects.filter(roll_number__in=rows_by_roll.keys()).select_related("user")
        }
        self.stdout.write(self.style.SUCCESS(f"  total students: {len(roll_to_student)}"))
        return roll_to_student

    def _seed_admissions(
        self, path: Path, roll_to_student: dict[str, Student]
    ) -> None:
        self.stdout.write(self.style.NOTICE(f"Loading admissions from {path.name}..."))
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"  missing {path}, skipping"))
            return

        # Build records, dedup by student (OneToOne) — keep last row per student.
        records_by_student: dict[int, AdmissionRecord] = {}
        admission_dates_by_student: dict[int, "datetime.date"] = {}
        skipped = 0
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                roll = (row.get("roll_number") or "").strip()
                student = roll_to_student.get(roll)
                if not student:
                    skipped += 1
                    continue
                records_by_student[student.pk] = AdmissionRecord(
                    student=student,
                    program=_split_program_code(row.get("program") or ""),
                    intake_batch=(row.get("intake_batch") or "").strip() or None,
                    roll_number=roll,
                    name=(row.get("name") or "").strip() or None,
                    registration_number=(row.get("registration_number") or "").strip() or None,
                    application_date=_to_date(row.get("application_date")),
                    application_fee=_to_decimal(row.get("application_fee")),
                    admission_date=_to_date(row.get("admission_date")),
                    admission_fee=_to_decimal(row.get("admission_fee")),
                    discount=_to_decimal(row.get("discount")),
                    total_program_fee=_to_decimal(row.get("total_program_fee")),
                    semester_fee=_to_decimal(row.get("semester_fee")),
                    monthly_tuition_fee=_to_decimal(row.get("monthly_tuition_fee")),
                    semester_fee_waived=_to_decimal(row.get("semester_fee_waived")),
                    tuition_fee_waived=_to_decimal(row.get("tuition_fee_waived")),
                    total_fees_waived=_to_decimal(row.get("total_fees_waived")),
                    contact_number=(row.get("contact_number") or "").strip() or None,
                    father_contact=(row.get("father_contact") or "").strip() or None,
                    reference=(row.get("reference") or "").strip() or None,
                    income_total=_to_decimal(row.get("income_total")) or None,
                    pin_no=(row.get("pin_no") or "").strip() or None,
                    remarks=(row.get("remarks") or "").strip() or None,
                )
                ad = _to_date(row.get("admission_date"))
                if ad:
                    admission_dates_by_student[student.pk] = ad

        AdmissionRecord.objects.bulk_create(
            list(records_by_student.values()),
            batch_size=500,
            ignore_conflicts=True,
        )
        # Single bulk update for student admission_date.
        if admission_dates_by_student:
            students = list(Student.objects.filter(pk__in=admission_dates_by_student.keys()))
            for s in students:
                s.admission_date = admission_dates_by_student[s.pk]
            Student.objects.bulk_update(students, ["admission_date"], batch_size=500)

        self.stdout.write(
            self.style.SUCCESS(
                f"  created {len(records_by_student)} admission records (skipped {skipped} unknown rolls)."
            )
        )

    def _seed_payments(
        self, path: Path, roll_to_student: dict[str, Student]
    ) -> None:
        self.stdout.write(self.style.NOTICE(f"Loading payments from {path.name}..."))
        if not path.exists():
            raise CommandError(f"Missing CSV: {path}")

        batch: list[Payment] = []
        skipped = 0
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                roll = (row.get("roll_number") or "").strip()
                student = roll_to_student.get(roll)
                if not student:
                    skipped += 1
                    continue
                amount = _to_decimal(row.get("amount"))
                if amount <= 0:
                    continue
                pay_date = _to_date(row.get("payment_date")) or DEFAULT_ADMISSION_DATE
                batch.append(
                    Payment(
                        student=student,
                        amount_paid=amount,
                        payment_date=pay_date,
                        payment_method="cash",
                        fee_type=(row.get("payment_type") or "").strip() or None,
                        semester=(row.get("semester") or "").strip() or None,
                        late_fine=_to_decimal(row.get("late_fine")),
                        discount_amount=_to_decimal(row.get("discount")),
                        remarks=(row.get("remarks") or "").strip() or None,
                    )
                )
        Payment.objects.bulk_create(batch, batch_size=500)
        self.stdout.write(
            self.style.SUCCESS(f"  created {len(batch)} payments (skipped {skipped} unknown rolls).")
        )

    def _seed_semester_summaries(
        self, path: Path, roll_to_student: dict[str, Student]
    ) -> None:
        self.stdout.write(self.style.NOTICE(f"Loading semester summaries from {path.name}..."))
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"  missing {path}, skipping"))
            return

        batch: list[SemesterSummary] = []
        skipped = 0
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                roll = (row.get("roll_number") or "").strip()
                student = roll_to_student.get(roll)
                if not student:
                    skipped += 1
                    continue
                batch.append(
                    SemesterSummary(
                        student=student,
                        semester=(row.get("semester") or "").strip(),
                        program=_split_program_code(row.get("program") or ""),
                        intake_batch=(row.get("intake_batch") or "").strip() or None,
                        total_program_fee=_to_decimal(row.get("total_program_fee")),
                        semester_fee=_to_decimal(row.get("semester_fee")),
                        monthly_tuition_fee=_to_decimal(row.get("monthly_tuition_fee")),
                        fee_waiver=_to_decimal(row.get("fee_waiver")),
                        opening_balance=_to_decimal(row.get("opening_balance")),
                        semester_total_received=_to_decimal(row.get("semester_total_received")),
                        closing_balance=_to_decimal(row.get("closing_balance")),
                        cumulative_received_after_semester=_to_decimal(row.get("cumulative_received_after_semester")),
                        cumulative_due_after_semester=_to_decimal(row.get("cumulative_due_after_semester")),
                        receivable_at_mt_exam=_to_decimal(row.get("receivable_at_mt_exam")),
                        total_receivable_end_of_semester=_to_decimal(row.get("total_receivable_end_of_semester")),
                        total_payable_at_form_fillup=_to_decimal(row.get("total_payable_at_form_fillup")),
                        midterm_1_date=_to_date(row.get("midterm_1_date")),
                        midterm_1_fee=_to_decimal(row.get("midterm_1_fee")),
                        midterm_2_date=_to_date(row.get("midterm_2_date")),
                        midterm_2_fee=_to_decimal(row.get("midterm_2_fee")),
                        midterm_absent_fine=_to_decimal(row.get("midterm_absent_fine")),
                        nu_exam_date=_to_date(row.get("nu_exam_date")),
                        nu_exam_fee=_to_decimal(row.get("nu_exam_fee")),
                        library_deposit=_to_decimal(row.get("library_deposit")),
                        library_fine=_to_decimal(row.get("library_fine")),
                        classes_present=_to_int(row.get("classes_present")),
                        classes_absent=_to_int(row.get("classes_absent")),
                        percent_absent=_to_decimal(row.get("percent_absent")) if row.get("percent_absent") else None,
                        absence_fine=_to_decimal(row.get("absence_fine")),
                        late_payment_fine_total=_to_decimal(row.get("late_payment_fine_total")),
                        remarks=(row.get("remarks") or "").strip() or None,
                    )
                )
        SemesterSummary.objects.bulk_create(batch, batch_size=500, ignore_conflicts=True)
        self.stdout.write(
            self.style.SUCCESS(f"  created {len(batch)} semester summaries (skipped {skipped} unknown rolls).")
        )

        # Update latest semester on each student based on summaries we just loaded.
        self._update_student_current_semester(roll_to_student)

    def _update_student_current_semester(self, roll_to_student: dict[str, Student]) -> None:
        sem_order = {label: i for i, label in enumerate(SEMESTER_LABEL_TO_CODE.keys(), start=1)}
        # One query for all summaries.
        latest_by_student: dict[int, str] = {}
        student_ids = [s.pk for s in roll_to_student.values()]
        for sid, sem in SemesterSummary.objects.filter(student_id__in=student_ids).values_list("student_id", "semester"):
            cur = latest_by_student.get(sid)
            if cur is None or sem_order.get(sem, 0) > sem_order.get(cur, 0):
                latest_by_student[sid] = sem

        students = list(Student.objects.filter(pk__in=latest_by_student.keys()))
        to_update = []
        for s in students:
            code = SEMESTER_LABEL_TO_CODE.get(latest_by_student[s.pk])
            if code and s.semester != code:
                s.semester = code
                to_update.append(s)
        if to_update:
            Student.objects.bulk_update(to_update, ["semester"], batch_size=500)

    def _seed_daily_accounts(self, path: Path) -> None:
        self.stdout.write(self.style.NOTICE(f"Loading daily accounts from {path.name}..."))
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"  missing {path}, skipping"))
            return

        DailyAccount.objects.all().delete()
        batch: list[DailyAccount] = []
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                batch.append(
                    DailyAccount(
                        source_file=(row.get("source_file") or "").strip() or None,
                        sheet=(row.get("sheet") or "").strip() or None,
                        year_group=(row.get("year_group") or "").strip() or None,
                        date=_to_date(row.get("date")),
                        description=(row.get("description") or "").strip() or None,
                        exam_fee=_to_decimal(row.get("exam_fee")),
                        cash_receive=_to_decimal(row.get("cash_receive")),
                        cash_expense=_to_decimal(row.get("cash_expense")),
                        cash_balance=_to_decimal(row.get("cash_balance")),
                    )
                )
        DailyAccount.objects.bulk_create(batch, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f"  created {len(batch)} cashbook entries."))

    def _seed_fee_structure(self, path: Path) -> None:
        self.stdout.write(self.style.NOTICE(f"Loading fee structure from {path.name}..."))
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"  missing {path}, skipping"))
            return

        FeeStructure.objects.filter(program="THM").delete()
        order = 0
        created = 0
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                item = (row.get("col_1") or "").strip()
                unit = (row.get("col_2") or "").strip()
                total = (row.get("col_3") or "").strip()
                desc = (row.get("col_4") or "").strip()
                if not item or item.lower() in {"items", "note:", "total"} or "Institute" in item or "College Code" in item or "Fee Structure" in item or "Fee structure" in item:
                    continue
                if not unit and not total:
                    continue
                FeeStructure.objects.create(
                    program="THM",
                    item=item,
                    unit_amount=_to_decimal(unit),
                    total_amount=_to_decimal(total),
                    description=desc or None,
                    order=order,
                )
                order += 1
                created += 1
        self.stdout.write(self.style.SUCCESS(f"  created {created} fee structure rows."))

    def _report(self) -> None:
        self.stdout.write(self.style.SUCCESS("\nDone. Database state:"))
        self.stdout.write(f"  Students:           {Student.objects.count()}")
        self.stdout.write(f"  Payments:           {Payment.objects.count()}")
        self.stdout.write(f"  Admission records:  {AdmissionRecord.objects.count()}")
        self.stdout.write(f"  Semester summaries: {SemesterSummary.objects.count()}")
        self.stdout.write(f"  Daily entries:      {DailyAccount.objects.count()}")
        self.stdout.write(f"  Fee structure rows: {FeeStructure.objects.count()}")
