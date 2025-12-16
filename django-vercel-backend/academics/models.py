from django.db import models


class MajorMinorOption(models.Model):
    """
    Available major/minor specializations for courses like BBA and MBA.
    """
    OPTION_TYPE_CHOICES = [
        ('major', 'Major'),
    ]
    
    COURSE_CHOICES = [
        ('BBA', 'BBA'),
        ('MBA', 'MBA'),
    ]
    
    course = models.CharField(
        max_length=10,
        choices=COURSE_CHOICES,
        help_text='Course this major belongs to'
    )
    
    name = models.CharField(
        max_length=100,
        help_text='Major name (e.g., Marketing, Finance & Banking)'
    )
    
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text='Unique code for this major (e.g., BBA_MKT, MBA_FIN)'
    )
    
    option_type = models.CharField(
        max_length=10,
        choices=OPTION_TYPE_CHOICES,
        default='major',
        help_text='Type of specialization'
    )
    
    available_from_semester = models.CharField(
        max_length=10,
        default='7th',
        help_text='Semester when students can choose this major'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Description of this major'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Is this major currently available?'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['course', 'name']
        verbose_name = 'Major Option'
        verbose_name_plural = 'Major Options'
        unique_together = ['course', 'name']
    
    def __str__(self):
        return f"{self.course} - {self.name}"


class Subject(models.Model):
    """
    Subject model for different courses with semester and type information.
    """
    
    SUBJECT_TYPE_CHOICES = [
        ('core', 'Core/Compulsory'),
        ('major', 'Major'),
        ('elective', 'Elective'),
        ('lab', 'Laboratory'),
        ('project', 'Project/Internship'),
        ('viva', 'Viva Voce'),
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
    
    COURSE_CHOICES = [
        ('BBA', 'BBA'),
        ('MBA', 'MBA'),
        ('CSE', 'CSE'),
        ('THM', 'THM'),
    ]
    
    name = models.CharField(
        max_length=200,
        help_text='Subject name (e.g., Introduction to Business)'
    )
    
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text='Unique subject code (e.g., 510101)'
    )
    
    course = models.ForeignKey(
        'students.Course',
        on_delete=models.CASCADE,
        related_name='subjects',
        help_text='Associated course',
        null=True,
        blank=True
    )
    
    course_code = models.CharField(
        max_length=10,
        choices=COURSE_CHOICES,
        default='BBA',
        help_text='Course code (BBA, MBA, CSE, THM)'
    )
    
    semester = models.CharField(
        max_length=10,
        choices=SEMESTER_CHOICES,
        default='1st',
        help_text='Semester this subject belongs to'
    )
    
    subject_type = models.CharField(
        max_length=20,
        choices=SUBJECT_TYPE_CHOICES,
        default='core',
        help_text='Type of subject'
    )
    
    major = models.ForeignKey(
        MajorMinorOption,
        on_delete=models.SET_NULL,
        related_name='subjects',
        null=True,
        blank=True,
        help_text='Required major for this subject (if major-specific)'
    )
    
    credit_hours = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=3.0,
        help_text='Credit hours for this subject'
    )
    
    total_marks = models.PositiveIntegerField(
        default=100,
        help_text='Total marks for this subject'
    )
    
    has_practical = models.BooleanField(
        default=False,
        help_text='Whether this subject has a practical component'
    )
    
    practical_marks = models.PositiveIntegerField(
        default=0,
        help_text='Marks allocated for practical (if any)'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Subject description'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Is this subject currently offered?'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['course_code', 'semester', 'code']
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        indexes = [
            models.Index(fields=['course_code']),
            models.Index(fields=['semester']),
            models.Index(fields=['subject_type']),
            models.Index(fields=['course_code', 'semester']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Exam(models.Model):
    """
    Exam model for different examinations.
    Each exam is linked to a specific subject.
    Students across different intakes in the same course/semester/subject share the same exams.
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
        help_text='Exam name (format: Course - Semester - Subject - Type)'
    )
    
    exam_type = models.CharField(
        max_length=20,
        choices=EXAM_TYPE_CHOICES,
        help_text='Type of examination'
    )
    
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='exams',
        help_text='Subject this exam belongs to',
        null=True,
        blank=True
    )
    
    course = models.CharField(
        max_length=10,
        choices=COURSE_CHOICES,
        default='BBA',
        help_text='Course (BBA, MBA, CSE, THM)'
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
        ordering = ['-exam_date', 'subject__name']
        verbose_name = 'Exam'
        verbose_name_plural = 'Exams'
        indexes = [
            models.Index(fields=['course']),
            models.Index(fields=['semester']),
            models.Index(fields=['subject']),
            models.Index(fields=['exam_date']),
            models.Index(fields=['course', 'semester']),
            models.Index(fields=['course', 'semester', 'subject']),
        ]
        unique_together = ['course', 'semester', 'subject', 'exam_type']
    
    def __str__(self):
        subject_name = self.subject.name if self.subject else 'No Subject'
        return f"{self.course} - {self.semester} Sem - {subject_name} - {self.get_exam_type_display()}"


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
        Calculate grade based on percentage using National University grading scale.
        """
        percentage = (self.marks_obtained / self.subject.total_marks) * 100
        
        # NU Grading Scale
        if percentage >= 80:
            return 'A+'
        elif percentage >= 75:
            return 'A'
        elif percentage >= 70:
            return 'A-'
        elif percentage >= 65:
            return 'B+'
        elif percentage >= 60:
            return 'B'
        elif percentage >= 55:
            return 'B-'
        elif percentage >= 50:
            return 'C+'
        elif percentage >= 45:
            return 'C'
        elif percentage >= 40:
            return 'D'
        else:
            return 'F'
    
    def get_grade_point(self):
        """
        Get grade point based on National University 4.0 scale.
        """
        percentage = (self.marks_obtained / self.subject.total_marks) * 100
        
        if percentage >= 80:
            return 4.00
        elif percentage >= 75:
            return 3.75
        elif percentage >= 70:
            return 3.50
        elif percentage >= 65:
            return 3.25
        elif percentage >= 60:
            return 3.00
        elif percentage >= 55:
            return 2.75
        elif percentage >= 50:
            return 2.50
        elif percentage >= 45:
            return 2.25
        elif percentage >= 40:
            return 2.00
        else:
            return 0.00
    
    def get_percentage(self):
        """
        Calculate percentage
        """
        return (self.marks_obtained / self.subject.total_marks) * 100
