"""
Drop FeeStructure model and the Payment.fee_structure FK.

The app no longer tracks expected fees or dues — only actual payments made.
Also tightens Payment.student to on_delete=PROTECT so payment history
cannot vanish via a CASCADE delete.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0005_remove_money_decimal_places'),
        ('accounts', '0010_clear_seeded_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='payment',
            name='fee_structure',
        ),
        migrations.AlterField(
            model_name='payment',
            name='student',
            field=models.ForeignKey(
                help_text='Student making the payment',
                on_delete=models.PROTECT,
                related_name='payments',
                to='accounts.student',
            ),
        ),
        migrations.DeleteModel(
            name='FeeStructure',
        ),
    ]
