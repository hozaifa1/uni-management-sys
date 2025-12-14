"""
Management command to seed exam data for IGMIS LMS
Seeds: Exams for each course/intake/semester/session with proper associations
"""
from django.core.management.base import BaseCommand
from datetime import date, timedelta
from decimal import Decimal

from academics.models import Exam, Subject, Result
from accounts.models import Student
from students.models import Course


class Command(BaseCommand):
    help = 'Seed exam data with proper course/batch associations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing exam and result data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing exam and result data...')
            Result.objects.all().delete()
            Exam.objects.all().delete()
            Subject.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing exam data cleared.'))

        self.seed_subjects()
        self.seed_exams()
        self.seed_results()
        
        self.stdout.write(self.style.SUCCESS('Exam data seeding completed successfully!'))

    def seed_subjects(self):
        """Seed subjects for each course"""
        subjects_by_course = {
            'BBA': [
                {'code': 'BBA101', 'name': 'Principles of Management', 'total_marks': 100},
                {'code': 'BBA102', 'name': 'Business Mathematics', 'total_marks': 100},
                {'code': 'BBA103', 'name': 'Financial Accounting', 'total_marks': 100},
                {'code': 'BBA201', 'name': 'Marketing Management', 'total_marks': 100},
                {'code': 'BBA202', 'name': 'Business Communication', 'total_marks': 100},
            ],
            'MBA': [
                {'code': 'MBA501', 'name': 'Strategic Management', 'total_marks': 100},
                {'code': 'MBA502', 'name': 'Corporate Finance', 'total_marks': 100},
                {'code': 'MBA503', 'name': 'Operations Management', 'total_marks': 100},
                {'code': 'MBA504', 'name': 'Human Resource Management', 'total_marks': 100},
            ],
            'CSE': [
                {'code': 'CSE101', 'name': 'Programming Fundamentals', 'total_marks': 100},
                {'code': 'CSE102', 'name': 'Data Structures', 'total_marks': 100},
                {'code': 'CSE201', 'name': 'Database Management', 'total_marks': 100},
                {'code': 'CSE202', 'name': 'Web Development', 'total_marks': 100},
            ],
            'THM': [
                {'code': 'THM101', 'name': 'Introduction to Tourism', 'total_marks': 100},
                {'code': 'THM102', 'name': 'Hospitality Management', 'total_marks': 100},
                {'code': 'THM201', 'name': 'Travel Agency Operations', 'total_marks': 100},
            ],
        }

        subjects_created = 0
        for course_code, subjects in subjects_by_course.items():
            try:
                course = Course.objects.get(code=course_code)
                for subj_data in subjects:
                    subject, created = Subject.objects.update_or_create(
                        code=subj_data['code'],
                        defaults={
                            'name': subj_data['name'],
                            'course': course,
                            'total_marks': subj_data['total_marks'],
                        }
                    )
                    if created:
                        subjects_created += 1
                        self.stdout.write(f'  Created subject: {subject.code} - {subject.name} ({course_code})')
            except Course.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Course {course_code} not found, skipping subjects'))

        self.stdout.write(self.style.SUCCESS(f'Seeded {subjects_created} subjects.'))

    def seed_exams(self):
        """Seed exams for each course/intake/semester/session combination based on existing students"""
        exam_types = [
            {'type': 'midterm', 'name_suffix': 'Mid Term Exam'},
            {'type': 'final', 'name_suffix': 'Final Exam'},
        ]
        
        # Get unique course/intake/semester/session combinations from existing students
        combinations = list(
            Student.objects.values('course', 'intake', 'semester', 'session')
            .distinct()
        )
        
        if not combinations:
            # Fallback to default combinations if no students exist
            combinations = [
                {'course': 'BBA', 'intake': '15th', 'semester': '1st', 'session': '2024-2025'},
                {'course': 'BBA', 'intake': '15th', 'semester': '2nd', 'session': '2024-2025'},
                {'course': 'MBA', 'intake': '9th', 'semester': '1st', 'session': '2024-2025'},
                {'course': 'MBA', 'intake': '9th', 'semester': '2nd', 'session': '2024-2025'},
                {'course': 'CSE', 'intake': '1st', 'semester': '1st', 'session': '2024-2025'},
                {'course': 'CSE', 'intake': '1st', 'semester': '2nd', 'session': '2024-2025'},
                {'course': 'THM', 'intake': '1st', 'semester': '1st', 'session': '2024-2025'},
            ]
        
        exams_created = 0
        base_date = date.today() - timedelta(days=30)
        
        for combo in combinations:
            for exam_type in exam_types:
                exam_name = f'{combo["course"]} {combo["intake"]} Intake - {combo["semester"]} Sem {exam_type["name_suffix"]}'
                
                # Calculate exam date
                exam_date = base_date + (timedelta(days=0) if exam_type['type'] == 'midterm' else timedelta(days=60))
                
                exam, created = Exam.objects.update_or_create(
                    name=exam_name,
                    course=combo['course'],
                    intake=combo['intake'],
                    semester=combo['semester'],
                    session=combo['session'],
                    defaults={
                        'exam_type': exam_type['type'],
                        'exam_date': exam_date,
                        'total_marks': 100,
                        'description': f'{exam_type["name_suffix"]} for {combo["course"]} {combo["intake"]} Intake - {combo["semester"]} Semester',
                    }
                )
                if created:
                    exams_created += 1
                    self.stdout.write(f'  Created exam: {exam.name}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {exams_created} exams.'))

    def seed_results(self):
        """Seed sample results for students in their respective course exams"""
        import random
        
        results_created = 0
        
        for student in Student.objects.select_related('user').all():
            course_code = student.course
            
            # Get subjects for this student's course
            subjects = Subject.objects.filter(course__code=course_code)
            
            if not subjects.exists():
                self.stdout.write(self.style.WARNING(f'  No subjects found for {course_code}, skipping {student.student_id}'))
                continue
            
            # Get exams for this student's course/intake/semester
            exams = Exam.objects.filter(
                course=student.course,
                intake=student.intake,
                semester=student.semester
            )[:2]  # Limit to 2 exams
            
            if not exams.exists():
                self.stdout.write(self.style.WARNING(f'  No exams found for {course_code} {student.intake} {student.semester}, skipping {student.student_id}'))
                continue
            
            for exam in exams:
                for subject in subjects[:3]:  # Limit to 3 subjects per exam
                    # Generate random marks
                    marks = Decimal(str(random.randint(40, 95)))
                    
                    result, created = Result.objects.update_or_create(
                        student=student,
                        exam=exam,
                        subject=subject,
                        defaults={
                            'marks_obtained': marks,
                            'remarks': '',
                        }
                    )
                    if created:
                        results_created += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {results_created} results.'))
