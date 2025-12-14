from django.contrib import admin
from .models import Course, Batch, Enrollment, Teacher


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """
    Course Admin
    """
    list_display = ['code', 'name', 'duration_months', 'fee', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']
    
    fieldsets = (
        ('Course Information', {
            'fields': ('name', 'code', 'description')
        }),
        ('Course Details', {
            'fields': ('duration_months', 'fee', 'is_active')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    """
    Batch Admin
    """
    list_display = ['name', 'course', 'start_date', 'end_date', 'is_active', 'student_count']
    list_filter = ['course', 'is_active', 'start_date']
    search_fields = ['name', 'course__name', 'course__code']
    ordering = ['-start_date']
    list_select_related = ['course']
    
    fieldsets = (
        ('Batch Information', {
            'fields': ('name', 'course')
        }),
        ('Duration', {
            'fields': ('start_date', 'end_date', 'is_active')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def student_count(self, obj):
        return obj.students.count()
    student_count.short_description = 'Students'


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """
    Enrollment Admin
    """
    list_display = ['get_student_name', 'batch', 'enrollment_date', 'status']
    list_filter = ['status', 'batch', 'enrollment_date']
    search_fields = [
        'student__student_id',
        'student__user__first_name',
        'student__user__last_name',
        'batch__name'
    ]
    ordering = ['-enrollment_date']
    list_select_related = ['student', 'student__user', 'batch']
    
    fieldsets = (
        ('Enrollment Information', {
            'fields': ('student', 'batch', 'enrollment_date')
        }),
        ('Status', {
            'fields': ('status', 'remarks')
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


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    """
    Teacher Admin
    """
    list_display = [
        'employee_id',
        'get_full_name',
        'get_email',
        'subjects',
        'monthly_salary',
        'joining_date',
        'is_active'
    ]
    list_filter = ['is_active', 'joining_date']
    search_fields = [
        'employee_id',
        'user__username',
        'user__first_name',
        'user__last_name',
        'user__email',
        'subjects'
    ]
    ordering = ['-joining_date']
    list_select_related = ['user']
    readonly_fields = ['employee_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Teacher Information', {
            'fields': ('employee_id', 'user', 'joining_date', 'is_active')
        }),
        ('Professional Details', {
            'fields': ('subjects', 'qualification', 'monthly_salary')
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
    
    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'
    get_email.admin_order_field = 'user__email'
