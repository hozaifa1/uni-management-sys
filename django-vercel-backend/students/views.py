from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Course, Batch, Enrollment, Teacher
from .serializers import (
    CourseSerializer, BatchSerializer, BatchDetailSerializer,
    EnrollmentSerializer, EnrollmentDetailSerializer,
    TeacherSerializer, TeacherCreateSerializer
)


class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Course model CRUD operations
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']
    
    @action(detail=True, methods=['get'])
    def batches(self, request, pk=None):
        """Get all batches for a specific course"""
        course = self.get_object()
        batches = course.batches.all()
        serializer = BatchSerializer(batches, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active courses"""
        active_courses = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(active_courses, many=True)
        return Response(serializer.data)


class BatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Batch model CRUD operations
    """
    queryset = Batch.objects.select_related('course').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'is_active', 'start_date']
    search_fields = ['name', 'course__name', 'course__code']
    ordering_fields = ['start_date', 'name']
    ordering = ['-start_date']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BatchDetailSerializer
        return BatchSerializer
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get all students in a batch"""
        from accounts.serializers import StudentSerializer
        
        batch = self.get_object()
        students = batch.students.all()
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active batches"""
        active_batches = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(active_batches, many=True)
        return Response(serializer.data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Enrollment model CRUD operations
    """
    queryset = Enrollment.objects.select_related(
        'student', 'student__user', 'batch'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'batch', 'status', 'enrollment_date']
    search_fields = [
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'batch__name'
    ]
    ordering_fields = ['enrollment_date']
    ordering = ['-enrollment_date']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EnrollmentDetailSerializer
        return EnrollmentSerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active enrollments"""
        active_enrollments = self.queryset.filter(status='active')
        serializer = self.get_serializer(active_enrollments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark enrollment as completed"""
        enrollment = self.get_object()
        enrollment.status = 'completed'
        enrollment.save()
        
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def drop(self, request, pk=None):
        """Mark enrollment as dropped"""
        enrollment = self.get_object()
        enrollment.status = 'dropped'
        enrollment.remarks = request.data.get('remarks', '')
        enrollment.save()
        
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)


class TeacherViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Teacher model CRUD operations
    """
    queryset = Teacher.objects.select_related('user').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'joining_date']
    search_fields = [
        'employee_id', 'user__username', 'user__first_name',
        'user__last_name', 'user__email', 'subjects', 'qualification'
    ]
    ordering_fields = ['joining_date', 'employee_id']
    ordering = ['-joining_date']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TeacherCreateSerializer
        return TeacherSerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active teachers"""
        active_teachers = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(active_teachers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get complete teacher profile"""
        teacher = self.get_object()
        serializer = self.get_serializer(teacher)
        return Response(serializer.data)
