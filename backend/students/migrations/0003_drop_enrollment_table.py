# Manual migration to drop orphaned students_enrollment table
from django.db import migrations


def drop_enrollment_table(apps, schema_editor):
    """Drop the students_enrollment table if it exists"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            DROP TABLE IF EXISTS students_enrollment CASCADE;
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0002_remove_enrollment_batch_and_more'),
    ]

    operations = [
        migrations.RunPython(drop_enrollment_table, reverse_code=migrations.RunPython.noop),
    ]
