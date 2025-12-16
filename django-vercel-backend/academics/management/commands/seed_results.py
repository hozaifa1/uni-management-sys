from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal, ROUND_HALF_UP
import random

from academics.models import Exam, Result
from accounts.models import Student


class Command(BaseCommand):
    help = 'Seed results for all existing students based on course/semester exams'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-existing',
            action='store_true',
            help='Do not clear existing results before seeding',
        )
        parser.add_argument(
            '--student-limit',
            type=int,
            default=0,
            help='Limit number of students (0 = all)',
        )

    def handle(self, *args, **options):
        keep_existing = options.get('keep_existing', False)
        student_limit = int(options.get('student_limit') or 0)

        students_qs = Student.objects.all().order_by('id')
        if student_limit > 0:
            students_qs = students_qs[:student_limit]
        students = list(students_qs)

        exams = list(
            Exam.objects.select_related('subject').all().order_by('course', 'semester', 'subject_id', 'exam_type')
        )

        if not students:
            self.stdout.write(self.style.WARNING('No students found. Please seed students first.'))
            return

        if not exams:
            self.stdout.write(self.style.WARNING('No exams found. Please seed exams first.'))
            return

        exams_by_course_semester = {}
        skipped_exams_without_subject = 0
        for exam in exams:
            if not exam.subject_id:
                skipped_exams_without_subject += 1
                continue
            exams_by_course_semester.setdefault((exam.course, exam.semester), []).append(exam)

        if skipped_exams_without_subject:
            self.stdout.write(self.style.WARNING(f'Skipped exams without subject: {skipped_exams_without_subject}'))

        total_students_processed = 0
        total_students_skipped = 0
        total_results_created = 0

        with transaction.atomic():
            if not keep_existing:
                deleted_count, _ = Result.objects.all().delete()
                self.stdout.write(self.style.WARNING(f'Cleared existing results: {deleted_count} deleted.'))

            exams_to_update = []
            for exam in exams:
                if exam.subject_id and exam.subject and exam.total_marks != exam.subject.total_marks:
                    exam.total_marks = exam.subject.total_marks
                    exams_to_update.append(exam)
            if exams_to_update:
                Exam.objects.bulk_update(exams_to_update, ['total_marks'], batch_size=2000)

            buffer = []
            buffer_flush_size = 5000

            for student in students:
                if not student.course or not student.semester:
                    total_students_skipped += 1
                    continue

                student_exams = exams_by_course_semester.get((student.course, student.semester), [])
                if not student_exams:
                    total_students_skipped += 1
                    continue

                total_students_processed += 1

                for exam in student_exams:
                    subject = exam.subject
                    if not subject:
                        continue

                    marks_obtained = self._generate_marks(student_id=student.id, exam=exam)

                    buffer.append(
                        Result(
                            student=student,
                            exam=exam,
                            subject=subject,
                            marks_obtained=marks_obtained,
                            remarks='Auto-seeded result',
                            teacher_comment='Auto-generated teacher comment',
                        )
                    )

                    if len(buffer) >= buffer_flush_size:
                        Result.objects.bulk_create(
                            buffer,
                            batch_size=2000,
                            ignore_conflicts=keep_existing,
                        )
                        total_results_created += len(buffer)
                        buffer = []

            if buffer:
                Result.objects.bulk_create(
                    buffer,
                    batch_size=2000,
                    ignore_conflicts=keep_existing,
                )
                total_results_created += len(buffer)

        self.stdout.write(
            self.style.SUCCESS(
                f'Results seeded. Students processed: {total_students_processed}, '
                f'skipped (no exams): {total_students_skipped}, '
                f'results created: {total_results_created}.'
            )
        )

    def _generate_marks(self, student_id, exam):
        subject = exam.subject
        total = int(getattr(subject, 'total_marks', 100) or 100)

        seed = (student_id * 1000003) ^ (exam.id * 9176) ^ (hash(exam.exam_type) & 0xFFFF)
        rng = random.Random(seed)

        if exam.exam_type == 'incourse_1st':
            base_min, base_max = 35.0, 85.0
        elif exam.exam_type == 'incourse_2nd':
            base_min, base_max = 40.0, 88.0
        else:
            base_min, base_max = 45.0, 92.0

        roll = rng.random()
        if roll < 0.05:
            base_min, base_max = 0.0, 25.0
        elif roll < 0.12:
            base_min, base_max = 25.0, 39.0

        percentage = rng.uniform(base_min, base_max)
        raw_marks = (percentage / 100.0) * float(total)

        if raw_marks < 0:
            raw_marks = 0.0
        if raw_marks > total:
            raw_marks = float(total)

        return Decimal(str(raw_marks)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
