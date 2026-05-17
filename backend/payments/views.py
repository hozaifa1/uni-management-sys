from datetime import datetime, timedelta

from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Expense, Payment
from .serializers import (
    ExpenseSerializer,
    PaymentDetailSerializer,
    PaymentSerializer,
    PaymentStatisticsSerializer,
)


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Payment model CRUD operations.
    """

    queryset = Payment.objects.select_related('student', 'student__user').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'payment_method', 'payment_date', 'fee_type']
    search_fields = [
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'transaction_id',
    ]
    ordering_fields = ['payment_date', 'amount_paid']
    ordering = ['-payment_date']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PaymentDetailSerializer
        return PaymentSerializer

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Payment statistics — actuals only.

        Returns total revenue (sum of payments), total expenses, net profit,
        student count, and monthly breakdown. No "expected" / "due" figures.
        """
        total_revenue = Payment.objects.aggregate(
            total=Sum('amount_paid'),
        )['total'] or 0

        total_expenses = Expense.objects.aggregate(
            total=Sum('amount'),
        )['total'] or 0

        net_profit = total_revenue - total_expenses

        from accounts.models import Student
        total_students = Student.objects.count()

        # Monthly breakdown for last 12 months
        monthly_breakdown = []
        today = datetime.now()

        for i in range(12):
            month_date = today - timedelta(days=30 * i)

            month_revenue = Payment.objects.filter(
                payment_date__year=month_date.year,
                payment_date__month=month_date.month,
            ).aggregate(total=Sum('amount_paid'))['total'] or 0

            month_expenses = Expense.objects.filter(
                expense_date__year=month_date.year,
                expense_date__month=month_date.month,
            ).aggregate(total=Sum('amount'))['total'] or 0

            monthly_breakdown.append({
                'month': month_date.strftime('%B %Y'),
                'revenue': float(month_revenue),
                'expenses': float(month_expenses),
                'profit': float(month_revenue - month_expenses),
            })

        monthly_breakdown.reverse()

        def _pct_change(curr, prev):
            curr = float(curr or 0)
            prev = float(prev or 0)
            if prev == 0:
                return None
            return round(((curr - prev) / prev) * 100, 1)

        revenue_this_month = monthly_breakdown[-1]['revenue'] if monthly_breakdown else 0
        revenue_last_month = monthly_breakdown[-2]['revenue'] if len(monthly_breakdown) >= 2 else 0
        expenses_this_month = monthly_breakdown[-1]['expenses'] if monthly_breakdown else 0
        expenses_last_month = monthly_breakdown[-2]['expenses'] if len(monthly_breakdown) >= 2 else 0

        data = {
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'total_students': total_students,
            'revenue_this_month': revenue_this_month,
            'expenses_this_month': expenses_this_month,
            'revenue_trend_pct': _pct_change(revenue_this_month, revenue_last_month),
            'expense_trend_pct': _pct_change(expenses_this_month, expenses_last_month),
            'monthly_breakdown': monthly_breakdown,
        }

        serializer = PaymentStatisticsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent payments (last 30 days)."""
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_payments = self.queryset.filter(payment_date__gte=thirty_days_ago)

        page = self.paginate_queryset(recent_payments)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(recent_payments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def student_payments(self, request):
        """Get payments for a specific student."""
        student_id = request.query_params.get('student_id')

        if not student_id:
            return Response(
                {'error': 'student_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payments = self.queryset.filter(student__id=student_id)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Expense model CRUD operations.
    """

    queryset = Expense.objects.select_related('created_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['expense_type', 'expense_date']
    search_fields = ['description', 'paid_to']
    ordering_fields = ['expense_date', 'amount']
    ordering = ['-expense_date']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get expense summary by type."""
        summary = Expense.objects.values('expense_type').annotate(
            total=Sum('amount'),
            count=Count('id'),
        ).order_by('-total')

        return Response(summary)

    @action(detail=False, methods=['get'])
    def monthly(self, request):
        """Get monthly expense breakdown."""
        month = request.query_params.get('month', datetime.now().month)
        year = request.query_params.get('year', datetime.now().year)

        monthly_expenses = Expense.objects.filter(
            expense_date__year=year,
            expense_date__month=month,
        )

        summary = monthly_expenses.values('expense_type').annotate(
            total=Sum('amount'),
            count=Count('id'),
        )

        total = monthly_expenses.aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'month': f'{month}/{year}',
            'total_expenses': total,
            'breakdown': summary,
        })
