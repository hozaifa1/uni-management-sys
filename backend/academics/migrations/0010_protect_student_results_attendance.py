"""
Tighten on_delete for student-linked records.

Result.student and Attendance.student now use PROTECT so an accidental
student deletion cannot silently wipe academic history.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0009_attendance'),
        ('accounts', '0010_clear_seeded_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='result',
            name='student',
            field=models.ForeignKey(
                help_text='Student',
                on_delete=models.PROTECT,
                related_name='results',
                to='accounts.student',
            ),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='student',
            field=models.ForeignKey(
                help_text='Student',
                on_delete=models.PROTECT,
                related_name='attendances',
                to='accounts.student',
            ),
        ),
    ]
