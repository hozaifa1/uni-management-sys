from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Student


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model - Read only for most fields
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone_number', 'address',
            'profile_picture', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users with password
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone_number', 'address',
            'profile_picture'
        ]
        read_only_fields = ['id']
    
    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class StudentSerializer(serializers.ModelSerializer):
    """
    Serializer for Student model with nested user data
    """
    user = UserSerializer(read_only=True)
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    course_code = serializers.CharField(source='batch.course.code', read_only=True)
    
    class Meta:
        model = Student
        fields = [
            'id', 'user', 'student_id', 'date_of_birth',
            # Family info
            'guardian_name', 'guardian_phone', 'guardian_yearly_income',
            'father_name', 'father_phone', 'mother_name', 'mother_phone',
            # Academic info
            'admission_date', 'session', 'semester',
            'batch', 'batch_name', 'course_code',
            'photo', 'blood_group',
            # Structured present address
            'present_address', 'present_house_no', 'present_road_vill',
            'present_police_station', 'present_post_office',
            'present_district', 'present_division',
            # Structured permanent address
            'permanent_address', 'permanent_house_no', 'permanent_road_vill',
            'permanent_police_station', 'permanent_post_office',
            'permanent_district', 'permanent_division',
            # SSC info
            'ssc_school', 'ssc_passing_year', 'ssc_group',
            'ssc_4th_subject', 'ssc_gpa',
            # HSC info
            'hsc_college', 'hsc_passing_year', 'hsc_group',
            'hsc_4th_subject', 'hsc_gpa',
            # Other
            'other_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student_id', 'created_at', 'updated_at']


class StudentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating students with user account
    """
    # User fields
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = Student
        fields = [
            # User fields
            'username', 'email', 'password', 'first_name', 'last_name', 'phone_number',
            # Basic student info
            'date_of_birth', 'blood_group', 'photo',
            # Family info
            'guardian_name', 'guardian_phone', 'guardian_yearly_income',
            'father_name', 'father_phone', 'mother_name', 'mother_phone',
            # Academic info
            'admission_date', 'session', 'semester', 'batch',
            # Structured present address
            'present_address', 'present_house_no', 'present_road_vill',
            'present_police_station', 'present_post_office',
            'present_district', 'present_division',
            # Structured permanent address
            'permanent_address', 'permanent_house_no', 'permanent_road_vill',
            'permanent_police_station', 'permanent_post_office',
            'permanent_district', 'permanent_division',
            # SSC info
            'ssc_school', 'ssc_passing_year', 'ssc_group',
            'ssc_4th_subject', 'ssc_gpa',
            # HSC info
            'hsc_college', 'hsc_passing_year', 'hsc_group',
            'hsc_4th_subject', 'hsc_gpa',
            # Other
            'other_info'
        ]
    
    def create(self, validated_data):
        """Create user and student profile together"""
        # Extract user data
        user_data = {
            'username': validated_data.pop('username'),
            'email': validated_data.pop('email'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'role': 'STUDENT',
            'phone_number': validated_data.pop('phone_number', '')
        }
        password = validated_data.pop('password')
        
        # Create user
        user = User.objects.create(**user_data)
        user.set_password(password)
        user.save()
        
        # Create student profile
        student = Student.objects.create(user=user, **validated_data)
        
        return student


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login
    """
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Validate credentials"""
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError(
                    'Unable to log in with provided credentials.',
                    code='authorization'
                )
            
            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.',
                    code='authorization'
                )
        else:
            raise serializers.ValidationError(
                'Must include "username" and "password".',
                code='authorization'
            )
        
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change
    """
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Validate passwords"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password": "Password fields didn't match."
            })
        return attrs
    
    def validate_old_password(self, value):
        """Validate old password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value






