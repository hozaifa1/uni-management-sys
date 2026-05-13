from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_student_major_student_major_locked'),
    ]

    operations = [
        migrations.AlterField(
            model_name='student',
            name='guardian_yearly_income',
            field=models.DecimalField(
                blank=True,
                decimal_places=0,
                help_text="Guardian's yearly income",
                max_digits=12,
                null=True,
            ),
        ),
    ]
