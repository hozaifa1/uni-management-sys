from rest_framework import serializers
from .models import Course, Teacher
from accounts.serializers import UserSerializer


class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for Course model
    """
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'description', 'duration_months',
            'fee', 'is_active', 'created_at', 'updated_at'
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






