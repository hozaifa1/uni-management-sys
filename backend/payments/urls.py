from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
]
