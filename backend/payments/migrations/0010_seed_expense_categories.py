from django.db import migrations


DEFAULT_CATEGORIES = [
    ('Teacher Salaries', 'salary'),
    ('Staff Salaries', 'salary'),
    ('Campus Rent', 'rent'),
    ('Electricity Bill', 'utility'),
    ('WiFi / Internet', 'utility'),
    ('Food', 'food'),
    ('Conveyance', 'conveyance'),
    ('Maintenance', 'maintenance'),
]


def seed(apps, schema_editor):
    ExpenseCategory = apps.get_model('payments', 'ExpenseCategory')
    for name, kind in DEFAULT_CATEGORIES:
        ExpenseCategory.objects.get_or_create(name=name, defaults={'kind': kind})


def unseed(apps, schema_editor):
    ExpenseCategory = apps.get_model('payments', 'ExpenseCategory')
    ExpenseCategory.objects.filter(name__in=[n for n, _ in DEFAULT_CATEGORIES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0009_expense_period_label_alter_expense_description_and_more'),
    ]
    operations = [migrations.RunPython(seed, unseed)]
