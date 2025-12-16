"""
Management command to seed exam data for IGMIS LMS
Seeds: Subjects for each course/semester and 3 exams per subject (1st Incourse, 2nd Incourse, Final)
"""
from django.core.management.base import BaseCommand
from datetime import date, timedelta
from decimal import Decimal
import random

from academics.models import Exam, Subject, Result
from accounts.models import Student
from students.models import Course


class Command(BaseCommand):
    help = 'Seed subjects and exams (3 exams per subject) from official syllabi'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing exam, subject, and result data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing exam and result data...')
            Result.objects.all().delete()
            Exam.objects.all().delete()
            Subject.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing data cleared.'))

        self.seed_subjects()
        self.seed_exams()
        self.seed_results()
        
        self.stdout.write(self.style.SUCCESS('Subject, exam, and result seeding completed successfully!'))

    def seed_subjects(self):
        """Seed all subjects from official National University syllabi for each course/semester"""
        
        # Complete subject data from official syllabi (from markdown files)
        subjects_data = {
            'BBA': {
                '1st': [
                    {'code': '510101', 'name': 'Introduction to Business'},
                    {'code': '510103', 'name': 'Business Communication & Report Writing'},
                    {'code': '510105', 'name': 'Basic Accounting'},
                    {'code': '510107', 'name': 'Business Mathematics'},
                    {'code': '211501', 'name': 'History of the Emergence of Independent Bangladesh'},
                ],
                '2nd': [
                    {'code': '510111', 'name': 'Principles of Management'},
                    {'code': '510113', 'name': 'Taxation in Bangladesh'},
                    {'code': '510115', 'name': 'Computer & Information Technology'},
                    {'code': '510117', 'name': 'Theory and Practices of Banking'},
                    {'code': '510119', 'name': 'Micro Economics'},
                ],
                '3rd': [
                    {'code': '520101', 'name': 'Business Statistics-I'},
                    {'code': '520103', 'name': 'Organizational Behavior'},
                    {'code': '520105', 'name': 'Legal Environment of Business'},
                    {'code': '520107', 'name': 'E-Commerce'},
                    {'code': '520109', 'name': 'Macro Economics'},
                ],
                '4th': [
                    {'code': '520111', 'name': 'Risk Management & Insurance'},
                    {'code': '520113', 'name': 'Business Statistics-II'},
                    {'code': '520115', 'name': 'Human Resource Management'},
                    {'code': '520117', 'name': 'Export-Import Management'},
                    {'code': '520119', 'name': 'Supply Chain Management'},
                ],
                '5th': [
                    {'code': '530101', 'name': 'Principles of Finance'},
                    {'code': '530103', 'name': 'Principles of Marketing'},
                    {'code': '530105', 'name': 'Cost Accounting'},
                    {'code': '530107', 'name': 'Tourism & Hospitality Management'},
                    {'code': '530109', 'name': 'Entrepreneurship & Small Business Management'},
                ],
                '6th': [
                    {'code': '530111', 'name': 'Financial Management'},
                    {'code': '530113', 'name': 'Marketing Management'},
                    {'code': '530115', 'name': 'Management Accounting'},
                    {'code': '530117', 'name': 'Enterprise Resource Planning'},
                    {'code': '530119', 'name': 'Research Methodology'},
                ],
                '7th': [
                    {'code': '540101', 'name': 'Customer Relationship Management'},
                    {'code': '540103', 'name': 'Consumer Behavior'},
                    {'code': '540105', 'name': 'Brand Management'},
                    {'code': '540107', 'name': 'E-Marketing'},
                    {'code': '540109', 'name': 'Service Marketing'},
                ],
                '8th': [
                    {'code': '540111', 'name': 'Selling and Salesmanship'},
                    {'code': '540113', 'name': 'Integrated Marketing Communication'},
                    {'code': '540115', 'name': 'SME Marketing'},
                    {'code': '540117', 'name': 'International Economics'},
                    {'code': '540119', 'name': 'Agricultural & Food Marketing'},
                ],
            },
            'THM': {
                '1st': [
                    {'code': '510901', 'name': 'Introduction to Business'},
                    {'code': '510903', 'name': 'Fundamentals of Tourism and Hospitality'},
                    {'code': '510905', 'name': 'Introduction to Computer'},
                    {'code': '510907', 'name': 'Basic English Language'},
                    {'code': '510909', 'name': 'History of the Emergence of Independent Bangladesh'},
                ],
                '2nd': [
                    {'code': '510911', 'name': 'Business Mathematics'},
                    {'code': '510913', 'name': 'General Science and Environment'},
                    {'code': '510915', 'name': 'Micro Economics'},
                    {'code': '510917', 'name': 'First Aid, Safety and Security'},
                    {'code': '510919', 'name': 'Fundamentals of Management'},
                ],
                '3rd': [
                    {'code': '520901', 'name': 'Hospitality Managerial Communication'},
                    {'code': '520903', 'name': 'Business Statistics'},
                    {'code': '520905', 'name': 'Fundamentals of Accounting'},
                    {'code': '520907', 'name': 'Macro Economics and Economy of Bangladesh'},
                    {'code': '520909', 'name': 'Business Law and Legal Issues of Tourism'},
                ],
                '4th': [
                    {'code': '520911', 'name': 'Tourism and Hospitality Marketing'},
                    {'code': '520913', 'name': 'Fundamentals of Culinary Art'},
                    {'code': '520915', 'name': 'Front Office Operations and Reservation'},
                    {'code': '520917', 'name': 'Housekeeping Management'},
                    {'code': '520919', 'name': 'HRM in Tourism and Hospitality'},
                ],
                '5th': [
                    {'code': '530901', 'name': 'Tourism in Bangladesh'},
                    {'code': '530903', 'name': 'Food and Beverage Production'},
                    {'code': '530905', 'name': 'Food and Beverage Service'},
                    {'code': '530907', 'name': 'Food Hygiene and Sanitation'},
                    {'code': '530909', 'name': 'Tourism Planning and Development'},
                ],
                '6th': [
                    {'code': '530911', 'name': 'Research Methodology'},
                    {'code': '530913', 'name': 'Tourist Behavior'},
                    {'code': '530915', 'name': 'Food and Beverage Management'},
                    {'code': '530917', 'name': 'Computerized Reservation System'},
                    {'code': '530919', 'name': 'Fundamentals of Finance'},
                ],
                '7th': [
                    {'code': '540901', 'name': 'Geography of Tourism'},
                    {'code': '540903', 'name': 'Community and Cultural Issues in Tourism'},
                    {'code': '540905', 'name': 'Travel Agency and Tour Operations'},
                    {'code': '540907', 'name': 'French Language'},
                    {'code': '540909', 'name': 'Tourism and Hospitality Entrepreneurship'},
                ],
                '8th': [
                    {'code': '540911', 'name': 'Destination Management'},
                    {'code': '540913', 'name': 'MICE Management'},
                ],
            },
            'CSE': {
                '1st': [
                    {'code': '510201', 'name': 'Structured Programming Language'},
                    {'code': '510203', 'name': 'Electrical and Electronic Circuit'},
                    {'code': '510205', 'name': 'Calculus'},
                    {'code': '510207', 'name': 'Physics'},
                    {'code': '510209', 'name': 'English'},
                ],
                '2nd': [
                    {'code': '510221', 'name': 'Digital Systems Design'},
                    {'code': '510223', 'name': 'Discrete Mathematics'},
                    {'code': '510225', 'name': 'Linear Algebra'},
                    {'code': '510227', 'name': 'Statistics and Probability'},
                    {'code': '510229', 'name': 'History of the Emergence of Independent Bangladesh'},
                ],
                '3rd': [
                    {'code': '520201', 'name': 'Data Structure'},
                    {'code': '520203', 'name': 'Object Oriented Programming'},
                    {'code': '520205', 'name': 'Computer Architecture'},
                    {'code': '520207', 'name': 'Ordinary Differential Equation'},
                    {'code': '520209', 'name': 'Fundamental of Business Studies'},
                ],
                '4th': [
                    {'code': '520221', 'name': 'Database Management System'},
                    {'code': '520223', 'name': 'Microprocessor and Assembly Language'},
                    {'code': '520225', 'name': 'Design and Analysis of Algorithms'},
                    {'code': '520227', 'name': 'Numerical Analysis'},
                ],
                '5th': [
                    {'code': '530201', 'name': 'Peripheral and Interfacing'},
                    {'code': '530203', 'name': 'Data and Telecommunications'},
                    {'code': '530205', 'name': 'Operating System'},
                    {'code': '530207', 'name': 'Economics'},
                ],
                '6th': [
                    {'code': '530219', 'name': 'Software Engineering'},
                    {'code': '530221', 'name': 'Computer Networking'},
                    {'code': '530223', 'name': 'Embedded System Programming'},
                    {'code': '530225', 'name': 'Theory of Computation'},
                ],
                '7th': [
                    {'code': '540201', 'name': 'Artificial Intelligence'},
                    {'code': '540203', 'name': 'Compiler Design and Construction'},
                    {'code': '540205', 'name': 'Computer Graphics'},
                    {'code': '540207', 'name': 'E-Commerce and Web Engineering'},
                ],
                '8th': [
                    {'code': '540219', 'name': 'Network and Information Security'},
                    {'code': '540221', 'name': 'Information System Management'},
                    {'code': '540223', 'name': 'Simulation and Modeling'},
                    {'code': '540225', 'name': 'Parallel and Distributed Systems'},
                ],
            },
            'MBA': {
                '1st': [
                    {'code': '610101', 'name': 'Advanced Research Methodology'},
                    {'code': '610103', 'name': 'Management of Multinational Corporations'},
                    {'code': '610105', 'name': 'Bangladesh Economy: Performance & Policies'},
                    {'code': '610107', 'name': 'Managerial Economics'},
                    {'code': '610109', 'name': 'Project Management'},
                ],
                '2nd': [
                    {'code': '620121', 'name': 'Advanced Financial Accounting'},
                    {'code': '620123', 'name': 'Corporate Financial Reporting'},
                    {'code': '620125', 'name': 'Corporate Tax Planning'},
                    {'code': '620127', 'name': 'Strategic Management Accounting'},
                    {'code': '620129', 'name': 'Advanced Auditing and Assurance'},
                ],
            },
        }

        subjects_created = 0
        subjects_updated = 0
        
        for course_code, semesters in subjects_data.items():
            try:
                course = Course.objects.get(code=course_code)
                for semester, subjects in semesters.items():
                    for subj_data in subjects:
                        # Use course_code prefix for unique subject codes
                        full_code = f"{course_code}_{subj_data['code']}"
                        
                        subject, created = Subject.objects.update_or_create(
                            code=full_code,
                            defaults={
                                'name': subj_data['name'],
                                'course': course,
                                'course_code': course_code,
                                'semester': semester,
                                'total_marks': 100,
                                'credit_hours': 3.0,
                                'subject_type': 'core',
                                'is_active': True,
                            }
                        )
                        if created:
                            subjects_created += 1
                            self.stdout.write(f'  Created: {subject.code} - {subject.name} ({course_code} {semester} Sem)')
                        else:
                            subjects_updated += 1
                            
            except Course.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Course {course_code} not found, skipping subjects'))

        self.stdout.write(self.style.SUCCESS(f'Subjects: {subjects_created} created, {subjects_updated} updated.'))

    def seed_exams(self):
        """
        Seed exams for each SUBJECT (not just course/semester).
        Each subject has exactly 3 exam types: incourse_1st, incourse_2nd, final.
        Exam name format: Course - Semester - Subject - Type
        Students across different intakes in the same course/semester share the same exams.
        """
        exam_types = [
            {'type': 'incourse_1st', 'name_suffix': '1st Incourse', 'day_offset': 0, 'marks': 10},
            {'type': 'incourse_2nd', 'name_suffix': '2nd Incourse', 'day_offset': 30, 'marks': 10},
            {'type': 'final', 'name_suffix': 'Final Exam', 'day_offset': 60, 'marks': 70},
        ]
        
        # Get all active subjects
        subjects = Subject.objects.filter(is_active=True)
        
        if not subjects.exists():
            self.stdout.write(self.style.WARNING('No subjects found. Please seed subjects first.'))
            return
        
        exams_created = 0
        exams_updated = 0
        base_date = date.today() - timedelta(days=30)
        
        for subject in subjects:
            course_code = subject.course_code
            semester = subject.semester
            
            for exam_type in exam_types:
                # Exam name format: Course - Semester - Subject - Type
                exam_name = f'{course_code} - {semester} Sem - {subject.name} - {exam_type["name_suffix"]}'
                
                # Calculate exam date based on type
                exam_date = base_date + timedelta(days=exam_type['day_offset'])
                
                exam, created = Exam.objects.update_or_create(
                    course=course_code,
                    semester=semester,
                    subject=subject,
                    exam_type=exam_type['type'],
                    defaults={
                        'name': exam_name,
                        'exam_date': exam_date,
                        'total_marks': exam_type['marks'],
                        'description': f'{exam_type["name_suffix"]} for {subject.name} ({course_code} {semester} Semester)',
                    }
                )
                if created:
                    exams_created += 1
                else:
                    exams_updated += 1

        self.stdout.write(self.style.SUCCESS(f'Exams: {exams_created} created, {exams_updated} updated.'))

    def seed_results(self):
        """
        Seed sample results for every student across all matching exams.
        Ensures no stale/disconnected results remain.
        """
        self.stdout.write(self.style.WARNING('Resetting and seeding Results...'))
        Result.objects.all().delete()
        
        students = Student.objects.select_related('user').all()
        if not students.exists():
            self.stdout.write(self.style.WARNING('No students found. Please add students first.'))
            return
        
        results_created = 0
        students_with_results = 0
        
        for student in students:
            exams = Exam.objects.filter(
                course=student.course,
                semester=student.semester
            ).select_related('subject')
            
            if not exams.exists():
                continue
            
            students_with_results += 1
            
            for exam in exams:
                if not exam.subject:
                    continue
                
                total_marks = float(exam.total_marks or 100)
                marks = round(random.uniform(0.42, 0.96) * total_marks, 2)
                
                Result.objects.create(
                    student=student,
                    exam=exam,
                    subject=exam.subject,
                    marks_obtained=Decimal(str(marks)),
                    remarks='Auto-generated seed result',
                )
                results_created += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Results: {results_created} created for {students_with_results} students.'
            )
        )
