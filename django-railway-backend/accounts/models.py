from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Supports three roles: Admin, Teacher, and Student.
    """
    
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('TEACHER', 'Teacher'),
        ('STUDENT', 'Student'),
    ]
    
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='STUDENT',
        help_text='User role in the system'
    )
    
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=17,
        blank=True,
        null=True,
        help_text='Contact phone number'
    )
    
    address = models.TextField(
        blank=True,
        null=True,
        help_text='Full address'
    )
    
    profile_picture = models.ImageField(
        upload_to='profiles/',
        blank=True,
        null=True,
        help_text='User profile picture'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Designates whether this user should be treated as active.'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.username


class Student(models.Model):
    """
    Student profile model linked to User model.
    Stores additional student-specific information.
    """
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    user = models.OneToOneField(
        'User',
        on_delete=models.CASCADE,
        related_name='student_profile',
        help_text='Link to User account'
    )
    
    student_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        help_text='Auto-generated student ID'
    )
    
    date_of_birth = models.DateField(
        help_text='Student date of birth'
    )
    
    guardian_name = models.CharField(
        max_length=200,
        help_text="Guardian's full name"
    )
    
    guardian_phone = models.CharField(
        validators=[User.phone_regex],
        max_length=17,
        help_text="Guardian's contact number"
    )
    
    admission_date = models.DateField(
        help_text='Date of admission'
    )
    
    batch = models.ForeignKey(
        'students.Batch',
        on_delete=models.SET_NULL,
        null=True,
        related_name='students',
        help_text='Assigned batch'
    )
    
    photo = models.ImageField(
        upload_to='students/photos/',
        blank=True,
        null=True,
        help_text='Student photograph'
    )
    
    blood_group = models.CharField(
        max_length=3,
        choices=BLOOD_GROUP_CHOICES,
        blank=True,
        null=True,
        help_text='Blood group'
    )
    
    present_address = models.TextField(
        help_text='Current residential address'
    )
    
    permanent_address = models.TextField(
        help_text='Permanent residential address'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-admission_date']
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
    
    def __str__(self):
        return f"{self.student_id} - {self.user.get_full_name()}"
    
    def save(self, *args, **kwargs):
        """Auto-generate student_id if not exists"""
        if not self.student_id:
            # Get the last student ID
            from datetime import datetime
            year = datetime.now().year
            last_student = Student.objects.filter(
                student_id__startswith=f'STU{year}'
            ).order_by('student_id').last()
            
            if last_student:
                # Extract the number and increment
                last_number = int(last_student.student_id[-3:])
                new_number = last_number + 1
            else:
                new_number = 1
            
            self.student_id = f'STU{year}{new_number:03d}'
        
        super().save(*args, **kwargs)
