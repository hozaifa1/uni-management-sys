from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Course, Teacher
from .serializers import (
    CourseSerializer,
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
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active courses"""
        active_courses = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(active_courses, many=True)
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
