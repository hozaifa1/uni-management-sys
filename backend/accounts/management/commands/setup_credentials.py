"""
Generate credentials for every seeded student + create a coordinator user.

For each Student with an unusable password, generates a strong random
password, sets it on the linked User, and writes the username/password
pair to a local CSV (path defaults to a gitignored folder). The CSV is
the ONLY plaintext copy — it must not be committed.

Also ensures a single coordinator account exists with a known password,
written to the same CSV under role=COORDINATOR.

Usage:
    python manage.py setup_credentials \
        --output ../credentials/student_passwords.csv \
        --coordinator-username coordinator \
        --coordinator-password <pw or omit to auto-generate>

Re-running with --force regenerates passwords for ALL students (not just
those without one). Without --force, only students with an unusable
password get a new one — existing usable passwords are preserved.
"""

from __future__ import annotations

import csv
import secrets
import string
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Student, User


ALPHABET = string.ascii_letters + string.digits


def _generate_password(length: int = 10) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


class Command(BaseCommand):
    help = "Generate per-student passwords + coordinator account; write to CSV."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="../credentials/student_passwords.csv",
            help="CSV path (default: ../credentials/student_passwords.csv — gitignored).",
        )
        parser.add_argument("--force", action="store_true",
                            help="Regenerate password for every student.")
        parser.add_argument("--coordinator-username", default="coordinator")
        parser.add_argument("--coordinator-password", default=None,
                            help="Coordinator password; auto-generated if omitted.")
        parser.add_argument("--length", type=int, default=10,
                            help="Generated password length (default 10).")

    def handle(self, *args, **opts):
        output_path = Path(opts["output"]).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        coordinator_row = self._setup_coordinator(
            opts["coordinator_username"],
            opts["coordinator_password"] or _generate_password(opts["length"]),
        )

        student_rows = self._setup_students(opts["force"], opts["length"])

        all_rows = [coordinator_row] + student_rows

        with output_path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["role", "username", "full_name", "password"])
            writer.writerows(all_rows)

        self.stdout.write(self.style.SUCCESS(f"\nWrote credentials → {output_path}"))
        self.stdout.write(self.style.WARNING(
            "IMPORTANT: this file contains plaintext passwords. Do NOT commit it.\n"
            "It is gitignored at ../credentials/."
        ))

    def _setup_coordinator(self, username: str, password: str) -> list[str]:
        with transaction.atomic():
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": "Coordinator",
                    "last_name": "",
                    "role": "COORDINATOR",
                    "is_active": True,
                },
            )
            user.role = "COORDINATOR"
            user.is_active = True
            user.set_password(password)
            user.save()
        self.stdout.write(self.style.SUCCESS(f"Coordinator ready: {username}"))
        return ["COORDINATOR", username, "Coordinator", password]

    def _setup_students(self, force: bool, length: int) -> list[list[str]]:
        students = list(Student.objects.select_related("user").all())
        rows: list[list[str]] = []
        updated = 0

        with transaction.atomic():
            for student in students:
                user = student.user
                if not user:
                    continue
                if not force and user.has_usable_password():
                    continue
                pw = _generate_password(length)
                user.set_password(pw)
                user.is_active = True
                user.save(update_fields=["password", "is_active"])
                rows.append([
                    "STUDENT",
                    user.username,
                    student.full_name or user.get_full_name() or user.username,
                    pw,
                ])
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Set passwords for {updated} students (force={force})."
        ))
        return rows
