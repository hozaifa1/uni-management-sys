from rest_framework import serializers
from .models import Course, Batch, Enrollment, Teacher
from accounts.serializers import UserSerializer


class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for Course model
    """
    batch_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'description', 'duration_months',
            'fee', 'is_active', 'batch_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_batch_count(self, obj):
        return obj.batches.count()


class BatchSerializer(serializers.ModelSerializer):
    """
    Serializer for Batch model
    """
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    student_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Batch
        fields = [
            'id', 'name', 'course', 'course_name', 'course_code',
            'start_date', 'end_date', 'is_active', 'student_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_student_count(self, obj):
        return obj.students.count()


class BatchDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Batch serializer with nested course
    """
    course = CourseSerializer(read_only=True)
    student_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Batch
        fields = [
            'id', 'name', 'course', 'start_date', 'end_date',
            'is_active', 'student_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_student_count(self, obj):
        return obj.students.count()


class EnrollmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Enrollment model
    """
    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    student_id = serializers.CharField(
        source='student.student_id',
        read_only=True
    )
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_name', 'student_id',
            'batch', 'batch_name', 'enrollment_date', 'status',
            'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        """Validate unique enrollment"""
        student = attrs.get('student')
        batch = attrs.get('batch')
        
        # Check if enrollment already exists (only on creation)
        if not self.instance:
            if Enrollment.objects.filter(student=student, batch=batch).exists():
                raise serializers.ValidationError(
                    'Student is already enrolled in this batch.'
                )
        
        return attrs


class EnrollmentDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Enrollment serializer
    """
    from accounts.serializers import StudentSerializer
    
    student = StudentSerializer(read_only=True)
    batch = BatchSerializer(read_only=True)
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'batch', 'enrollment_date',
            'status', 'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TeacherSerializer(serializers.ModelSerializer):
    """
    Serializer for Teacher model with nested user data
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'employee_id', 'subjects', 'qualification',
            'joining_date', 'monthly_salary', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'employee_id', 'created_at', 'updated_at']


class TeacherCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating teachers with user account
    """
    # User fields
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True, required=False)
    address = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Teacher
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'phone_number', 'address', 'subjects', 'qualification',
            'joining_date', 'monthly_salary', 'is_active'
        ]
    
    def create(self, validated_data):
        """Create user and teacher profile together"""
        from accounts.models import User
        
        # Extract user data
        user_data = {
            'username': validated_data.pop('username'),
            'email': validated_data.pop('email'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'role': 'TEACHER',
            'phone_number': validated_data.pop('phone_number', ''),
            'address': validated_data.pop('address', '')
        }
        password = validated_data.pop('password')
        
        # Create user
        user = User.objects.create(**user_data)
        user.set_password(password)
        user.save()
        
        # Create teacher profile
        teacher = Teacher.objects.create(user=user, **validated_data)
        
        return teacher


