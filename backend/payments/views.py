from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta

from .models import FeeStructure, Payment, Expense
from .serializers import (
    FeeStructureSerializer, PaymentSerializer, PaymentDetailSerializer,
    ExpenseSerializer, PaymentStatisticsSerializer
)


class FeeStructureViewSet(viewsets.ModelViewSet):
    """
    ViewSet for FeeStructure model CRUD operations
    """
    queryset = FeeStructure.objects.select_related('batch').all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['batch', 'fee_type', 'due_date']
    search_fields = ['batch__name', 'description']
    ordering_fields = ['due_date', 'amount']
    ordering = ['-due_date']


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Payment model CRUD operations
    """
    queryset = Payment.objects.select_related(
        'student', 'student__user', 'fee_structure'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'fee_structure', 'payment_method', 'payment_date']
    search_fields = [
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'transaction_id'
    ]
    ordering_fields = ['payment_date', 'amount_paid']
    ordering = ['-payment_date']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PaymentDetailSerializer
        return PaymentSerializer
    
    def perform_create(self, serializer):
        """Auto-set created_by to current user if needed"""
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get payment statistics including:
        - Total revenue
        - Total expenses
        - Net profit
        - Pending payments
        - Monthly breakdown
        """
        # Calculate total revenue
        total_revenue = Payment.objects.aggregate(
            total=Sum('amount_paid')
        )['total'] or 0
        
        # Calculate total expenses
        total_expenses = Expense.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Net profit
        net_profit = total_revenue - total_expenses
        
        # Calculate pending payments (total fee structure amount - total collected)
        from accounts.models import Student
        total_students = Student.objects.count()
        
        total_fee = FeeStructure.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        pending_payments = total_fee - total_revenue
        
        # Monthly breakdown for last 12 months
        monthly_breakdown = []
        today = datetime.now()
        
        for i in range(12):
            month_date = today - timedelta(days=30 * i)
            month_start = month_date.replace(day=1)
            
            # Calculate revenue for this month
            month_revenue = Payment.objects.filter(
                payment_date__year=month_date.year,
                payment_date__month=month_date.month
            ).aggregate(total=Sum('amount_paid'))['total'] or 0
            
            # Calculate expenses for this month
            month_expenses = Expense.objects.filter(
                expense_date__year=month_date.year,
                expense_date__month=month_date.month
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_breakdown.append({
                'month': month_date.strftime('%B %Y'),
                'revenue': float(month_revenue),
                'expenses': float(month_expenses),
                'profit': float(month_revenue - month_expenses)
            })
        
        monthly_breakdown.reverse()
        
        data = {
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'pending_payments': pending_payments,
            'total_students': total_students,
            'monthly_breakdown': monthly_breakdown
        }
        
        serializer = PaymentStatisticsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent payments (last 30 days)"""
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_payments = self.queryset.filter(
            payment_date__gte=thirty_days_ago
        )
        
        page = self.paginate_queryset(recent_payments)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(recent_payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def student_payments(self, request):
        """Get payments for a specific student"""
        student_id = request.query_params.get('student_id')
        
        if not student_id:
            return Response(
                {'error': 'student_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payments = self.queryset.filter(student__id=student_id)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Expense model CRUD operations
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
        """Auto-set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get expense summary by type"""
        summary = Expense.objects.values('expense_type').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def monthly(self, request):
        """Get monthly expense breakdown"""
        # Get month and year from query params
        month = request.query_params.get('month', datetime.now().month)
        year = request.query_params.get('year', datetime.now().year)
        
        monthly_expenses = Expense.objects.filter(
            expense_date__year=year,
            expense_date__month=month
        )
        
        # Group by expense type
        summary = monthly_expenses.values('expense_type').annotate(
            total=Sum('amount'),
            count=Count('id')
        )
        
        total = monthly_expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'month': f'{month}/{year}',
            'total_expenses': total,
            'breakdown': summary
        })
