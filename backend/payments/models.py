from django.db import models
from django.conf import settings


class Payment(models.Model):
    """
    Payment records.

    Stores only what was actually paid (who paid what, when, how).
    The system does NOT track "expected" dues or fee structures —
    payments are recorded as they occur.
    """

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('online', 'Online Payment'),
    ]

    REGULARITY_CHOICES = [
        ('regular', 'Regular'),
        ('irregular', 'Irregular'),
    ]

    FEE_TYPE_CHOICES = [
        ('lab_fee', 'Lab Fee'),
        ('library_fee', 'Library Fee'),
        ('fine', 'Fine'),
        ('semester_fee', 'Semester Fee'),
        ('tuition_fee', 'Tuition Fee'),
        ('admission_fee', 'Admission Fee'),
        ('exam_fee', 'Exam Fee'),
    ]

    student = models.ForeignKey(
        'accounts.Student',
        on_delete=models.PROTECT,
        related_name='payments',
        help_text='Student making the payment',
    )

    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        help_text='Amount paid',
    )

    payment_date = models.DateField(
        help_text='Date of payment',
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='cash',
        help_text='Payment method used',
    )

    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Transaction reference ID',
    )

    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=0,
        help_text='Discount applied',
    )

    remarks = models.TextField(
        blank=True,
        null=True,
        help_text='Additional remarks',
    )

    payment_regularity = models.CharField(
        max_length=20,
        choices=REGULARITY_CHOICES,
        default='regular',
        help_text='Payment regularity status (Regular/Irregular)',
    )

    fee_type = models.CharField(
        max_length=20,
        choices=FEE_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text='Fee category (free-form label only)',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['payment_date']),
            models.Index(fields=['payment_method']),
            models.Index(fields=['student', 'payment_date']),
        ]

    def __str__(self) -> str:
        return f"{self.student.user.get_full_name()} - {self.amount_paid} on {self.payment_date}"

    def net_amount(self):
        """Net amount after discount."""
        return self.amount_paid - self.discount_amount


class Expense(models.Model):
    """
    Expense tracking for institution.
    """

    EXPENSE_TYPE_CHOICES = [
        ('salary', 'Salary'),
        ('rent', 'Rent'),
        ('utility', 'Utility'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
    ]

    expense_type = models.CharField(
        max_length=20,
        choices=EXPENSE_TYPE_CHOICES,
        help_text='Type of expense',
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        help_text='Expense amount',
    )

    description = models.TextField(
        help_text='Expense description',
    )

    expense_date = models.DateField(
        help_text='Date of expense',
    )

    paid_to = models.CharField(
        max_length=200,
        help_text='Payee name',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses_created',
        help_text='User who recorded this expense',
    )

    receipt_file = models.FileField(
        upload_to='expenses/receipts/',
        blank=True,
        null=True,
        help_text='Receipt file (optional)',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-expense_date']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'

    def __str__(self) -> str:
        return f"{self.get_expense_type_display()} - {self.amount} on {self.expense_date}"
