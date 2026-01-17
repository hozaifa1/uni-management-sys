from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import User, Student
from .serializers import (
    UserSerializer, UserCreateSerializer, StudentSerializer,
    StudentCreateSerializer, StudentUpdateSerializer, LoginSerializer, ChangePasswordSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model CRUD operations
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone_number']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Change user password"""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            # Set new password
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            return Response({
                'message': 'Password changed successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Student model CRUD operations
    """
    queryset = Student.objects.select_related('user').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'intake', 'semester', 'session', 'blood_group', 'admission_date', 'user']
    search_fields = [
        'student_id', 'user__username', 'user__first_name',
        'user__last_name', 'user__email', 'guardian_name'
    ]
    ordering_fields = ['admission_date', 'student_id']
    ordering = ['-admission_date']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        if self.action in ['update', 'partial_update']:
            return StudentUpdateSerializer
        return StudentSerializer
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete student and associated user account
        """
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        
        student = self.get_object()
        user = student.user
        
        try:
            with transaction.atomic():
                # Delete user first, which will cascade to student
                # Student deletion will cascade to payments, results, attendance
                user.delete()
            
            return Response(
                {'message': 'Student and associated user deleted successfully.'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            error_traceback = traceback.format_exc()
            logger.error(f"Error deleting student: {str(e)}\n{error_traceback}")
            return Response(
                {'error': f'Failed to delete student: {str(e)}', 'details': error_traceback},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get complete student profile with payments"""
        student = self.get_object()
        serializer = self.get_serializer(student)
        
        # Add additional data
        data = serializer.data
        data['payments_count'] = student.payments.count()
        
        return Response(data)


class LoginView(viewsets.ViewSet):
    """
    ViewSet for user authentication
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """User login with JWT token generation"""
        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """User logout (token blacklisting can be added)"""
        return Response({
            'message': 'Logged out successfully.'
        }, status=status.HTTP_200_OK)
