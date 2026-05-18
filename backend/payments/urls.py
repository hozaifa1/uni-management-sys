from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionRecordViewSet,
    DailyAccountViewSet,
    ExpenseViewSet,
    FeeStructureViewSet,
    PaymentViewSet,
    SemesterSummaryViewSet,
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'semester-summaries', SemesterSummaryViewSet, basename='semester-summary')
router.register(r'admissions', AdmissionRecordViewSet, basename='admission')
router.register(r'daily-accounts', DailyAccountViewSet, basename='daily-account')
router.register(r'fee-structure', FeeStructureViewSet, basename='fee-structure')

urlpatterns = [
    path('', include(router.urls)),
]
