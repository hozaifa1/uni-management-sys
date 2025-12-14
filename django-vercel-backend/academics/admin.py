from django.contrib import admin
from .models import Subject, Exam, Result


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """
    Subject Admin
    """
    list_display = ['code', 'name', 'course', 'total_marks']
    list_filter = ['course']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']
    list_select_related = ['course']
    
    fieldsets = (
        ('Subject Information', {
            'fields': ('name', 'code', 'course', 'total_marks')
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


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    """
    Exam Admin
    """
    list_display = ['name', 'exam_type', 'course', 'intake', 'semester', 'session', 'exam_date', 'total_marks']
    list_filter = ['exam_type', 'course', 'intake', 'semester', 'session', 'exam_date']
    search_fields = ['name', 'description']
    ordering = ['-exam_date']
    
    fieldsets = (
        ('Exam Information', {
            'fields': ('name', 'exam_type', 'exam_date', 'total_marks')
        }),
        ('Course/Intake/Semester/Session', {
            'fields': ('course', 'intake', 'semester', 'session')
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


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    """
    Result Admin
    """
    list_display = [
        'get_student_name',
        'get_student_id',
        'exam',
        'subject',
        'marks_obtained',
        'get_grade',
        'get_percentage'
    ]
    list_filter = ['exam', 'subject', 'exam__exam_date']
    search_fields = [
        'student__student_id',
        'student__user__first_name',
        'student__user__last_name',
        'exam__name',
        'subject__name'
    ]
    ordering = ['-exam__exam_date', 'student__student_id']
    list_select_related = ['student', 'student__user', 'exam', 'subject']
    
    fieldsets = (
        ('Result Information', {
            'fields': ('student', 'exam', 'subject')
        }),
        ('Marks', {
            'fields': ('marks_obtained', 'remarks')
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
    
    def get_grade(self, obj):
        return obj.grade
    get_grade.short_description = 'Grade'
    
    def get_percentage(self, obj):
        return f"{obj.get_percentage():.2f}%"
    get_percentage.short_description = 'Percentage'
