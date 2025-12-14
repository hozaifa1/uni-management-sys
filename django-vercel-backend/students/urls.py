from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, TeacherViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'teachers', TeacherViewSet, basename='teacher')

urlpatterns = [
    path('', include(router.urls)),
]






