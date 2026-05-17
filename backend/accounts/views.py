from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import User, Student
from .serializers import (
    UserSerializer, UserCreateSerializer, StudentSerializer,
    StudentCreateSerializer, StudentUpdateSerializer, LoginSerializer, ChangePasswordSerializer
)


class IsAdminOrSelf(BasePermission):
    """
    Only admins can list / create / mutate other users.
    Any authenticated user can read or update their own record.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        # Admins can do anything.
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
        # Non-admins: only the 'me' / 'change_password' self-actions, plus
        # retrieving / updating their own user (object-level check below).
        if view.action in ('me', 'change_password', 'retrieve',
                           'update', 'partial_update'):
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
        return obj.pk == request.user.pk


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model CRUD operations
    """
    queryset = User.objects.all()
    permission_classes = [IsAdminOrSelf]
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
        Safely remove a student.

        Students with any history (payments, results, attendance) are
        DEACTIVATED instead of hard-deleted so their records cannot vanish.
        Only fully-empty student profiles can be hard-deleted.
        """
        student = self.get_object()
        user = student.user

        has_payments = student.payments.exists()
        has_results = student.results.exists()
        has_attendance = student.attendances.exists()
        has_history = has_payments or has_results or has_attendance

        if has_history:
            with transaction.atomic():
                user.is_active = False
                user.save(update_fields=['is_active', 'updated_at'])
            return Response(
                {
                    'message': (
                        'Student has historical records and was deactivated '
                        'instead of deleted to preserve data integrity.'
                    ),
                    'deactivated': True,
                    'has_payments': has_payments,
                    'has_results': has_results,
                    'has_attendance': has_attendance,
                },
                status=status.HTTP_200_OK,
            )

        with transaction.atomic():
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
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
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Logout — blacklist the supplied refresh token so it can't be reused.

        Expects {"refresh": "<token>"} in the body.
        """
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'refresh token required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            return Response(
                {'detail': f'Invalid or expired token: {exc}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {'message': 'Logged out successfully.'},
            status=status.HTTP_200_OK,
        )
