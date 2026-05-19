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
        ('tuition', 'Tuition Fee'),
        ('application_fee', 'Application Fee'),
        ('admission_fee', 'Admission Fee'),
        ('mt_exam_fee', 'Midterm Exam Fee'),
        ('nu_exam_fee', 'NU Exam Fee'),
        ('semester_fee', 'Semester Fee'),
        ('library_deposit', 'Library Deposit'),
        ('library_fine', 'Library Fine'),
        ('lab_fee', 'Lab Fee'),
        ('fine', 'Fine'),
        ('other', 'Other'),
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

    semester = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Semester this payment was recorded against (e.g. "8th Sem")',
    )

    late_fine = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=0,
        help_text='Per-slot late payment fine',
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
            models.Index(fields=['fee_type']),
        ]

    def __str__(self) -> str:
        return f"{self.student.user.get_full_name()} - {self.amount_paid} on {self.payment_date}"

    def net_amount(self):
        """Net amount after discount."""
        return self.amount_paid - self.discount_amount


class ExpenseCategory(models.Model):
    """
    User-extensible expense category.

    Replaces the legacy hard-coded EXPENSE_TYPE_CHOICES. `kind` is a coarse
    grouping for UI colors/filters; `name` is the display label and is unique.
    """

    KIND_CHOICES = [
        ('salary', 'Salary'),
        ('rent', 'Rent'),
        ('utility', 'Utility'),
        ('food', 'Food'),
        ('conveyance', 'Conveyance'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=100, unique=True)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='other')
    default_amount = models.DecimalField(
        max_digits=12, decimal_places=0, default=0,
        help_text='Suggested amount when creating schedules/expenses',
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['kind', 'name']
        verbose_name = 'Expense Category'
        verbose_name_plural = 'Expense Categories'
        indexes = [models.Index(fields=['kind'])]

    def __str__(self) -> str:
        return self.name


class ExpenseSchedule(models.Model):
    """
    Recurring expense obligation (the 'payable' rule).

    Example: 'Campus Rent: ৳80,000/month from 2026-01-01 until null'.
    Actual outflows live in Expense; this model only describes what is
    expected to be paid.
    """

    FREQUENCY_CHOICES = [
        ('monthly', 'Monthly'),
        ('weekly', 'Weekly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
        ('one_time', 'One-time'),
    ]

    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='schedules',
    )
    payee = models.CharField(
        max_length=200, blank=True,
        help_text='Recipient name (e.g. teacher name, landlord, utility provider)',
    )
    amount_per_period = models.DecimalField(max_digits=12, decimal_places=0)
    frequency = models.CharField(
        max_length=20, choices=FREQUENCY_CHOICES, default='monthly',
    )
    start_date = models.DateField(help_text='When this obligation begins')
    end_date = models.DateField(
        blank=True, null=True,
        help_text='Continue until this date (null = ongoing)',
    )
    day_of_period = models.PositiveSmallIntegerField(
        blank=True, null=True,
        help_text='Day of month/week when payment is due (optional)',
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'payee']
        verbose_name = 'Expense Schedule'
        verbose_name_plural = 'Expense Schedules'
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['frequency']),
        ]

    def __str__(self) -> str:
        payee = f" - {self.payee}" if self.payee else ""
        return f"{self.category.name}{payee} ({self.get_frequency_display()})"

    def periods_elapsed(self, as_of=None) -> int:
        """
        Number of periods that have started between start_date and as_of.

        A 'monthly' schedule starting 2026-01-15 has had 1 period as of
        2026-01-15, 2 as of 2026-02-15, etc. Capped by end_date if set.
        """
        from datetime import date as _date
        if as_of is None:
            as_of = _date.today()
        if not self.is_active or self.start_date > as_of:
            return 0
        anchor = self.end_date if (self.end_date and self.end_date < as_of) else as_of

        freq = self.frequency
        if freq == 'one_time':
            return 1 if self.start_date <= anchor else 0
        if freq == 'weekly':
            return ((anchor - self.start_date).days // 7) + 1
        if freq == 'monthly':
            months = (anchor.year - self.start_date.year) * 12 + (anchor.month - self.start_date.month)
            if anchor.day >= self.start_date.day:
                months += 1
            return max(months, 0)
        if freq == 'quarterly':
            months = (anchor.year - self.start_date.year) * 12 + (anchor.month - self.start_date.month)
            return max((months // 3) + (1 if anchor.day >= self.start_date.day else 0), 0)
        if freq == 'yearly':
            years = anchor.year - self.start_date.year
            if (anchor.month, anchor.day) >= (self.start_date.month, self.start_date.day):
                years += 1
            return max(years, 0)
        return 0

    def expected_total(self, as_of=None):
        return self.periods_elapsed(as_of) * int(self.amount_per_period)


class Expense(models.Model):
    """
    Actual outflow record.

    A single payment the institution made. Optionally linked to a
    schedule + period_label so multiple Expenses can pay down the
    same period (partial payments allowed).
    """

    # Legacy enum kept temporarily for backward compatibility during migration.
    EXPENSE_TYPE_CHOICES = [
        ('salary', 'Salary'),
        ('rent', 'Rent'),
        ('utility', 'Utility'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
    ]

    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='expenses',
        null=True, blank=True,
        help_text='New: expense category. Falls back to legacy expense_type when null.',
    )

    schedule = models.ForeignKey(
        ExpenseSchedule,
        on_delete=models.SET_NULL,
        related_name='expenses',
        null=True, blank=True,
        help_text='Links this outflow to a recurring obligation (optional)',
    )

    period_label = models.CharField(
        max_length=40, blank=True,
        help_text='Which period this payment covers, e.g. "May 2026", "Q1 2026"',
    )

    expense_type = models.CharField(
        max_length=20,
        choices=EXPENSE_TYPE_CHOICES,
        blank=True, null=True,
        help_text='[Legacy] Free-form type label. Use category instead.',
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        help_text='Expense amount',
    )

    description = models.TextField(
        blank=True,
        help_text='Expense description',
    )

    expense_date = models.DateField(
        help_text='Date of expense',
    )

    paid_to = models.CharField(
        max_length=200,
        blank=True,
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
        indexes = [
            models.Index(fields=['expense_date']),
            models.Index(fields=['category', 'expense_date']),
            models.Index(fields=['schedule', 'period_label']),
        ]

    def __str__(self) -> str:
        label = self.category.name if self.category_id else (self.get_expense_type_display() or 'Expense')
        return f"{label} - {self.amount} on {self.expense_date}"


class SemesterSummary(models.Model):
    """
    Per-student-per-semester financial + attendance summary.

    Mirrors the Excel 'Xth Sem' sheets: opening balance, total received,
    closing balance, cumulative dues, attendance, fines. The system reads
    this as the source of truth for dues; it does not auto-compute them.
    """

    student = models.ForeignKey(
        'accounts.Student',
        on_delete=models.PROTECT,
        related_name='semester_summaries',
    )
    semester = models.CharField(max_length=20, help_text='e.g. "8th Sem"')
    program = models.CharField(max_length=10, blank=True, null=True)
    intake_batch = models.CharField(max_length=20, blank=True, null=True)

    total_program_fee = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    semester_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    monthly_tuition_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    fee_waiver = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    opening_balance = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    semester_total_received = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    closing_balance = models.DecimalField(
        max_digits=12, decimal_places=0, default=0,
        help_text='Negative = overpaid, positive = dues remaining',
    )
    cumulative_received_after_semester = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cumulative_due_after_semester = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    receivable_at_mt_exam = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_receivable_end_of_semester = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_payable_at_form_fillup = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    midterm_1_date = models.DateField(blank=True, null=True)
    midterm_1_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    midterm_2_date = models.DateField(blank=True, null=True)
    midterm_2_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    midterm_absent_fine = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    nu_exam_date = models.DateField(blank=True, null=True)
    nu_exam_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    library_deposit = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    library_fine = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    classes_present = models.IntegerField(blank=True, null=True)
    classes_absent = models.IntegerField(blank=True, null=True)
    percent_absent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    absence_fine = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    late_payment_fine_total = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    remarks = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['student', 'semester']
        verbose_name = 'Semester Summary'
        verbose_name_plural = 'Semester Summaries'
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'semester'],
                name='uniq_student_semester_summary',
            ),
        ]
        indexes = [
            models.Index(fields=['program', 'intake_batch', 'semester']),
        ]

    def __str__(self) -> str:
        return f"{self.student.roll_number or self.student.student_id} - {self.semester}"


class AdmissionRecord(models.Model):
    """
    Snapshot of the admission sheet row for a student.

    Stores application + admission fee details, references, and waivers
    captured at admission time.
    """

    student = models.OneToOneField(
        'accounts.Student',
        on_delete=models.PROTECT,
        related_name='admission_record',
    )
    program = models.CharField(max_length=10, blank=True, null=True)
    intake_batch = models.CharField(max_length=20, blank=True, null=True)
    roll_number = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    registration_number = models.CharField(max_length=50, blank=True, null=True)

    application_date = models.DateField(blank=True, null=True)
    application_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    admission_date = models.DateField(blank=True, null=True)
    admission_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    total_program_fee = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    semester_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    monthly_tuition_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    semester_fee_waived = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    tuition_fee_waived = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    total_fees_waived = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    contact_number = models.CharField(max_length=30, blank=True, null=True)
    father_contact = models.CharField(max_length=30, blank=True, null=True)
    reference = models.CharField(max_length=255, blank=True, null=True)
    income_total = models.DecimalField(max_digits=12, decimal_places=0, blank=True, null=True)
    pin_no = models.CharField(max_length=50, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-admission_date']
        verbose_name = 'Admission Record'
        verbose_name_plural = 'Admission Records'

    def __str__(self) -> str:
        return f"{self.roll_number or self.student_id} - admission"


class DailyAccount(models.Model):
    """
    Daily cashbook entry (replaces 'Daily account YYYY.xlsx' sheets).

    Each row is one line in the institution's daily cash ledger.
    """

    source_file = models.CharField(max_length=255, blank=True, null=True)
    sheet = models.CharField(max_length=100, blank=True, null=True)
    year_group = models.CharField(max_length=10, blank=True, null=True)
    date = models.DateField(blank=True, null=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    exam_fee = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cash_receive = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cash_expense = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cash_balance = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'id']
        verbose_name = 'Daily Account Entry'
        verbose_name_plural = 'Daily Account Entries'
        indexes = [
            models.Index(fields=['year_group']),
            models.Index(fields=['date']),
        ]

    def __str__(self) -> str:
        return f"{self.date} - {(self.description or '')[:40]}"


class FeeStructure(models.Model):
    """
    Reference fee structure for a program (e.g. THM, BBA).

    Rows describe each fee item (admission, tuition, semester, midterm),
    its unit amount and total. Used as a read-only reference document, not
    for computing dues.
    """

    program = models.CharField(max_length=20, help_text='Program code (e.g. THM, BBA)')
    item = models.CharField(max_length=100, help_text='Fee item name')
    unit_amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    description = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['program', 'order', 'id']
        verbose_name = 'Fee Structure Item'
        verbose_name_plural = 'Fee Structure Items'
        indexes = [models.Index(fields=['program'])]

    def __str__(self) -> str:
        return f"{self.program} - {self.item}"
