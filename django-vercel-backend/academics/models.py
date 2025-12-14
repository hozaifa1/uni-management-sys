from django.db import models


class Subject(models.Model):
    """
    Subject model for different courses
    """
    
    name = models.CharField(
        max_length=200,
        help_text='Subject name (e.g., Mathematics, Physics)'
    )
    
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text='Unique subject code (e.g., MATH101)'
    )
    
    course = models.ForeignKey(
        'students.Course',
        on_delete=models.CASCADE,
        related_name='subjects',
        help_text='Associated course'
    )
    
    total_marks = models.PositiveIntegerField(
        default=100,
        help_text='Total marks for this subject'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Subject description'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Exam(models.Model):
    """
    Exam model for different examinations
    """
    
    EXAM_TYPE_CHOICES = [
        ('midterm', 'Mid Term'),
        ('final', 'Final Exam'),
        ('ssc', 'SSC Exam'),
        ('hsc', 'HSC Exam'),
        ('monthly', 'Monthly Test'),
    ]
    
    name = models.CharField(
        max_length=200,
        help_text='Exam name'
    )
    
    exam_type = models.CharField(
        max_length=20,
        choices=EXAM_TYPE_CHOICES,
        help_text='Type of examination'
    )
    
    batch = models.ForeignKey(
        'students.Batch',
        on_delete=models.CASCADE,
        related_name='exams',
        help_text='Batch taking this exam'
    )
    
    exam_date = models.DateField(
        help_text='Exam date'
    )
    
    total_marks = models.PositiveIntegerField(
        default=100,
        help_text='Total marks for this exam'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Exam description'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-exam_date']
        verbose_name = 'Exam'
        verbose_name_plural = 'Exams'
    
    def __str__(self):
        return f"{self.name} - {self.batch.name}"


class Result(models.Model):
    """
    Result model storing student exam results
    """
    
    student = models.ForeignKey(
        'accounts.Student',
        on_delete=models.CASCADE,
        related_name='results',
        help_text='Student'
    )
    
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='results',
        help_text='Exam'
    )
    
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='results',
        help_text='Subject'
    )
    
    marks_obtained = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Marks obtained by student'
    )
    
    remarks = models.TextField(
        blank=True,
        null=True,
        help_text='Additional remarks'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-exam__exam_date', 'student']
        verbose_name = 'Result'
        verbose_name_plural = 'Results'
        unique_together = ['student', 'exam', 'subject']
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.exam.name} - {self.subject.name}"
    
    @property
    def grade(self):
        """
        Calculate grade based on marks obtained
        """
        return self.calculate_grade()
    
    def calculate_grade(self):
        """
        Calculate grade based on percentage
        """
        # Calculate percentage based on subject's total marks
        percentage = (self.marks_obtained / self.subject.total_marks) * 100
        
        if percentage >= 80:
            return 'A+'
        elif percentage >= 70:
            return 'A'
        elif percentage >= 60:
            return 'A-'
        elif percentage >= 50:
            return 'B'
        elif percentage >= 40:
            return 'C'
        elif percentage >= 33:
            return 'D'
        else:
            return 'F'
    
    def get_percentage(self):
        """
        Calculate percentage
        """
        return (self.marks_obtained / self.subject.total_marks) * 100
