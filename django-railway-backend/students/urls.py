from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, BatchViewSet, EnrollmentViewSet, TeacherViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'batches', BatchViewSet, basename='batch')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'teachers', TeacherViewSet, basename='teacher')

urlpatterns = [
    path('', include(router.urls)),
]




