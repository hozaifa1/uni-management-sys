from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentReportViewSet, ResultReportViewSet

router = DefaultRouter()
router.register(r'payments', PaymentReportViewSet, basename='payment-report')
router.register(r'results', ResultReportViewSet, basename='result-report')

urlpatterns = [
    path('', include(router.urls)),
]
