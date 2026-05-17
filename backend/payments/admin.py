from django.contrib import admin

from .models import Expense, Payment


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
        'payment_regularity',
        'transaction_id',
    ]
    list_filter = ['payment_method', 'payment_date', 'fee_type']
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
                'amount_paid', 'discount_amount', 'payment_method',
                'transaction_id', 'payment_regularity',
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
        'expense_type',
        'amount',
        'paid_to',
        'expense_date',
        'get_created_by',
    ]
    list_filter = ['expense_type', 'expense_date']
    search_fields = ['description', 'paid_to']
    ordering = ['-expense_date']
    list_select_related = ['created_by']

    fieldsets = (
        ('Expense Information', {
            'fields': ('expense_type', 'amount', 'expense_date', 'paid_to')
        }),
        ('Details', {
            'fields': ('description', 'receipt_file')
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
