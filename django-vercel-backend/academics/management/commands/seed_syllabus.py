"""
Management command to seed syllabus data based on National University official syllabi.
Seeds: MajorMinorOptions and Subjects for BBA, MBA, CSE, THM courses.
"""
from django.core.management.base import BaseCommand
from decimal import Decimal

from academics.models import MajorMinorOption, Subject
from students.models import Course


class Command(BaseCommand):
    help = 'Seed syllabus data with major options and subjects from official NU syllabi'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing subject and major data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing syllabus data...')
            Subject.objects.all().delete()
            MajorMinorOption.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing syllabus data cleared.'))

        self.seed_major_options()
        self.seed_cse_subjects()
        self.seed_bba_subjects()
        self.seed_thm_subjects()
        self.seed_mba_subjects()
        
        self.stdout.write(self.style.SUCCESS('Syllabus data seeding completed successfully!'))

    def seed_major_options(self):
        """Seed major options for BBA and MBA"""
        majors = [
            # BBA Majors (from 7th semester)
            {'course': 'BBA', 'name': 'Accounting & Information Systems', 'code': 'BBA_AIS', 'available_from_semester': '7th'},
            {'course': 'BBA', 'name': 'Management Studies', 'code': 'BBA_MGT', 'available_from_semester': '7th'},
            {'course': 'BBA', 'name': 'Marketing', 'code': 'BBA_MKT', 'available_from_semester': '7th'},
            {'course': 'BBA', 'name': 'Finance & Banking', 'code': 'BBA_FIN', 'available_from_semester': '7th'},
            # MBA Majors (from 2nd semester)
            {'course': 'MBA', 'name': 'Accounting & Information Systems', 'code': 'MBA_AIS', 'available_from_semester': '2nd'},
            {'course': 'MBA', 'name': 'Human Resource Management', 'code': 'MBA_HRM', 'available_from_semester': '2nd'},
            {'course': 'MBA', 'name': 'Marketing', 'code': 'MBA_MKT', 'available_from_semester': '2nd'},
            {'course': 'MBA', 'name': 'Finance & Banking', 'code': 'MBA_FIN', 'available_from_semester': '2nd'},
        ]
        
        created_count = 0
        for major_data in majors:
            major, created = MajorMinorOption.objects.update_or_create(
                code=major_data['code'],
                defaults={
                    'course': major_data['course'],
                    'name': major_data['name'],
                    'available_from_semester': major_data['available_from_semester'],
                    'option_type': 'major',
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created major: {major.code} - {major.name}')
        
        self.stdout.write(self.style.SUCCESS(f'Seeded {created_count} major options.'))

    def seed_cse_subjects(self):
        """Seed CSE subjects from official NU syllabus (2017-2018)"""
        try:
            course = Course.objects.get(code='CSE')
        except Course.DoesNotExist:
            self.stdout.write(self.style.WARNING('CSE course not found, skipping CSE subjects'))
            return

        subjects = [
            # Semester 1
            {'code': '510201', 'name': 'Fundamentals of Computer and Computing', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510202', 'name': 'Introduction to Computing Lab', 'semester': '1st', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '510203', 'name': 'Discrete Mathematics', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510204', 'name': 'Discrete Mathematics Lab', 'semester': '1st', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '510205', 'name': 'Mathematics I (Differential and Integral Calculus)', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510206', 'name': 'Physics I', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510207', 'name': 'English', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 2
            {'code': '510219', 'name': 'Structured Programming Language', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510220', 'name': 'Structured Programming Language Lab', 'semester': '2nd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '510221', 'name': 'Data Structures', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510222', 'name': 'Data Structures Lab', 'semester': '2nd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '510223', 'name': 'Mathematics II (Linear Algebra and Statistics)', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510224', 'name': 'Physics II', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510225', 'name': 'Electrical Circuits', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 3
            {'code': '520201', 'name': 'Object Oriented Programming', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520202', 'name': 'Object Oriented Programming Lab', 'semester': '3rd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520203', 'name': 'Digital Logic Design', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520204', 'name': 'Digital Logic Design Lab', 'semester': '3rd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520205', 'name': 'Electronics', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520206', 'name': 'Electronics Lab', 'semester': '3rd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520207', 'name': 'Mathematics III (Coordinate Geometry and Complex Analysis)', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 4
            {'code': '520219', 'name': 'Computer Architecture and Organization', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520220', 'name': 'Computer Architecture Lab', 'semester': '4th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520221', 'name': 'Database Management System', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520222', 'name': 'Database Management System Lab', 'semester': '4th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520223', 'name': 'Microprocessor and Assembly Languages', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520224', 'name': 'Microprocessor and Assembly Languages Lab', 'semester': '4th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520225', 'name': 'Design and Analysis of Algorithms', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520226', 'name': 'Design and Analysis of Algorithms Lab', 'semester': '4th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520227', 'name': 'Numerical Analysis', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 5
            {'code': '530201', 'name': 'Peripheral and Interfacing', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530202', 'name': 'Peripheral and Interfacing Lab', 'semester': '5th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530203', 'name': 'Data and Telecommunications', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530204', 'name': 'Data and Telecommunications Lab', 'semester': '5th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530205', 'name': 'Operating System', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530206', 'name': 'Operating System Lab', 'semester': '5th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530207', 'name': 'Economics', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 6
            {'code': '530219', 'name': 'Software Engineering', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530220', 'name': 'Software Engineering Lab', 'semester': '6th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530221', 'name': 'Computer Networking', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530222', 'name': 'Computer Networking Lab', 'semester': '6th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530223', 'name': 'Embedded System Programming', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530224', 'name': 'Embedded System Programming Lab', 'semester': '6th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530225', 'name': 'Theory of Computation', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 7
            {'code': '540201', 'name': 'Artificial Intelligence', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540202', 'name': 'Artificial Intelligence Lab', 'semester': '7th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540203', 'name': 'Compiler Design and Construction', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540204', 'name': 'Compiler Design Lab', 'semester': '7th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540205', 'name': 'Computer Graphics', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540206', 'name': 'Computer Graphics Lab', 'semester': '7th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540207', 'name': 'E-Commerce and Web Engineering', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540208', 'name': 'E-Commerce and Web Engineering Lab', 'semester': '7th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            # Semester 8
            {'code': '540219', 'name': 'Network and Information Security', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540220', 'name': 'Network and Information Security Lab', 'semester': '8th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540221', 'name': 'Information System Management', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540222', 'name': 'Project/Industry Attachment', 'semester': '8th', 'credits': 6.0, 'marks': 200, 'type': 'project'},
            # Optional courses (8th semester)
            {'code': '540223', 'name': 'Simulation and Modeling', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'elective'},
            {'code': '540225', 'name': 'Parallel and Distributed Systems', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'elective'},
            {'code': '540227', 'name': 'Digital Signal Processing', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'elective'},
            {'code': '540229', 'name': 'Digital Image Processing', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'elective'},
        ]
        
        self._create_subjects(subjects, course, 'CSE')

    def seed_bba_subjects(self):
        """Seed BBA subjects from official NU syllabus (2017-2018)"""
        try:
            course = Course.objects.get(code='BBA')
        except Course.DoesNotExist:
            self.stdout.write(self.style.WARNING('BBA course not found, skipping BBA subjects'))
            return

        subjects = [
            # Year 1 - Semester 1
            {'code': '211101', 'name': 'Introduction to Business', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211103', 'name': 'Principles of Management', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211105', 'name': 'English - I', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211107', 'name': 'History of the Emergence of Bangladesh', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211109', 'name': 'Fundamentals of Computers', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 1 - Semester 2
            {'code': '211102', 'name': 'Principles of Accounting', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211104', 'name': 'Business Mathematics', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211106', 'name': 'English - II', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211108', 'name': 'Principles of Marketing', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211110', 'name': 'Computer Applications in Business', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 2 - Semester 3
            {'code': '221101', 'name': 'Microeconomics', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221103', 'name': 'Financial Accounting', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221105', 'name': 'Organization Behavior', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221107', 'name': 'Business Statistics', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221109', 'name': 'Business Communication', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 2 - Semester 4
            {'code': '221102', 'name': 'Macroeconomics', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221104', 'name': 'Cost and Management Accounting', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221106', 'name': 'Human Resource Management', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221108', 'name': 'Business Law', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '221110', 'name': 'E-Business', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 3 - Semester 5
            {'code': '231101', 'name': 'Company Law', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231103', 'name': 'Financial Management', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231105', 'name': 'Production and Operations Management', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231107', 'name': 'Research Methodology', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231109', 'name': 'Management Information System', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 3 - Semester 6
            {'code': '231102', 'name': 'Taxation in Bangladesh', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231104', 'name': 'Auditing and Assurance', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231106', 'name': 'International Business', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231108', 'name': 'Entrepreneurship Development', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '231110', 'name': 'Strategic Management', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 4 - Semester 7 (Core + Major courses)
            {'code': '241101', 'name': 'Project Work', 'semester': '7th', 'credits': 6.0, 'marks': 200, 'type': 'project'},
            {'code': '241103', 'name': 'Viva Voce', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'viva'},
            # Year 4 - Semester 8
            {'code': '241102', 'name': 'Internship/Industrial Training', 'semester': '8th', 'credits': 6.0, 'marks': 200, 'type': 'project'},
        ]
        
        self._create_subjects(subjects, course, 'BBA')

    def seed_thm_subjects(self):
        """Seed THM subjects from official NU syllabus (2015-2016)"""
        try:
            course = Course.objects.get(code='THM')
        except Course.DoesNotExist:
            self.stdout.write(self.style.WARNING('THM course not found, skipping THM subjects'))
            return

        subjects = [
            # Year 1 - Semester 1
            {'code': 'THM101', 'name': 'Introduction to Tourism', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM103', 'name': 'Principles of Management', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM105', 'name': 'English - I', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM107', 'name': 'History of the Emergence of Bangladesh', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM109', 'name': 'Fundamentals of Computers', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 1 - Semester 2
            {'code': 'THM102', 'name': 'Introduction to Hospitality', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM104', 'name': 'Business Mathematics', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM106', 'name': 'English - II', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM108', 'name': 'Principles of Marketing', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM110', 'name': 'Computer Applications in Business', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 2 - Semester 3
            {'code': 'THM201', 'name': 'Tourism Geography', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM203', 'name': 'Financial Accounting', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM205', 'name': 'Organization Behavior', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM207', 'name': 'Business Statistics', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM209', 'name': 'Business Communication', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 2 - Semester 4
            {'code': 'THM202', 'name': 'Food and Beverage Management', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM204', 'name': 'Cost and Management Accounting', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM206', 'name': 'Human Resource Management', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM208', 'name': 'Business Law', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM210', 'name': 'Front Office Management', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 3 - Semester 5
            {'code': 'THM301', 'name': 'Travel Agency and Tour Operations', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM303', 'name': 'Financial Management', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM305', 'name': 'Housekeeping Management', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM307', 'name': 'Research Methodology', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM309', 'name': 'Tourism Marketing', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 3 - Semester 6
            {'code': 'THM302', 'name': 'Airline and Airport Management', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM304', 'name': 'Event Management', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM306', 'name': 'Tourism Planning and Development', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM308', 'name': 'Entrepreneurship Development', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM310', 'name': 'Strategic Management', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Year 4 - Semester 7
            {'code': 'THM401', 'name': 'Eco-Tourism', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM403', 'name': 'Hotel and Resort Management', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM405', 'name': 'Project Work', 'semester': '7th', 'credits': 6.0, 'marks': 200, 'type': 'project'},
            {'code': 'THM407', 'name': 'Viva Voce', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'viva'},
            # Year 4 - Semester 8
            {'code': 'THM402', 'name': 'Heritage and Cultural Tourism', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM404', 'name': 'Tourism Laws and Ethics', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'THM406', 'name': 'Internship/Industrial Training', 'semester': '8th', 'credits': 6.0, 'marks': 200, 'type': 'project'},
        ]
        
        self._create_subjects(subjects, course, 'THM')

    def seed_mba_subjects(self):
        """Seed MBA subjects from official NU syllabus (2017-2018)"""
        try:
            course = Course.objects.get(code='MBA')
        except Course.DoesNotExist:
            self.stdout.write(self.style.WARNING('MBA course not found, skipping MBA subjects'))
            return

        subjects = [
            # Semester 1 (Core courses)
            {'code': 'MBA501', 'name': 'Managerial Economics', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA502', 'name': 'Principles of Marketing', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA503', 'name': 'Accounting for Managers', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA504', 'name': 'Business Communication', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA505', 'name': 'Human Resource Management', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA506', 'name': 'Management Information System', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 2 (Core + Major courses)
            {'code': 'MBA507', 'name': 'Managerial Finance', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA508', 'name': 'Operations Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA509', 'name': 'Strategic Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA510', 'name': 'Research Methodology', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': 'MBA511', 'name': 'Project Work', 'semester': '2nd', 'credits': 6.0, 'marks': 200, 'type': 'project'},
        ]
        
        self._create_subjects(subjects, course, 'MBA')

    def _create_subjects(self, subjects, course, course_code):
        """Helper to create subjects"""
        created_count = 0
        for subj_data in subjects:
            subject, created = Subject.objects.update_or_create(
                code=subj_data['code'],
                defaults={
                    'name': subj_data['name'],
                    'course': course,
                    'course_code': course_code,
                    'semester': subj_data['semester'],
                    'credit_hours': Decimal(str(subj_data['credits'])),
                    'total_marks': subj_data['marks'],
                    'subject_type': subj_data['type'],
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Seeded {created_count} {course_code} subjects.'))
