from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionRecordViewSet,
    DailyAccountViewSet,
    ExpenseCategoryViewSet,
    ExpenseScheduleViewSet,
    ExpenseViewSet,
    FeeStructureViewSet,
    PaymentViewSet,
    SemesterSummaryViewSet,
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'expense-schedules', ExpenseScheduleViewSet, basename='expense-schedule')
router.register(r'semester-summaries', SemesterSummaryViewSet, basename='semester-summary')
router.register(r'admissions', AdmissionRecordViewSet, basename='admission')
router.register(r'daily-accounts', DailyAccountViewSet, basename='daily-account')
router.register(r'fee-structure', FeeStructureViewSet, basename='fee-structure')

urlpatterns = [
    path('', include(router.urls)),
]
