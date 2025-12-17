from rest_framework import serializers
from .models import MajorMinorOption, Subject, Exam, Result, Attendance


class MajorMinorOptionSerializer(serializers.ModelSerializer):
    """
    Serializer for MajorMinorOption model
    """
    class Meta:
        model = MajorMinorOption
        fields = [
            'id', 'course', 'name', 'code', 'option_type',
            'available_from_semester', 'description', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model
    """
    course_name = serializers.CharField(source='course.name', read_only=True, allow_null=True)
    major_name = serializers.CharField(source='major.name', read_only=True, allow_null=True)
    subject_type_display = serializers.CharField(source='get_subject_type_display', read_only=True)
    
    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'course', 'course_name', 'course_code',
            'semester', 'subject_type', 'subject_type_display', 'major', 'major_name',
            'credit_hours', 'total_marks', 'has_practical', 'practical_marks',
            'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExamSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam model
    """
    results_count = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True, allow_null=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True, allow_null=True)
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)
    
    class Meta:
        model = Exam
        fields = [
            'id', 'name', 'exam_type', 'exam_type_display', 'course', 'semester',
            'subject', 'subject_name', 'subject_code',
            'exam_date', 'total_marks', 'description', 'results_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_results_count(self, obj):
        return obj.results.count()


class ExamDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Exam serializer with statistics
    """
    results_count = serializers.SerializerMethodField()
    average_marks = serializers.SerializerMethodField()
    pass_rate = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True, allow_null=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True, allow_null=True)
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)
    
    class Meta:
        model = Exam
        fields = [
            'id', 'name', 'exam_type', 'exam_type_display', 'course', 'semester',
            'subject', 'subject_name', 'subject_code',
            'exam_date', 'total_marks', 'description', 'results_count',
            'average_marks', 'pass_rate', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_results_count(self, obj):
        return obj.results.count()
    
    def get_average_marks(self, obj):
        """Calculate average marks for this exam"""
        from django.db.models import Avg
        avg = obj.results.aggregate(avg=Avg('marks_obtained'))['avg']
        return float(avg) if avg else 0.0
    
    def get_pass_rate(self, obj):
        """Calculate pass rate (assuming 33% is passing)"""
        total_results = obj.results.count()
        if total_results == 0:
            return 0.0
        
        passing_marks = obj.total_marks * 0.33
        passed = obj.results.filter(marks_obtained__gte=passing_marks).count()
        
        return (passed / total_results) * 100


class ResultSerializer(serializers.ModelSerializer):
    """
    Serializer for Result model
    """
    exam_date = serializers.DateField(source='exam.exam_date', read_only=True)
    exam_type = serializers.CharField(source='exam.exam_type', read_only=True)
    subject_total_marks = serializers.IntegerField(
        source='subject.total_marks',
        read_only=True
    )
    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    student_id = serializers.CharField(
        source='student.student_id',
        read_only=True
    )
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    grade = serializers.CharField(read_only=True)
    percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Result
        fields = [
            'id', 'student', 'student_name', 'student_id',
            'exam', 'exam_name', 'exam_date', 'exam_type',
            'subject', 'subject_name', 'subject_code',
            'subject_total_marks',
            'marks_obtained', 'grade', 'percentage', 'remarks',
            'teacher_comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_percentage(self, obj):
        return obj.get_percentage()
    
    def validate(self, attrs):
        """Validate result data"""
        marks_obtained = attrs.get('marks_obtained')
        subject = attrs.get('subject')
        
        if marks_obtained < 0:
            raise serializers.ValidationError({
                'marks_obtained': 'Marks cannot be negative.'
            })
        
        if subject and marks_obtained > subject.total_marks:
            raise serializers.ValidationError({
                'marks_obtained': f'Marks cannot exceed {subject.total_marks}.'
            })
        
        # Check for duplicate result (only on creation)
        if not self.instance:
            student = attrs.get('student')
            exam = attrs.get('exam')
            subject = attrs.get('subject')
            
            if Result.objects.filter(
                student=student,
                exam=exam,
                subject=subject
            ).exists():
                raise serializers.ValidationError(
                    'Result already exists for this student, exam, and subject.'
                )
        
        return attrs


class ResultDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Result serializer
    """
    from accounts.serializers import StudentSerializer
    
    student = StudentSerializer(read_only=True)
    exam = ExamSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    grade = serializers.CharField(read_only=True)
    percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Result
        fields = [
            'id', 'student', 'exam', 'subject', 'marks_obtained',
            'grade', 'percentage', 'remarks', 'teacher_comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_percentage(self, obj):
        return obj.get_percentage()


class BulkResultSerializer(serializers.Serializer):
    """
    Serializer for bulk result upload
    """
    student_id = serializers.CharField()
    subject_code = serializers.CharField()
    marks_obtained = serializers.DecimalField(max_digits=5, decimal_places=2)
    remarks = serializers.CharField(required=False, allow_blank=True)


class StudentReportCardSerializer(serializers.Serializer):
    """
    Serializer for student report card data
    """
    student = serializers.SerializerMethodField()
    exam = serializers.SerializerMethodField()
    results = ResultSerializer(many=True)
    total_marks = serializers.DecimalField(max_digits=10, decimal_places=2)
    marks_obtained = serializers.DecimalField(max_digits=10, decimal_places=2)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    grade = serializers.CharField()
    
    def get_student(self, obj):
        from accounts.serializers import StudentSerializer
        return StudentSerializer(obj['student']).data
    
    def get_exam(self, obj):
        return ExamSerializer(obj['exam']).data


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Serializer for Attendance model
    """
    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    student_id = serializers.CharField(
        source='student.student_id',
        read_only=True
    )
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_name', 'student_id',
            'subject', 'subject_name', 'subject_code',
            'date', 'status', 'status_display',
            'course', 'intake', 'semester', 'session',
            'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttendanceDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Attendance serializer with full student info
    """
    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    student_id = serializers.CharField(
        source='student.student_id',
        read_only=True
    )
    student_photo = serializers.ImageField(
        source='student.photo',
        read_only=True
    )
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_name', 'student_id', 'student_photo',
            'subject', 'subject_name', 'subject_code',
            'date', 'status', 'status_display',
            'course', 'intake', 'semester', 'session',
            'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BulkAttendanceSerializer(serializers.Serializer):
    """
    Serializer for bulk attendance submission
    """
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['present', 'absent'])


class AttendanceSessionSerializer(serializers.Serializer):
    """
    Serializer for attendance session summary (used in history view)
    """
    date = serializers.DateField()
    course = serializers.CharField()
    intake = serializers.CharField()
    semester = serializers.CharField()
    subject_id = serializers.IntegerField()
    subject_name = serializers.CharField()
    subject_code = serializers.CharField()
    total_students = serializers.IntegerField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    session = serializers.CharField(allow_null=True)






