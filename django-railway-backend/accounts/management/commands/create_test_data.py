"""
Django management command to create test data for IGMIS LMS
Run: python manage.py create_test_data
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random

from accounts.models import User, Student
from students.models import Course, Batch, Enrollment, Teacher
from academics.models import Subject, Exam, Result
from payments.models import FeeStructure, Payment, Expense


class Command(BaseCommand):
    help = 'Creates test data for the LMS including users, courses, batches, subjects, exams, results, and payments'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('\n🚀 Creating test data for IGMIS LMS...\n'))

        # Create users
        admin_user = self.create_admin()
        teacher_users = self.create_teachers()
        student_users = self.create_students()

        # Create courses and batches
        courses = self.create_courses()
        batches = self.create_batches(courses)

        # Create subjects
        subjects = self.create_subjects(courses)

        # Create teachers
        teachers = self.create_teacher_profiles(teacher_users)

        # Create students
        students = self.create_student_profiles(student_users, batches)

        # Create enrollments
        self.create_enrollments(students, batches)

        # Create fee structures
        self.create_fee_structures(batches)

        # Create exams
        exams = self.create_exams(batches)

        # Create results
        self.create_results(students, exams, subjects)

        # Create payments
        self.create_payments(students)

        # Create expenses
        self.create_expenses(admin_user)

        self.stdout.write(self.style.SUCCESS('\n✅ Test data created successfully!\n'))
        self.print_credentials()

    def create_admin(self):
        """Create admin user"""
        if User.objects.filter(username='admin').exists():
            self.stdout.write(self.style.WARNING('⚠️  Admin user already exists, skipping...'))
            return User.objects.get(username='admin')
        
        admin = User.objects.create_user(
            username='admin',
            email='admin@igmis.edu',
            password='admin123',
            first_name='System',
            last_name='Administrator',
            role='ADMIN',
            phone_number='+8801700000000',
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        self.stdout.write(self.style.SUCCESS('✓ Created admin user'))
        return admin

    def create_teachers(self):
        """Create teacher users"""
        teachers = []
        teacher_data = [
            ('teacher1', 'Dr. Sarah', 'Johnson', 'sarah.johnson@igmis.edu', '+8801700000001'),
            ('teacher2', 'Prof. Michael', 'Chen', 'michael.chen@igmis.edu', '+8801700000002'),
        ]

        for username, first_name, last_name, email, phone in teacher_data:
            if User.objects.filter(username=username).exists():
                teacher = User.objects.get(username=username)
            else:
                teacher = User.objects.create_user(
                    username=username,
                    email=email,
                    password='teacher123',
                    first_name=first_name,
                    last_name=last_name,
                    role='TEACHER',
                    phone_number=phone,
                    is_staff=True,
                    is_active=True
                )
            teachers.append(teacher)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(teachers)} teacher users'))
        return teachers

    def create_students(self):
        """Create student users"""
        students = []
        first_names = ['John', 'Emma', 'Michael', 'Sophia', 'William', 'Olivia', 'James', 'Ava', 'Robert', 'Isabella']
        last_names = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson']

        for i in range(1, 11):
            username = f'student{i}'
            if User.objects.filter(username=username).exists():
                student = User.objects.get(username=username)
            else:
                student = User.objects.create_user(
                    username=username,
                    email=f'student{i}@igmis.edu',
                    password='student123',
                    first_name=first_names[i-1],
                    last_name=last_names[i-1],
                    role='STUDENT',
                    phone_number=f'+880170000{i:04d}',
                    is_active=True
                )
            students.append(student)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(students)} student users'))
        return students

    def create_courses(self):
        """Create university courses"""
        courses_data = [
            ('BBA', 'Bachelor of Business Administration', 'Undergraduate business program focusing on management, finance, and marketing', 48, 250000.00),
            ('MBA', 'Master of Business Administration', 'Graduate program in business administration and management', 24, 350000.00),
            ('BCS', 'Bachelor of Computer Science', 'Undergraduate program in computer science and software engineering', 48, 280000.00),
        ]

        courses = []
        for code, name, description, duration, fee in courses_data:
            course, created = Course.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': description,
                    'duration_months': duration,
                    'fee': Decimal(str(fee)),
                    'is_active': True
                }
            )
            courses.append(course)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(courses)} courses'))
        return courses

    def create_batches(self, courses):
        """Create batches for courses"""
        batches = []
        today = timezone.now().date()

        batches_data = [
            # BBA batches
            (courses[0], 'BBA 12th Batch', today - timedelta(days=365*2), today + timedelta(days=365*2)),
            (courses[0], 'BBA 13th Batch', today - timedelta(days=365), today + timedelta(days=365*3)),
            # MBA semesters
            (courses[1], 'MBA 1st Semester', today - timedelta(days=180), today + timedelta(days=180)),
            (courses[1], 'MBA 2nd Semester', today - timedelta(days=90), today + timedelta(days=270)),
            # BCS batches
            (courses[2], 'BCS 5th Batch', today - timedelta(days=365), today + timedelta(days=365*3)),
        ]

        for course, name, start_date, end_date in batches_data:
            batch, created = Batch.objects.get_or_create(
                name=name,
                course=course,
                defaults={
                    'start_date': start_date,
                    'end_date': end_date,
                    'is_active': True
                }
            )
            batches.append(batch)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(batches)} batches'))
        return batches

    def create_subjects(self, courses):
        """Create subjects for each course"""
        subjects = []
        
        subjects_data = {
            'BBA': [
                ('ACC101', 'Principles of Accounting', 100),
                ('FIN101', 'Business Finance', 100),
                ('MKT101', 'Marketing Management', 100),
                ('MGT101', 'Principles of Management', 100),
                ('STAT101', 'Business Statistics', 100),
                ('ECON101', 'Microeconomics', 100),
            ],
            'MBA': [
                ('MBA501', 'Strategic Management', 100),
                ('MBA502', 'Financial Management', 100),
                ('MBA503', 'Marketing Strategy', 100),
                ('MBA504', 'Operations Management', 100),
                ('MBA505', 'Human Resource Management', 100),
            ],
            'BCS': [
                ('CS101', 'Programming Fundamentals', 100),
                ('CS102', 'Data Structures', 100),
                ('CS103', 'Database Systems', 100),
                ('CS104', 'Web Development', 100),
                ('CS105', 'Software Engineering', 100),
            ],
        }

        for course in courses:
            if course.code in subjects_data:
                for code, name, total_marks in subjects_data[course.code]:
                    subject, created = Subject.objects.get_or_create(
                        code=code,
                        defaults={
                            'name': name,
                            'course': course,
                            'total_marks': total_marks
                        }
                    )
                    subjects.append(subject)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(subjects)} subjects'))
        return subjects

    def create_teacher_profiles(self, teacher_users):
        """Create teacher profiles"""
        teachers = []
        qualifications = ['PhD in Business Administration', 'Master in Computer Science']
        subjects = ['Accounting, Finance', 'Marketing, Management']

        for i, user in enumerate(teacher_users):
            if hasattr(user, 'teacher_profile'):
                teachers.append(user.teacher_profile)
                continue

            teacher = Teacher.objects.create(
                user=user,
                subjects=subjects[i],
                qualification=qualifications[i],
                joining_date=timezone.now().date() - timedelta(days=365*2),
                monthly_salary=Decimal('45000.00'),
                is_active=True
            )
            teachers.append(teacher)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(teachers)} teacher profiles'))
        return teachers

    def create_student_profiles(self, student_users, batches):
        """Create student profiles"""
        students = []
        
        for i, user in enumerate(student_users):
            if hasattr(user, 'student_profile'):
                students.append(user.student_profile)
                continue

            batch = batches[i % len(batches)]
            
            student = Student.objects.create(
                user=user,
                date_of_birth=datetime(2000 + i, 1 + i, 15).date(),
                guardian_name=f'Guardian {user.last_name}',
                guardian_phone=f'+880170{i:07d}',
                admission_date=timezone.now().date() - timedelta(days=random.randint(30, 365)),
                batch=batch,
                blood_group=random.choice(['A+', 'B+', 'O+', 'AB+']),
                present_address=f'{i+1} University Road, Dhaka, Bangladesh',
                permanent_address=f'{i+1} Main Street, Chittagong, Bangladesh'
            )
            students.append(student)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(students)} student profiles'))
        return students

    def create_enrollments(self, students, batches):
        """Create enrollments for students"""
        enrollments = []
        for student in students:
            if Enrollment.objects.filter(student=student, batch=student.batch).exists():
                continue
                
            enrollment = Enrollment.objects.create(
                student=student,
                batch=student.batch,
                enrollment_date=student.admission_date,
                status='active'
            )
            enrollments.append(enrollment)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(enrollments)} enrollments'))
        return enrollments

    def create_fee_structures(self, batches):
        """Create fee structures for batches"""
        fee_structures = []
        today = timezone.now().date()

        for batch in batches:
            fee_types = [
                ('admission', Decimal('10000.00'), today - timedelta(days=30)),
                ('tuition', Decimal('40000.00'), today + timedelta(days=30)),
                ('exam', Decimal('5000.00'), today + timedelta(days=60)),
            ]

            for fee_type, amount, due_date in fee_types:
                fee_structure, created = FeeStructure.objects.get_or_create(
                    batch=batch,
                    fee_type=fee_type,
                    defaults={
                        'amount': amount,
                        'due_date': due_date,
                        'description': f'{fee_type.title()} fee for {batch.name}'
                    }
                )
                fee_structures.append(fee_structure)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(fee_structures)} fee structures'))
        return fee_structures

    def create_exams(self, batches):
        """Create exams for batches"""
        exams = []
        today = timezone.now().date()

        exam_types = [
            ('Midterm Examination', 'midterm', today - timedelta(days=30)),
            ('Final Examination', 'final', today + timedelta(days=30)),
        ]

        for batch in batches:
            for name, exam_type, exam_date in exam_types:
                exam, created = Exam.objects.get_or_create(
                    name=f'{batch.name} - {name}',
                    batch=batch,
                    defaults={
                        'exam_type': exam_type,
                        'exam_date': exam_date,
                        'total_marks': 100,
                        'description': f'{name} for {batch.name}'
                    }
                )
                exams.append(exam)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(exams)} exams'))
        return exams

    def create_results(self, students, exams, subjects):
        """Create result records for students"""
        results = []
        
        for student in students[:8]:  # Create results for first 8 students
            # Get exams for student's batch
            student_exams = [exam for exam in exams if exam.batch == student.batch]
            
            for exam in student_exams:
                # Get subjects for the course
                course_subjects = [s for s in subjects if s.course == student.batch.course]
                
                for subject in course_subjects[:4]:  # First 4 subjects
                    if Result.objects.filter(student=student, exam=exam, subject=subject).exists():
                        continue
                        
                    # Generate random marks (50-95)
                    marks = Decimal(str(random.uniform(50, 95)))
                    
                    result = Result.objects.create(
                        student=student,
                        exam=exam,
                        subject=subject,
                        marks_obtained=marks,
                        remarks='Good performance' if marks >= 70 else 'Needs improvement'
                    )
                    results.append(result)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(results)} result records'))
        return results

    def create_payments(self, students):
        """Create payment records for students"""
        payments = []
        today = timezone.now().date()

        for student in students[:8]:  # Create payments for first 8 students
            # Get fee structures for student's batch
            fee_structures = FeeStructure.objects.filter(batch=student.batch)
            
            for fee_structure in fee_structures[:2]:  # First 2 fee structures
                if Payment.objects.filter(student=student, fee_structure=fee_structure).exists():
                    continue
                    
                # Random payment amount (70-100% of fee)
                payment_percentage = random.uniform(0.7, 1.0)
                amount = fee_structure.amount * Decimal(str(payment_percentage))
                
                payment = Payment.objects.create(
                    student=student,
                    fee_structure=fee_structure,
                    amount_paid=amount,
                    payment_date=today - timedelta(days=random.randint(1, 30)),
                    payment_method=random.choice(['cash', 'bank_transfer', 'online']),
                    transaction_id=f'TXN{random.randint(100000, 999999)}',
                    discount_amount=Decimal('0.00'),
                    remarks='Regular payment'
                )
                payments.append(payment)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(payments)} payment records'))
        return payments

    def create_expenses(self, admin_user):
        """Create expense records"""
        expenses = []
        today = timezone.now().date()

        expenses_data = [
            ('salary', Decimal('90000.00'), 'Teacher salaries for the month', 'Teachers'),
            ('rent', Decimal('50000.00'), 'Monthly building rent', 'Building Owner'),
            ('utility', Decimal('15000.00'), 'Electricity and water bills', 'Utility Company'),
            ('maintenance', Decimal('10000.00'), 'Building maintenance and repairs', 'Maintenance Team'),
        ]

        for expense_type, amount, description, paid_to in expenses_data:
            expense = Expense.objects.create(
                expense_type=expense_type,
                amount=amount,
                description=description,
                expense_date=today - timedelta(days=random.randint(1, 30)),
                paid_to=paid_to,
                created_by=admin_user
            )
            expenses.append(expense)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(expenses)} expense records'))
        return expenses

    def print_credentials(self):
        """Print login credentials"""
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('📋 LOGIN CREDENTIALS'))
        self.stdout.write(self.style.SUCCESS('='*60))
        
        self.stdout.write(self.style.WARNING('\n👤 ADMIN:'))
        self.stdout.write('   Username: admin')
        self.stdout.write('   Password: admin123')
        self.stdout.write('   Email: admin@igmis.edu')
        
        self.stdout.write(self.style.WARNING('\n👨‍🏫 TEACHERS:'))
        self.stdout.write('   Username: teacher1 | Password: teacher123')
        self.stdout.write('   Username: teacher2 | Password: teacher123')
        
        self.stdout.write(self.style.WARNING('\n👨‍🎓 STUDENTS:'))
        self.stdout.write('   Username: student1 to student10')
        self.stdout.write('   Password: student123 (for all students)')
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60 + '\n'))

