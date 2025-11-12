"""Quick script to check if test data exists"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User, Student
from students.models import Course, Batch
from academics.models import Subject, Exam, Result
from payments.models import Payment

print("Database Counts:")
print(f"  Users: {User.objects.count()}")
print(f"  Students: {Student.objects.count()}")
print(f"  Courses: {Course.objects.count()}")
print(f"  Batches: {Batch.objects.count()}")
print(f"  Subjects: {Subject.objects.count()}")
print(f"  Exams: {Exam.objects.count()}")
print(f"  Results: {Result.objects.count()}")
print(f"  Payments: {Payment.objects.count()}")

if Course.objects.exists():
    print("\nCourses:")
    for course in Course.objects.all():
        print(f"  - {course.code}: {course.name}")

if Batch.objects.exists():
    print("\nBatches:")
    for batch in Batch.objects.all()[:5]:
        print(f"  - {batch.name}")

