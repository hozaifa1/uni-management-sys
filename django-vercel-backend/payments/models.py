from django.db import models
from django.conf import settings


class FeeStructure(models.Model):
    """
    Fee structure for different course/intake/semester/session combinations
    """
    
    FEE_TYPE_CHOICES = [
        ('tuition', 'Tuition Fee'),
        ('exam', 'Examination Fee'),
        ('admission', 'Admission Fee'),
    ]

    COURSE_CHOICES = [
        ('BBA', 'BBA'),
        ('MBA', 'MBA'),
        ('CSE', 'CSE'),
        ('THM', 'THM'),
    ]

    INTAKE_CHOICES = [
        ('1st', '1st'),
        ('2nd', '2nd'),
        ('9th', '9th'),
        ('10th', '10th'),
        ('15th', '15th'),
        ('16th', '16th'),
        ('17th', '17th'),
        ('18th', '18th'),
        ('19th', '19th'),
        ('20th', '20th'),
    ]

    SEMESTER_CHOICES = [
        ('1st', '1st'),
        ('2nd', '2nd'),
        ('3rd', '3rd'),
        ('4th', '4th'),
        ('5th', '5th'),
        ('6th', '6th'),
        ('7th', '7th'),
        ('8th', '8th'),
    ]
    
    course = models.CharField(
        max_length=10,
        choices=COURSE_CHOICES,
        default='BBA',
        help_text='Course (BBA, MBA, CSE, THM)'
    )

    intake = models.CharField(
        max_length=10,
        choices=INTAKE_CHOICES,
        default='15th',
        help_text='Intake number'
    )

    semester = models.CharField(
        max_length=10,
        choices=SEMESTER_CHOICES,
        default='1st',
        help_text='Semester'
    )

    session = models.CharField(
        max_length=20,
        default='2024-2025',
        help_text='Academic session (e.g., 2024-2025)'
    )
    
    fee_type = models.CharField(
        max_length=20,
        choices=FEE_TYPE_CHOICES,
        help_text='Type of fee'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Fee amount'
    )
    
    due_date = models.DateField(
        help_text='Payment due date'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Additional fee details'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-due_date']
        verbose_name = 'Fee Structure'
        verbose_name_plural = 'Fee Structures'
    
    def __str__(self):
        return f"{self.course} {self.intake} - {self.semester} Sem - {self.get_fee_type_display()} - ${self.amount}"


class Payment(models.Model):
    """
    Payment records for student fees
    """
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('online', 'Online Payment'),
    ]
    
    student = models.ForeignKey(
        'accounts.Student',
        on_delete=models.CASCADE,
        related_name='payments',
        help_text='Student making the payment'
    )
    
    fee_structure = models.ForeignKey(
        FeeStructure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        help_text='Associated fee structure'
    )
    
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Amount paid'
    )
    
    payment_date = models.DateField(
        help_text='Date of payment'
    )
    
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='cash',
        help_text='Payment method used'
    )
    
    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Transaction reference ID'
    )
    
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text='Discount applied'
    )
    
    remarks = models.TextField(
        blank=True,
        null=True,
        help_text='Additional remarks'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-payment_date']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - ${self.amount_paid} on {self.payment_date}"
    
    def calculate_due_amount(self):
        """
        Calculate due amount based on fee structure
        """
        if self.fee_structure:
            total_paid = Payment.objects.filter(
                student=self.student,
                fee_structure=self.fee_structure
            ).aggregate(
                total=models.Sum('amount_paid')
            )['total'] or 0
            
            due = self.fee_structure.amount - total_paid
            return max(due, 0)
        return 0
    
    def net_amount(self):
        """
        Calculate net amount after discount
        """
        return self.amount_paid - self.discount_amount


class Expense(models.Model):
    """
    Expense tracking for institution
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
        help_text='Type of expense'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Expense amount'
    )
    
    description = models.TextField(
        help_text='Expense description'
    )
    
    expense_date = models.DateField(
        help_text='Date of expense'
    )
    
    paid_to = models.CharField(
        max_length=200,
        help_text='Payee name'
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses_created',
        help_text='User who recorded this expense'
    )
    
    receipt_file = models.FileField(
        upload_to='expenses/receipts/',
        blank=True,
        null=True,
        help_text='Receipt file (optional)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-expense_date']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
    
    def __str__(self):
        return f"{self.get_expense_type_display()} - ${self.amount} on {self.expense_date}"
