"""
Management command to seed syllabus data based on National University official syllabi.
Seeds: MajorMinorOptions and Subjects for BBA, MBA, CSE, THM courses.
Data extracted from official NU syllabus documents (2017-2018).
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
        parser.add_argument(
            '--course',
            type=str,
            help='Seed only specific course (BBA, MBA, CSE, THM)',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing syllabus data...')
            Subject.objects.all().delete()
            MajorMinorOption.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing syllabus data cleared.'))

        course_filter = options.get('course')
        
        self.seed_major_options()
        
        if not course_filter or course_filter == 'CSE':
            self.seed_cse_subjects()
        if not course_filter or course_filter == 'BBA':
            self.seed_bba_subjects()
        if not course_filter or course_filter == 'THM':
            self.seed_thm_subjects()
        if not course_filter or course_filter == 'MBA':
            self.seed_mba_subjects()
        
        # Print summary
        total = Subject.objects.count()
        self.stdout.write(self.style.SUCCESS(f'\nSyllabus data seeding completed! Total subjects: {total}'))

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
            # ===== FIRST YEAR =====
            # Semester 1 (from official syllabus)
            {'code': '510201', 'name': 'Structured Programming Language', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510202', 'name': 'Structured Programming Language Lab', 'semester': '1st', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '510203', 'name': 'Electrical and Electronic Circuit', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510204', 'name': 'Electrical and Electronic Circuit Lab', 'semester': '1st', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '510205', 'name': 'Calculus', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510207', 'name': 'Physics', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510209', 'name': 'English', 'semester': '1st', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 2
            {'code': '510221', 'name': 'Digital Systems Design', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510222', 'name': 'Digital Systems Lab', 'semester': '2nd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '510223', 'name': 'Discrete Mathematics', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510225', 'name': 'Linear Algebra', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510227', 'name': 'Statistics and Probability', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '510229', 'name': 'History of the Emergence of Independent Bangladesh', 'semester': '2nd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # ===== SECOND YEAR =====
            # Semester 3
            {'code': '520201', 'name': 'Data Structure', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520202', 'name': 'Data Structure Lab', 'semester': '3rd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520203', 'name': 'Object Oriented Programming', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520204', 'name': 'Object Oriented Programming Lab', 'semester': '3rd', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520205', 'name': 'Computer Architecture', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520207', 'name': 'Ordinary Differential Equation', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520209', 'name': 'Fundamental of Business Studies', 'semester': '3rd', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 4
            {'code': '520221', 'name': 'Database Management System', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520222', 'name': 'Database Management System Lab', 'semester': '4th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520223', 'name': 'Microprocessor and Assembly Language', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520224', 'name': 'Microprocessor and Assembly Language Lab', 'semester': '4th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520225', 'name': 'Design and Analysis of Algorithms', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '520226', 'name': 'Design and Analysis of Algorithms Lab', 'semester': '4th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '520227', 'name': 'Numerical Analysis', 'semester': '4th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # ===== THIRD YEAR =====
            # Semester 5
            {'code': '530201', 'name': 'Operating System', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530202', 'name': 'Operating System Lab', 'semester': '5th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530203', 'name': 'Computer Networks', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530204', 'name': 'Computer Networks Lab', 'semester': '5th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530205', 'name': 'Software Engineering', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530206', 'name': 'Software Engineering Lab', 'semester': '5th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530207', 'name': 'Theory of Computation', 'semester': '5th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 6
            {'code': '530221', 'name': 'Artificial Intelligence', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530222', 'name': 'Artificial Intelligence Lab', 'semester': '6th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530223', 'name': 'Web Technology', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530224', 'name': 'Web Technology Lab', 'semester': '6th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530225', 'name': 'Compiler Design', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '530226', 'name': 'Compiler Design Lab', 'semester': '6th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '530227', 'name': 'Accounting', 'semester': '6th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # ===== FOURTH YEAR =====
            # Semester 7
            {'code': '540201', 'name': 'Computer Graphics', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540202', 'name': 'Computer Graphics Lab', 'semester': '7th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540203', 'name': 'Distributed Systems', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540204', 'name': 'Distributed Systems Lab', 'semester': '7th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540205', 'name': 'Digital Image Processing', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540206', 'name': 'Digital Image Processing Lab', 'semester': '7th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540207', 'name': 'Information System Security', 'semester': '7th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            # Semester 8
            {'code': '540221', 'name': 'Machine Learning', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540222', 'name': 'Machine Learning Lab', 'semester': '8th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540223', 'name': 'Mobile Application Development', 'semester': '8th', 'credits': 3.0, 'marks': 80, 'type': 'core'},
            {'code': '540224', 'name': 'Mobile Application Development Lab', 'semester': '8th', 'credits': 1.5, 'marks': 40, 'type': 'lab'},
            {'code': '540225', 'name': 'Project/Thesis', 'semester': '8th', 'credits': 6.0, 'marks': 200, 'type': 'project'},
            {'code': '540227', 'name': 'Viva Voce', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'viva'},
        ]
        
        self._create_subjects(subjects, course, 'CSE')

    def seed_bba_subjects(self):
        """Seed BBA subjects from official NU syllabus (2017-2018)"""
        try:
            course = Course.objects.get(code='BBA')
        except Course.DoesNotExist:
            self.stdout.write(self.style.WARNING('BBA course not found, skipping BBA subjects'))
            return

        # Get major options for BBA
        try:
            major_ais = MajorMinorOption.objects.get(code='BBA_AIS')
            major_mgt = MajorMinorOption.objects.get(code='BBA_MGT')
            major_mkt = MajorMinorOption.objects.get(code='BBA_MKT')
            major_fin = MajorMinorOption.objects.get(code='BBA_FIN')
        except MajorMinorOption.DoesNotExist:
            major_ais = major_mgt = major_mkt = major_fin = None

        subjects = [
            # ===== FIRST YEAR =====
            # Semester 1 (from official BBA Syllabus 2017-2018)
            {'code': '510101', 'name': 'Introduction to Business', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510103', 'name': 'Business Communication & Report Writing', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510105', 'name': 'Basic Accounting', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510107', 'name': 'Business Mathematics', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '211501', 'name': 'History of the Emergence of Independent Bangladesh', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 2
            {'code': '510121', 'name': 'Principles of Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510123', 'name': 'Taxation in Bangladesh', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510125', 'name': 'Computer & Information Technology', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510127', 'name': 'Theory and Practices of Banking', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510129', 'name': 'Micro Economics', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # ===== SECOND YEAR =====
            # Semester 3
            {'code': '520101', 'name': 'Business Statistics-I', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520103', 'name': 'Organizational Behavior', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520105', 'name': 'Legal Environment of Business', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520107', 'name': 'E-Commerce', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520109', 'name': 'Macro Economics', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 4
            {'code': '520121', 'name': 'Risk Management & Insurance', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520123', 'name': 'Business Statistics-II', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520125', 'name': 'Human Resource Management', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520127', 'name': 'Export-Import Management', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520129', 'name': 'Supply Chain Management', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # ===== THIRD YEAR =====
            # Semester 5
            {'code': '530101', 'name': 'Principles of Finance', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530103', 'name': 'Principles of Marketing', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530105', 'name': 'Cost Accounting', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530107', 'name': 'Tourism & Hospitality Management', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530109', 'name': 'Entrepreneurship & Small Business Management', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 6
            {'code': '530121', 'name': 'Financial Management', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530123', 'name': 'Marketing Management', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530125', 'name': 'Management Accounting', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530127', 'name': 'Enterprise Resource Planning', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530129', 'name': 'Research Methodology', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530131', 'name': 'Viva Voce', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'viva'},
            # ===== FOURTH YEAR - MARKETING MAJOR =====
            # Semester 7 - Marketing
            {'code': '540101', 'name': 'Customer Relationship Management', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540103', 'name': 'Consumer Behavior', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540105', 'name': 'Brand Management', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540107', 'name': 'E-Marketing', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540109', 'name': 'Service Marketing', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            # Semester 8 - Marketing
            {'code': '540121', 'name': 'Selling and Salesmanship', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540123', 'name': 'Integrated Marketing Communication', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540125', 'name': 'SME Marketing', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540127', 'name': 'International Economics', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '540129', 'name': 'Agricultural & Food Marketing', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            # ===== FOURTH YEAR - FINANCE & BANKING MAJOR =====
            # Semester 7 - Finance
            {'code': '540201', 'name': 'Corporate Finance', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540203', 'name': 'Working Capital Management', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540205', 'name': 'Bank Management', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540207', 'name': 'E-Banking', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540209', 'name': 'Fundamentals of Investments', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            # Semester 8 - Finance
            {'code': '540221', 'name': 'Financial Markets & Institutions', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540223', 'name': 'Financial Analysis and Business Valuation', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540225', 'name': 'Fiscal and Monetary Policy', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540227', 'name': 'Security Analysis and Portfolio Management', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '540229', 'name': 'Real Estate Finance', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            # ===== FOURTH YEAR - AIS MAJOR =====
            # Semester 7 - AIS
            {'code': '540301', 'name': 'Intermediate Accounting', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540303', 'name': 'Advanced Accounting', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540305', 'name': 'Working Capital Management (AIS)', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540307', 'name': 'Financial Statement Analysis and Business Valuation', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540309', 'name': 'Corporate Governance', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            # Semester 8 - AIS
            {'code': '540321', 'name': 'Accounting and Information Systems', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540323', 'name': 'Auditing', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540325', 'name': 'Advanced Cost & Management Accounting', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540327', 'name': 'Accounting Theory', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '540329', 'name': 'Accounting for Government and Non-Profit Organization', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            # ===== FOURTH YEAR - MANAGEMENT STUDIES MAJOR =====
            # Semester 7 - Management
            {'code': '540401', 'name': 'Organization Development', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540403', 'name': 'Global Management', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540405', 'name': 'Conflict Management', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540407', 'name': 'Management Thought', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540409', 'name': 'Career Planning and Development', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            # Semester 8 - Management
            {'code': '540421', 'name': 'Industrial Relations', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540423', 'name': 'Management Information Systems', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540425', 'name': 'Operations Management', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540427', 'name': 'Strategic Management', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            {'code': '540429', 'name': 'Total Quality Management', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mgt},
            # Internship (common for all majors)
            {'code': '540999', 'name': 'Internship/Project Defense', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'project'},
        ]
        
        self._create_subjects(subjects, course, 'BBA')

    def seed_thm_subjects(self):
        """Seed THM (Tourism & Hospitality Management) subjects from official NU syllabus (2015-2016)"""
        try:
            course = Course.objects.get(code='THM')
        except Course.DoesNotExist:
            self.stdout.write(self.style.WARNING('THM course not found, skipping THM subjects'))
            return

        subjects = [
            # ===== FIRST YEAR =====
            # Semester 1 (from official THM Syllabus)
            {'code': '510901', 'name': 'Introduction to Business', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510903', 'name': 'Fundamentals of Tourism and Hospitality', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510905', 'name': 'Introduction to Computer', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510907', 'name': 'Basic English Language', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510909', 'name': 'History of the Emergence of Independent Bangladesh', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 2
            {'code': '510911', 'name': 'Business Mathematics', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510913', 'name': 'General Science and Environment', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510915', 'name': 'Micro Economics', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510917', 'name': 'First Aid, Safety and Security', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '510919', 'name': 'Fundamentals of Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # ===== SECOND YEAR =====
            # Semester 3
            {'code': '520901', 'name': 'Hospitality Managerial Communication', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520903', 'name': 'Business Statistics', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520905', 'name': 'Fundamentals of Accounting', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520907', 'name': 'Macro Economics and Economy of Bangladesh', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520909', 'name': 'Business Law and Legal Issues of Tourism', 'semester': '3rd', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 4
            {'code': '520911', 'name': 'Tourism and Hospitality Marketing', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520913', 'name': 'Fundamentals of Culinary Art', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '520915', 'name': 'Front Office Operations and Reservation', 'semester': '4th', 'credits': 2.0, 'marks': 60, 'type': 'core'},
            {'code': '520916', 'name': 'Front Office Operations and Reservation (Practical)', 'semester': '4th', 'credits': 1.0, 'marks': 40, 'type': 'lab'},
            {'code': '520917', 'name': 'Housekeeping Management', 'semester': '4th', 'credits': 2.0, 'marks': 60, 'type': 'core'},
            {'code': '520918', 'name': 'Housekeeping Management (Practical)', 'semester': '4th', 'credits': 1.0, 'marks': 40, 'type': 'lab'},
            {'code': '520919', 'name': 'HRM in Tourism and Hospitality', 'semester': '4th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # ===== THIRD YEAR =====
            # Semester 5
            {'code': '530901', 'name': 'Tourism in Bangladesh', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530903', 'name': 'Food and Beverage Production', 'semester': '5th', 'credits': 2.0, 'marks': 60, 'type': 'core'},
            {'code': '530904', 'name': 'Food and Beverage Production (Practical)', 'semester': '5th', 'credits': 1.0, 'marks': 40, 'type': 'lab'},
            {'code': '530905', 'name': 'Food and Beverage Service', 'semester': '5th', 'credits': 2.0, 'marks': 60, 'type': 'core'},
            {'code': '530906', 'name': 'Food and Beverage Service (Practical)', 'semester': '5th', 'credits': 1.0, 'marks': 40, 'type': 'lab'},
            {'code': '530907', 'name': 'Food Hygiene and Sanitation', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530909', 'name': 'Tourism Planning and Development', 'semester': '5th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 6
            {'code': '530911', 'name': 'Research Methodology', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530913', 'name': 'Tourist Behavior', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530915', 'name': 'Food and Beverage Management', 'semester': '6th', 'credits': 2.0, 'marks': 60, 'type': 'core'},
            {'code': '530916', 'name': 'Food and Beverage Management (Practical)', 'semester': '6th', 'credits': 1.0, 'marks': 40, 'type': 'lab'},
            {'code': '530917', 'name': 'Computerized Reservation System (CRS)', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '530919', 'name': 'Fundamentals of Finance', 'semester': '6th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # ===== FOURTH YEAR =====
            # Semester 7
            {'code': '540901', 'name': 'Geography of Tourism', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '540903', 'name': 'Community and Cultural Issues in Tourism', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '540905', 'name': 'Travel Agency and Tour Operations', 'semester': '7th', 'credits': 2.0, 'marks': 60, 'type': 'core'},
            {'code': '540906', 'name': 'Travel Agency and Tour Operations (Practical)', 'semester': '7th', 'credits': 1.0, 'marks': 40, 'type': 'lab'},
            {'code': '540907', 'name': 'French Language', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '540909', 'name': 'Tourism and Hospitality Entrepreneurship', 'semester': '7th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # Semester 8
            {'code': '540911', 'name': 'Destination Management', 'semester': '8th', 'credits': 2.0, 'marks': 60, 'type': 'core'},
            {'code': '540912', 'name': 'Destination Management (Field Work)', 'semester': '8th', 'credits': 1.0, 'marks': 40, 'type': 'lab'},
            {'code': '540913', 'name': 'MICE Management', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '540914', 'name': 'Internship (Report and Defense)', 'semester': '8th', 'credits': 6.0, 'marks': 200, 'type': 'project'},
            {'code': '540916', 'name': 'Viva-Voce', 'semester': '8th', 'credits': 3.0, 'marks': 100, 'type': 'viva'},
        ]
        
        self._create_subjects(subjects, course, 'THM')

    def seed_mba_subjects(self):
        """Seed MBA subjects from official NU syllabus (2017-2018) - One Year Program"""
        try:
            course = Course.objects.get(code='MBA')
        except Course.DoesNotExist:
            self.stdout.write(self.style.WARNING('MBA course not found, skipping MBA subjects'))
            return

        # Get major options for MBA
        try:
            major_ais = MajorMinorOption.objects.get(code='MBA_AIS')
            major_hrm = MajorMinorOption.objects.get(code='MBA_HRM')
            major_mkt = MajorMinorOption.objects.get(code='MBA_MKT')
            major_fin = MajorMinorOption.objects.get(code='MBA_FIN')
        except MajorMinorOption.DoesNotExist:
            major_ais = major_hrm = major_mkt = major_fin = None

        subjects = [
            # ===== FIRST SEMESTER (Common for all majors) =====
            {'code': '610101', 'name': 'Advanced Research Methodology', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '610103', 'name': 'Management of Multinational Corporations', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '610105', 'name': 'Bangladesh Economy: Performance & Policies', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '610107', 'name': 'Managerial Economics', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            {'code': '610109', 'name': 'Project Management', 'semester': '1st', 'credits': 3.0, 'marks': 100, 'type': 'core'},
            # ===== SECOND SEMESTER - AIS MAJOR =====
            {'code': '620121', 'name': 'Advanced Financial Accounting', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '620123', 'name': 'Corporate Financial Reporting', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '620125', 'name': 'Corporate Tax Planning', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '620127', 'name': 'Strategic Management Accounting', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '620129', 'name': 'Advanced Auditing and Assurance', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_ais},
            {'code': '620130', 'name': 'Internship Report/Project Paper (AIS)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'project', 'major': major_ais},
            {'code': '620132', 'name': 'Viva-Voce with Defense (AIS)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'viva', 'major': major_ais},
            # ===== SECOND SEMESTER - HRM MAJOR =====
            {'code': '620141', 'name': 'Training and Development', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_hrm},
            {'code': '620143', 'name': 'Strategic Human Resource Planning', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_hrm},
            {'code': '620145', 'name': 'Compensation Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_hrm},
            {'code': '620147', 'name': 'Human Resource Information Systems', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_hrm},
            {'code': '620149', 'name': 'International Human Resource Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_hrm},
            {'code': '620150', 'name': 'Internship Report/Project Paper (HRM)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'project', 'major': major_hrm},
            {'code': '620152', 'name': 'Viva-Voce with Defense (HRM)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'viva', 'major': major_hrm},
            # ===== SECOND SEMESTER - MARKETING MAJOR =====
            {'code': '620161', 'name': 'Strategic Marketing', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '620163', 'name': 'Global Marketing', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '620165', 'name': 'Marketing for Non-Profit Organization', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '620167', 'name': 'Financial Services Marketing', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '620169', 'name': 'Innovation & New Product Development', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_mkt},
            {'code': '620170', 'name': 'Internship Report/Project Paper (MKT)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'project', 'major': major_mkt},
            {'code': '620172', 'name': 'Viva-Voce with Defense (MKT)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'viva', 'major': major_mkt},
            # ===== SECOND SEMESTER - FINANCE & BANKING MAJOR =====
            {'code': '620181', 'name': 'International Financial Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '620183', 'name': 'Capital Investment Decision', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '620185', 'name': 'Merchant & Investment Banking', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '620187', 'name': 'Financial Derivatives', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '620189', 'name': 'Bank Risk Management', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'major', 'major': major_fin},
            {'code': '620190', 'name': 'Internship Report/Project Paper (FIN)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'project', 'major': major_fin},
            {'code': '620192', 'name': 'Viva-Voce with Defense (FIN)', 'semester': '2nd', 'credits': 3.0, 'marks': 100, 'type': 'viva', 'major': major_fin},
        ]
        
        self._create_subjects(subjects, course, 'MBA')

    def _create_subjects(self, subjects, course, course_code):
        """Helper to create subjects with optional major assignment"""
        created_count = 0
        updated_count = 0
        for subj_data in subjects:
            defaults = {
                'name': subj_data['name'],
                'course': course,
                'course_code': course_code,
                'semester': subj_data['semester'],
                'credit_hours': Decimal(str(subj_data['credits'])),
                'total_marks': subj_data['marks'],
                'subject_type': subj_data['type'],
                'is_active': True,
            }
            # Add major if specified
            if 'major' in subj_data and subj_data['major'] is not None:
                defaults['major'] = subj_data['major']
            
            subject, created = Subject.objects.update_or_create(
                code=subj_data['code'],
                defaults=defaults
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'  {course_code}: {created_count} created, {updated_count} updated (Total: {created_count + updated_count})'
        ))
