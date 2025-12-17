from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MajorMinorOptionViewSet, SubjectViewSet, ExamViewSet, ResultViewSet, AttendanceViewSet

router = DefaultRouter()
router.register(r'majors', MajorMinorOptionViewSet, basename='major')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'results', ResultViewSet, basename='result')
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = [
    path('', include(router.urls)),
]






