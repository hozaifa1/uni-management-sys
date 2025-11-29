"""
Management command to seed initial data for IGMIS LMS
Seeds: Courses (BBA, CSE, THM, EEE, LLB, MBA), Batches, and Sample Students
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from accounts.models import User, Student
from students.models import Course, Batch


class Command(BaseCommand):
    help = 'Seed initial data: Courses, Batches, and Sample Students'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            Student.objects.all().delete()
            User.objects.filter(role='STUDENT').delete()
            Batch.objects.all().delete()
            Course.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing data cleared.'))

        self.seed_courses()
        self.seed_batches()
        self.seed_students()
        
        self.stdout.write(self.style.SUCCESS('Data seeding completed successfully!'))

    def seed_courses(self):
        """Seed the 6 courses from Personal Info.xlsx"""
        courses_data = [
            {
                'code': 'BBA',
                'name': 'Bachelor of Business Administration',
                'description': 'A comprehensive program covering business management, marketing, finance, and entrepreneurship.',
                'duration_months': 48,
                'fee': Decimal('250000.00'),
            },
            {
                'code': 'CSE',
                'name': 'Computer Science & Engineering',
                'description': 'Program focused on computer programming, software development, and system design.',
                'duration_months': 48,
                'fee': Decimal('280000.00'),
            },
            {
                'code': 'THM',
                'name': 'Tourism & Hospitality Management',
                'description': 'Prepares students for careers in the tourism and hospitality industry.',
                'duration_months': 48,
                'fee': Decimal('220000.00'),
            },
            {
                'code': 'EEE',
                'name': 'Electrical & Electronic Engineering',
                'description': 'Engineering program covering electrical systems, electronics, and power systems.',
                'duration_months': 48,
                'fee': Decimal('300000.00'),
            },
            {
                'code': 'LLB',
                'name': 'Bachelor of Laws',
                'description': 'Comprehensive legal education program for aspiring lawyers.',
                'duration_months': 48,
                'fee': Decimal('200000.00'),
            },
            {
                'code': 'MBA',
                'name': 'Master of Business Administration',
                'description': 'Advanced business management program for professionals.',
                'duration_months': 24,
                'fee': Decimal('350000.00'),
            },
        ]

        for course_data in courses_data:
            course, created = Course.objects.update_or_create(
                code=course_data['code'],
                defaults=course_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status} course: {course.code} - {course.name}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(courses_data)} courses.'))

    def seed_batches(self):
        """Seed sample batches for each course"""
        today = date.today()
        current_year = today.year
        
        sessions = ['2023-2024', '2024-2025']
        
        batches_created = 0
        for course in Course.objects.all():
            for session in sessions:
                start_year = int(session.split('-')[0])
                batch_name = f'{course.code} {session}'
                
                batch, created = Batch.objects.update_or_create(
                    name=batch_name,
                    course=course,
                    defaults={
                        'start_date': date(start_year, 1, 1),
                        'end_date': date(start_year + (course.duration_months // 12), 12, 31),
                        'is_active': session == '2024-2025',
                    }
                )
                if created:
                    batches_created += 1
                    self.stdout.write(f'  Created batch: {batch.name}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {batches_created} batches.'))

    def seed_students(self):
        """Seed sample students with all the new fields"""
        # Get some batches to assign students to
        batches = list(Batch.objects.filter(is_active=True)[:3])
        
        if not batches:
            self.stdout.write(self.style.WARNING('No active batches found. Skipping student seeding.'))
            return

        sample_students = [
            {
                'user': {
                    'username': 'rahmanstudent',
                    'email': 'rahman.student@igmis.edu.bd',
                    'first_name': 'Abdul',
                    'last_name': 'Rahman',
                    'phone_number': '+8801712345678',
                },
                'student': {
                    'date_of_birth': date(2000, 5, 15),
                    'blood_group': 'A+',
                    'session': '2024-2025',
                    'semester': '1st',
                    'guardian_name': 'Mohammad Karim',
                    'guardian_phone': '+8801812345678',
                    'guardian_yearly_income': Decimal('500000.00'),
                    'father_name': 'Mohammad Karim',
                    'father_phone': '+8801812345678',
                    'mother_name': 'Fatima Begum',
                    'mother_phone': '+8801912345678',
                    'present_house_no': '12/A',
                    'present_road_vill': 'Mirpur Road',
                    'present_police_station': 'Mirpur',
                    'present_post_office': 'Mirpur-10',
                    'present_district': 'Dhaka',
                    'present_division': 'Dhaka',
                    'permanent_house_no': '45',
                    'permanent_road_vill': 'Station Road',
                    'permanent_police_station': 'Bogura Sadar',
                    'permanent_post_office': 'Bogura',
                    'permanent_district': 'Bogura',
                    'permanent_division': 'Rajshahi',
                    'ssc_school': 'Bogura Zilla School',
                    'ssc_passing_year': 2018,
                    'ssc_group': 'Science',
                    'ssc_4th_subject': 'Higher Mathematics',
                    'ssc_gpa': Decimal('5.00'),
                    'ssc_cgpa': Decimal('5.00'),
                    'hsc_college': 'Govt. Azizul Haque College',
                    'hsc_passing_year': 2020,
                    'hsc_group': 'Science',
                    'hsc_4th_subject': 'Physics',
                    'hsc_gpa': Decimal('4.75'),
                    'hsc_cgpa': Decimal('4.83'),
                },
            },
            {
                'user': {
                    'username': 'tasniahstudent',
                    'email': 'tasniah.student@igmis.edu.bd',
                    'first_name': 'Tasniah',
                    'last_name': 'Akter',
                    'phone_number': '+8801623456789',
                },
                'student': {
                    'date_of_birth': date(2001, 8, 22),
                    'blood_group': 'B+',
                    'session': '2024-2025',
                    'semester': '1st',
                    'guardian_name': 'Akhter Hossain',
                    'guardian_phone': '+8801723456789',
                    'guardian_yearly_income': Decimal('600000.00'),
                    'father_name': 'Akhter Hossain',
                    'father_phone': '+8801723456789',
                    'mother_name': 'Rashida Khatun',
                    'mother_phone': '+8801823456789',
                    'present_house_no': '78/B',
                    'present_road_vill': 'Dhanmondi 27',
                    'present_police_station': 'Dhanmondi',
                    'present_post_office': 'Dhanmondi',
                    'present_district': 'Dhaka',
                    'present_division': 'Dhaka',
                    'permanent_house_no': '23',
                    'permanent_road_vill': 'College Road',
                    'permanent_police_station': 'Comilla Sadar',
                    'permanent_post_office': 'Comilla',
                    'permanent_district': 'Comilla',
                    'permanent_division': 'Chattogram',
                    'ssc_school': 'Comilla Govt. Girls High School',
                    'ssc_passing_year': 2019,
                    'ssc_group': 'Commerce',
                    'ssc_4th_subject': 'Accounting',
                    'ssc_gpa': Decimal('4.89'),
                    'ssc_cgpa': Decimal('4.94'),
                    'hsc_college': 'Comilla Victoria Govt. College',
                    'hsc_passing_year': 2021,
                    'hsc_group': 'Commerce',
                    'hsc_4th_subject': 'Finance',
                    'hsc_gpa': Decimal('4.67'),
                    'hsc_cgpa': Decimal('4.78'),
                },
            },
            {
                'user': {
                    'username': 'kamalstudent',
                    'email': 'kamal.student@igmis.edu.bd',
                    'first_name': 'Kamal',
                    'last_name': 'Hasan',
                    'phone_number': '+8801534567890',
                },
                'student': {
                    'date_of_birth': date(1999, 3, 10),
                    'blood_group': 'O+',
                    'session': '2023-2024',
                    'semester': '3rd',
                    'guardian_name': 'Jamal Uddin',
                    'guardian_phone': '+8801634567890',
                    'guardian_yearly_income': Decimal('450000.00'),
                    'father_name': 'Jamal Uddin',
                    'father_phone': '+8801634567890',
                    'mother_name': 'Salma Begum',
                    'mother_phone': '+8801734567890',
                    'present_house_no': '56',
                    'present_road_vill': 'Uttara Sector 7',
                    'present_police_station': 'Uttara',
                    'present_post_office': 'Uttara',
                    'present_district': 'Dhaka',
                    'present_division': 'Dhaka',
                    'permanent_house_no': '89',
                    'permanent_road_vill': 'Sadar Road',
                    'permanent_police_station': 'Sylhet Sadar',
                    'permanent_post_office': 'Sylhet',
                    'permanent_district': 'Sylhet',
                    'permanent_division': 'Sylhet',
                    'ssc_school': 'Sylhet Govt. Pilot High School',
                    'ssc_passing_year': 2017,
                    'ssc_group': 'Science',
                    'ssc_4th_subject': 'Biology',
                    'ssc_gpa': Decimal('4.56'),
                    'ssc_cgpa': Decimal('4.72'),
                    'hsc_college': 'MC College Sylhet',
                    'hsc_passing_year': 2019,
                    'hsc_group': 'Science',
                    'hsc_4th_subject': 'Chemistry',
                    'hsc_gpa': Decimal('4.33'),
                    'hsc_cgpa': Decimal('4.52'),
                },
            },
        ]

        students_created = 0
        for idx, data in enumerate(sample_students):
            user_data = data['user']
            student_data = data['student']
            
            # Check if user already exists
            if User.objects.filter(username=user_data['username']).exists():
                self.stdout.write(f"  Skipping existing user: {user_data['username']}")
                continue
            
            # Create user
            user = User.objects.create(
                username=user_data['username'],
                email=user_data['email'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                phone_number=user_data['phone_number'],
                role='STUDENT',
            )
            user.set_password('student123')
            user.save()
            
            # Assign to a batch (cycle through available batches)
            batch = batches[idx % len(batches)]
            
            # Create student profile
            student = Student.objects.create(
                user=user,
                batch=batch,
                admission_date=date.today() - timedelta(days=idx * 30),
                **student_data
            )
            
            students_created += 1
            self.stdout.write(f'  Created student: {student.student_id} - {user.get_full_name()} ({batch.name})')

        self.stdout.write(self.style.SUCCESS(f'Seeded {students_created} students.'))
