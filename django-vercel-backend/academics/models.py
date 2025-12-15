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
    Exam model for different examinations.
    Connected to course/intake/semester/session instead of batch.
    """
    
    EXAM_TYPE_CHOICES = [
        ('incourse_1st', '1st Incourse'),
        ('incourse_2nd', '2nd Incourse'),
        ('final', 'Final Exam'),
    ]

    COURSE_CHOICES = [
        ('BBA', 'BBA'),
        ('MBA', 'MBA'),
        ('CSE', 'CSE'),
        ('THM', 'THM'),
    ]

    INTAKE_CHOICES = [
        ('1st', '1st'),
        ('2nd', '2nd'),
        ('9th', '9th'),
        ('10th', '10th'),
        ('15th', '15th'),
        ('16th', '16th'),
        ('17th', '17th'),
        ('18th', '18th'),
        ('19th', '19th'),
        ('20th', '20th'),
    ]

    SEMESTER_CHOICES = [
        ('1st', '1st'),
        ('2nd', '2nd'),
        ('3rd', '3rd'),
        ('4th', '4th'),
        ('5th', '5th'),
        ('6th', '6th'),
        ('7th', '7th'),
        ('8th', '8th'),
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
    
    course = models.CharField(
        max_length=10,
        choices=COURSE_CHOICES,
        default='BBA',
        help_text='Course (BBA, MBA, CSE, THM)'
    )

    intake = models.CharField(
        max_length=10,
        choices=INTAKE_CHOICES,
        default='15th',
        help_text='Intake number'
    )

    semester = models.CharField(
        max_length=10,
        choices=SEMESTER_CHOICES,
        default='1st',
        help_text='Semester'
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
        indexes = [
            models.Index(fields=['course']),
            models.Index(fields=['intake']),
            models.Index(fields=['semester']),
            models.Index(fields=['exam_date']),
            models.Index(fields=['course', 'intake', 'semester']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.course} {self.intake} Intake - {self.semester} Sem"


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

    teacher_comment = models.TextField(
        blank=True,
        null=True,
        help_text='Teacher comment for this result'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-exam__exam_date', 'student']
        verbose_name = 'Result'
        verbose_name_plural = 'Results'
        unique_together = ['student', 'exam', 'subject']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['exam']),
            models.Index(fields=['subject']),
            models.Index(fields=['student', 'exam']),
        ]
    
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
