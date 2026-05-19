from django.contrib import admin

from .models import (
    AdmissionRecord,
    DailyAccount,
    Expense,
    ExpenseCategory,
    ExpenseSchedule,
    FeeStructure,
    Payment,
    SemesterSummary,
)


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'kind', 'default_amount', 'is_active']
    list_filter = ['kind', 'is_active']
    search_fields = ['name']
    ordering = ['kind', 'name']


@admin.register(ExpenseSchedule)
class ExpenseScheduleAdmin(admin.ModelAdmin):
    list_display = ['category', 'payee', 'frequency', 'amount_per_period',
                    'start_date', 'end_date', 'is_active']
    list_filter = ['frequency', 'is_active', 'category__kind']
    search_fields = ['payee', 'category__name']
    list_select_related = ['category']
    ordering = ['category', 'payee']


@admin.register(SemesterSummary)
class SemesterSummaryAdmin(admin.ModelAdmin):
    list_display = ['student', 'semester', 'program', 'intake_batch',
                    'opening_balance', 'semester_total_received',
                    'closing_balance', 'cumulative_due_after_semester']
    list_filter = ['program', 'intake_batch', 'semester']
    search_fields = ['student__roll_number', 'student__full_name']
    list_select_related = ['student']


@admin.register(AdmissionRecord)
class AdmissionRecordAdmin(admin.ModelAdmin):
    list_display = ['roll_number', 'name', 'program', 'intake_batch',
                    'admission_date', 'admission_fee', 'application_fee']
    list_filter = ['program', 'intake_batch']
    search_fields = ['roll_number', 'name', 'registration_number']


@admin.register(DailyAccount)
class DailyAccountAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'cash_receive',
                    'cash_expense', 'cash_balance', 'year_group']
    list_filter = ['year_group']
    search_fields = ['description']
    date_hierarchy = 'date'


@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ['program', 'item', 'unit_amount', 'total_amount', 'order']
    list_filter = ['program']
    ordering = ['program', 'order']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """
    Payment Admin — records of actual payments received.
    """

    list_display = [
        'get_student_name',
        'get_student_id',
        'amount_paid',
        'discount_amount',
        'net_amount',
        'payment_date',
        'payment_method',
        'fee_type',
        'semester',
        'late_fine',
        'payment_regularity',
        'transaction_id',
    ]
    list_filter = ['payment_method', 'payment_date', 'fee_type', 'semester']
    search_fields = [
        'student__student_id',
        'student__user__first_name',
        'student__user__last_name',
        'transaction_id',
    ]
    ordering = ['-payment_date']
    list_select_related = ['student', 'student__user']

    fieldsets = (
        ('Payment Information', {
            'fields': ('student', 'payment_date', 'fee_type')
        }),
        ('Amount Details', {
            'fields': (
                'amount_paid', 'discount_amount', 'late_fine', 'payment_method',
                'transaction_id', 'payment_regularity', 'semester',
            )
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ['created_at', 'updated_at']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()
    get_student_name.short_description = 'Student'
    get_student_name.admin_order_field = 'student__user__first_name'

    def get_student_id(self, obj):
        return obj.student.student_id
    get_student_id.short_description = 'Student ID'
    get_student_id.admin_order_field = 'student__student_id'


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    """
    Expense Admin.
    """

    list_display = [
        'category',
        'amount',
        'paid_to',
        'expense_date',
        'period_label',
        'get_created_by',
    ]
    list_filter = ['category__kind', 'category', 'expense_date']
    search_fields = ['description', 'paid_to', 'period_label', 'category__name']
    ordering = ['-expense_date']
    list_select_related = ['created_by', 'category', 'schedule']

    fieldsets = (
        ('Expense Information', {
            'fields': ('category', 'schedule', 'period_label',
                       'amount', 'expense_date', 'paid_to')
        }),
        ('Details', {
            'fields': ('description', 'receipt_file', 'expense_type')
        }),
        ('System Information', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ['created_at', 'updated_at']

    def get_created_by(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'N/A'
    get_created_by.short_description = 'Created By'
    get_created_by.admin_order_field = 'created_by__first_name'

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
