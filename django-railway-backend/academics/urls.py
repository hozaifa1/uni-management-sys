from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, ExamViewSet, ResultViewSet

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'results', ResultViewSet, basename='result')

urlpatterns = [
    path('', include(router.urls)),
]

