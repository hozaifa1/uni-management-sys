"""
One-time data migration: remove all seeded / sample data.

Keeps intact (curricula):
  - academics.Subject       (official NU syllabi)
  - academics.MajorMinorOption
  - students.Course         (course definitions)
  - accounts.User with role != 'STUDENT'  (admin/staff accounts)

Removes (seeded / test data):
  - academics.Attendance
  - academics.Result
  - academics.Exam
  - payments.Payment
  - payments.FeeStructure
  - payments.Expense
  - accounts.Student        (cascade covers Payment / Result / Attendance)
  - accounts.User  role='STUDENT'
  - students.Teacher
"""
from django.db import migrations


def clear_seeded_data(apps, schema_editor):
    Attendance    = apps.get_model('academics', 'Attendance')
    Result        = apps.get_model('academics', 'Result')
    Exam          = apps.get_model('academics', 'Exam')
    Payment       = apps.get_model('payments',  'Payment')
    FeeStructure  = apps.get_model('payments',  'FeeStructure')
    Expense       = apps.get_model('payments',  'Expense')
    Student       = apps.get_model('accounts',  'Student')
    User          = apps.get_model('accounts',  'User')
    Teacher       = apps.get_model('students',  'Teacher')

    # Delete in safe dependency order
    Attendance.objects.all().delete()
    Result.objects.all().delete()
    Payment.objects.all().delete()
    Expense.objects.all().delete()
    FeeStructure.objects.all().delete()
    Exam.objects.all().delete()          # after Results gone; keeps Subjects
    Student.objects.all().delete()       # cascade handles any stragglers
    User.objects.filter(role='STUDENT').delete()
    Teacher.objects.all().delete()


def noop(apps, schema_editor):
    """Reverse is a no-op — we don't restore deleted data."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts',  '0009_guardian_income_no_decimal'),
        ('academics', '0009_attendance'),
        ('payments',  '0005_remove_money_decimal_places'),
        ('students',  '0003_drop_enrollment_table'),
    ]

    operations = [
        migrations.RunPython(clear_seeded_data, reverse_code=noop),
    ]
