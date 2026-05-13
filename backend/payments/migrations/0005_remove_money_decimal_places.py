from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_model_updates'),
    ]

    operations = [
        migrations.AlterField(
            model_name='feestructure',
            name='amount',
            field=models.DecimalField(decimal_places=0, help_text='Fee amount', max_digits=10),
        ),
        migrations.AlterField(
            model_name='payment',
            name='amount_paid',
            field=models.DecimalField(decimal_places=0, help_text='Amount paid', max_digits=10),
        ),
        migrations.AlterField(
            model_name='payment',
            name='discount_amount',
            field=models.DecimalField(decimal_places=0, default=0, help_text='Discount applied', max_digits=10),
        ),
        migrations.AlterField(
            model_name='expense',
            name='amount',
            field=models.DecimalField(decimal_places=0, help_text='Expense amount', max_digits=10),
        ),
    ]
