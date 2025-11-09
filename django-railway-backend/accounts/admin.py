from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Student


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User Admin
    """
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone_number']
    ordering = ['-date_joined']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_number', 'address', 'profile_picture')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'phone_number', 'address', 'email', 'first_name', 'last_name')
        }),
    )


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """
    Student Admin
    """
    list_display = [
        'student_id', 
        'get_full_name', 
        'batch', 
        'admission_date', 
        'blood_group',
        'get_phone'
    ]
    list_filter = ['batch', 'admission_date', 'blood_group']
    search_fields = [
        'student_id', 
        'user__username', 
        'user__first_name', 
        'user__last_name',
        'user__email',
        'guardian_name'
    ]
    readonly_fields = ['student_id', 'created_at', 'updated_at']
    ordering = ['-admission_date']
    list_select_related = ['user', 'batch']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student_id', 'user', 'batch', 'admission_date')
        }),
        ('Personal Details', {
            'fields': ('date_of_birth', 'blood_group', 'photo')
        }),
        ('Guardian Information', {
            'fields': ('guardian_name', 'guardian_phone')
        }),
        ('Address', {
            'fields': ('present_address', 'permanent_address')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Full Name'
    get_full_name.admin_order_field = 'user__first_name'
    
    def get_phone(self, obj):
        return obj.user.phone_number
    get_phone.short_description = 'Phone'
