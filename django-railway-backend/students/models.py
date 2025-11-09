from django.db import models
from django.core.validators import RegexValidator
from django.conf import settings


class Course(models.Model):
    """
    Course model representing different courses offered (e.g., HSC, SSC, etc.)
    """
    
    name = models.CharField(
        max_length=200,
        help_text='Course name (e.g., Higher Secondary Certificate)'
    )
    
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text='Unique course code (e.g., HSC, SSC)'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Detailed course description'
    )
    
    duration_months = models.PositiveIntegerField(
        help_text='Course duration in months'
    )
    
    fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Total course fee'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Is this course currently offered?'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Batch(models.Model):
    """
    Batch model representing a group of students in a course
    """
    
    name = models.CharField(
        max_length=100,
        help_text='Batch name (e.g., HSC 2024)'
    )
    
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='batches',
        help_text='Associated course'
    )
    
    start_date = models.DateField(
        help_text='Batch start date'
    )
    
    end_date = models.DateField(
        help_text='Expected batch end date'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Is this batch currently active?'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_date']
        verbose_name = 'Batch'
        verbose_name_plural = 'Batches'
    
    def __str__(self):
        return f"{self.name} ({self.course.code})"


class Enrollment(models.Model):
    """
    Enrollment model linking students to batches
    """
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
    ]
    
    student = models.ForeignKey(
        'accounts.Student',
        on_delete=models.CASCADE,
        related_name='enrollments',
        help_text='Enrolled student'
    )
    
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name='enrollments',
        help_text='Enrolled batch'
    )
    
    enrollment_date = models.DateField(
        help_text='Date of enrollment'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text='Current enrollment status'
    )
    
    remarks = models.TextField(
        blank=True,
        null=True,
        help_text='Additional remarks'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-enrollment_date']
        verbose_name = 'Enrollment'
        verbose_name_plural = 'Enrollments'
        unique_together = ['student', 'batch']
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.batch.name}"


class Teacher(models.Model):
    """
    Teacher profile model linked to User model.
    Stores teacher-specific information.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        help_text='Link to User account'
    )
    
    employee_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        help_text='Auto-generated employee ID'
    )
    
    subjects = models.TextField(
        help_text='Subjects taught (comma-separated)'
    )
    
    qualification = models.CharField(
        max_length=200,
        help_text='Educational qualifications'
    )
    
    joining_date = models.DateField(
        help_text='Date of joining'
    )
    
    monthly_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Monthly salary amount'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Is the teacher currently employed?'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-joining_date']
        verbose_name = 'Teacher'
        verbose_name_plural = 'Teachers'
    
    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name()}"
    
    def save(self, *args, **kwargs):
        """Auto-generate employee_id if not exists"""
        if not self.employee_id:
            # Get the last teacher ID
            from datetime import datetime
            year = datetime.now().year
            last_teacher = Teacher.objects.filter(
                employee_id__startswith=f'TCH{year}'
            ).order_by('employee_id').last()
            
            if last_teacher:
                # Extract the number and increment
                last_number = int(last_teacher.employee_id[-3:])
                new_number = last_number + 1
            else:
                new_number = 1
            
            self.employee_id = f'TCH{year}{new_number:03d}'
        
        super().save(*args, **kwargs)
