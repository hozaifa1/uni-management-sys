from django.contrib import admin
from django.db.models import Sum
from .models import FeeStructure, Payment, Expense


@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    """
    Fee Structure Admin
    """
    list_display = ['batch', 'fee_type', 'amount', 'due_date']
    list_filter = ['fee_type', 'batch', 'due_date']
    search_fields = ['batch__name', 'description']
    ordering = ['-due_date']
    list_select_related = ['batch']
    
    fieldsets = (
        ('Fee Information', {
            'fields': ('batch', 'fee_type', 'amount', 'due_date')
        }),
        ('Description', {
            'fields': ('description',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """
    Payment Admin
    """
    list_display = [
        'get_student_name',
        'get_student_id',
        'amount_paid',
        'discount_amount',
        'net_amount',
        'payment_date',
        'payment_method',
        'transaction_id'
    ]
    list_filter = ['payment_method', 'payment_date', 'fee_structure__fee_type']
    search_fields = [
        'student__student_id',
        'student__user__first_name',
        'student__user__last_name',
        'transaction_id'
    ]
    ordering = ['-payment_date']
    list_select_related = ['student', 'student__user', 'fee_structure']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('student', 'fee_structure', 'payment_date')
        }),
        ('Amount Details', {
            'fields': ('amount_paid', 'discount_amount', 'payment_method', 'transaction_id')
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
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
    Expense Admin
    """
    list_display = [
        'expense_type',
        'amount',
        'paid_to',
        'expense_date',
        'get_created_by'
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
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def get_created_by(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'N/A'
    get_created_by.short_description = 'Created By'
    get_created_by.admin_order_field = 'created_by__first_name'
    
    def save_model(self, request, obj, form, change):
        """Automatically set created_by to current user"""
        if not change:  # Only on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
