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
        """
        Seed exams for each course/semester combination.
        Each course-semester has exactly 3 exam types: incourse_1st, incourse_2nd, final.
        Exams are identified by course-semester-type (no separate exam name needed).
        Students across different intakes in the same course/semester share the same exams.
        """
        exam_types = [
            {'type': 'incourse_1st', 'name_suffix': '1st Incourse', 'day_offset': 0},
            {'type': 'incourse_2nd', 'name_suffix': '2nd Incourse', 'day_offset': 30},
            {'type': 'final', 'name_suffix': 'Final Exam', 'day_offset': 60},
        ]
        
        courses = ['BBA', 'MBA', 'CSE', 'THM']
        semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
        
        # Get unique course/intake/semester combinations from existing students
        student_combinations = list(
            Student.objects.values('course', 'intake', 'semester')
            .distinct()
        )
        
        # If no students, create exams for common intakes
        if not student_combinations:
            student_combinations = [
                {'course': 'BBA', 'intake': '15th', 'semester': '1st'},
                {'course': 'BBA', 'intake': '15th', 'semester': '2nd'},
                {'course': 'MBA', 'intake': '9th', 'semester': '1st'},
                {'course': 'CSE', 'intake': '1st', 'semester': '1st'},
                {'course': 'THM', 'intake': '1st', 'semester': '1st'},
            ]
        
        # Get unique course/semester combinations (exams are shared across intakes)
        course_semester_combos = list({(c['course'], c['semester']) for c in student_combinations})
        
        exams_created = 0
        base_date = date.today() - timedelta(days=30)
        
        for course, semester in course_semester_combos:
            # Get any intake for this course/semester (exams are shared)
            intake = next(
                (c['intake'] for c in student_combinations 
                 if c['course'] == course and c['semester'] == semester),
                '15th'
            )
            
            for exam_type in exam_types:
                # Exam name is simply the course-semester-type concatenation
                exam_name = f'{course} - {semester} Sem - {exam_type["name_suffix"]}'
                
                # Calculate exam date based on type
                exam_date = base_date + timedelta(days=exam_type['day_offset'])
                
                exam, created = Exam.objects.update_or_create(
                    course=course,
                    semester=semester,
                    exam_type=exam_type['type'],
                    defaults={
                        'name': exam_name,
                        'intake': intake,
                        'exam_date': exam_date,
                        'total_marks': 100,
                        'description': f'{exam_type["name_suffix"]} for {course} {semester} Semester',
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
