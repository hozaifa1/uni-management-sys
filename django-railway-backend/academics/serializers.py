from rest_framework import serializers
from .models import Subject, Exam, Result


class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model
    """
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    
    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'course', 'course_name', 'course_code',
            'total_marks', 'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExamSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam model
    """
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    results_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = [
            'id', 'name', 'exam_type', 'batch', 'batch_name',
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
    from students.serializers import BatchSerializer
    
    batch = BatchSerializer(read_only=True)
    results_count = serializers.SerializerMethodField()
    average_marks = serializers.SerializerMethodField()
    pass_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = [
            'id', 'name', 'exam_type', 'batch', 'exam_date',
            'total_marks', 'description', 'results_count',
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
            'exam', 'exam_name', 'subject', 'subject_name', 'subject_code',
            'marks_obtained', 'grade', 'percentage', 'remarks',
            'created_at', 'updated_at'
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
            'grade', 'percentage', 'remarks', 'created_at', 'updated_at'
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






