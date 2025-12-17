from django.db import migrations


def update_exam_types(apps, schema_editor):
    """
    Update old exam types to new exam types:
    - midterm -> incourse_1st
    - ssc, hsc, quiz, assignment -> incourse_2nd
    - final stays as final
    """
    Exam = apps.get_model('academics', 'Exam')
    
    # Map old types to new types
    type_mapping = {
        'midterm': 'incourse_1st',
        'ssc': 'incourse_2nd',
        'hsc': 'incourse_2nd',
        'quiz': 'incourse_1st',
        'assignment': 'incourse_2nd',
    }
    
    for old_type, new_type in type_mapping.items():
        Exam.objects.filter(exam_type=old_type).update(exam_type=new_type)


def reverse_update_exam_types(apps, schema_editor):
    """Reverse migration - this is a one-way data migration"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0005_model_updates'),
    ]

    operations = [
        migrations.RunPython(update_exam_types, reverse_update_exam_types),
    ]
