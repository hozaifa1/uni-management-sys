from datetime import datetime, timedelta

from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config.permissions import IsAdminOrCoordinatorCreateOnly

from .models import (
    AdmissionRecord,
    DailyAccount,
    Expense,
    FeeStructure,
    Payment,
    SemesterSummary,
)
from .serializers import (
    AdmissionRecordSerializer,
    DailyAccountSerializer,
    ExpenseSerializer,
    FeeStructureSerializer,
    PaymentDetailSerializer,
    PaymentSerializer,
    PaymentStatisticsSerializer,
    SemesterSummarySerializer,
)


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Payment model CRUD operations.
    """

    queryset = Payment.objects.select_related('student', 'student__user').all()
    permission_classes = [IsAdminOrCoordinatorCreateOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'payment_method', 'payment_date', 'fee_type', 'semester']
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
    permission_classes = [IsAdminOrCoordinatorCreateOnly]
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


class SemesterSummaryViewSet(viewsets.ModelViewSet):
    """
    Per-student-per-semester financial summary (dues, balances, attendance).
    Sourced from Excel ledger originally; admins can edit receivable fees.
    """

    queryset = SemesterSummary.objects.select_related('student', 'student__user').all()
    serializer_class = SemesterSummarySerializer
    permission_classes = [IsAdminOrCoordinatorCreateOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'semester', 'program', 'intake_batch']
    search_fields = ['student__roll_number', 'student__full_name']
    ordering_fields = ['semester', 'closing_balance', 'cumulative_due_after_semester']
    ordering = ['-cumulative_due_after_semester']

    # Fee fields that admins can bulk-edit via bulk_update_receivables.
    EDITABLE_FEE_FIELDS = {
        'semester_fee',
        'monthly_tuition_fee',
        'midterm_1_fee',
        'midterm_2_fee',
        'nu_exam_fee',
        'library_deposit',
        'total_receivable_end_of_semester',
        'receivable_at_mt_exam',
        'total_payable_at_form_fillup',
    }

    @action(detail=False, methods=['get'])
    def dues_overview(self, request):
        """Total outstanding dues across the institution."""
        agg = SemesterSummary.objects.aggregate(
            total_due=Sum('cumulative_due_after_semester'),
            total_received=Sum('cumulative_received_after_semester'),
        )
        return Response({
            'total_due': agg['total_due'] or 0,
            'total_received': agg['total_received'] or 0,
            'student_count': SemesterSummary.objects.values('student').distinct().count(),
        })

    @action(detail=False, methods=['post'], url_path='bulk-update-receivables')
    def bulk_update_receivables(self, request):
        """
        Bulk-edit receivable fee fields across a scope.

        Body: {
          "scope": "student" | "intake" | "semester" | "course",
          "target": { ...filters depending on scope... },
            - student:  {"student": <id>}
            - intake:   {"intake_batch": "14th", "program": "BBA" (optional),
                         "semester": "1st Sem" (optional)}
            - semester: {"semester": "1st Sem", "program": "BBA" (optional),
                         "intake_batch": "14th" (optional)}
            - course:   {"program": "BBA"}
          "fields": {"semester_fee": 1000, ...}  // only EDITABLE_FEE_FIELDS
        }
        """
        user = request.user
        if not (user.is_superuser or getattr(user, "role", None) == "ADMIN"):
            return Response(
                {'error': 'Only admins can bulk-edit receivables.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        scope = (request.data.get('scope') or '').strip()
        target = request.data.get('target') or {}
        raw_fields = request.data.get('fields') or {}

        if scope not in {'student', 'intake', 'semester', 'course'}:
            return Response(
                {'error': "scope must be one of: student, intake, semester, course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Whitelist + coerce update fields.
        clean_fields: dict = {}
        for key, value in raw_fields.items():
            if key not in self.EDITABLE_FEE_FIELDS:
                continue
            if value is None or value == '':
                continue
            try:
                clean_fields[key] = int(float(value))
            except (TypeError, ValueError):
                return Response(
                    {'error': f"Field '{key}' must be numeric."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if not clean_fields:
            return Response(
                {'error': 'No editable fields provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build the scoped queryset.
        qs = SemesterSummary.objects.all()
        if scope == 'student':
            sid = target.get('student')
            if not sid:
                return Response(
                    {'error': "scope=student requires target.student (id)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(student_id=sid)
        elif scope == 'intake':
            ib = target.get('intake_batch')
            if not ib:
                return Response(
                    {'error': "scope=intake requires target.intake_batch."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(intake_batch=ib)
            if target.get('program'):
                qs = qs.filter(program=target['program'])
            if target.get('semester'):
                qs = qs.filter(semester=target['semester'])
        elif scope == 'semester':
            sem = target.get('semester')
            if not sem:
                return Response(
                    {'error': "scope=semester requires target.semester."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(semester=sem)
            if target.get('program'):
                qs = qs.filter(program=target['program'])
            if target.get('intake_batch'):
                qs = qs.filter(intake_batch=target['intake_batch'])
        elif scope == 'course':
            prog = target.get('program')
            if not prog:
                return Response(
                    {'error': "scope=course requires target.program."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(program=prog)

        updated = qs.update(**clean_fields)
        return Response({
            'updated': updated,
            'fields': clean_fields,
            'scope': scope,
            'target': target,
        })


class AdmissionRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AdmissionRecord.objects.select_related('student', 'student__user').all()
    serializer_class = AdmissionRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['program', 'intake_batch']
    search_fields = ['roll_number', 'name', 'registration_number']
    ordering_fields = ['admission_date']
    ordering = ['-admission_date']


class DailyAccountViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailyAccount.objects.all()
    serializer_class = DailyAccountSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['year_group', 'date']
    search_fields = ['description']
    ordering_fields = ['date']
    ordering = ['-date']

    @action(detail=False, methods=['get'])
    def cashflow(self, request):
        """Monthly cashflow rollup from daily ledger."""
        from django.db.models.functions import TruncMonth
        rows = (
            DailyAccount.objects
            .exclude(date__isnull=True)
            .annotate(m=TruncMonth('date'))
            .values('m')
            .annotate(
                receive=Sum('cash_receive'),
                expense=Sum('cash_expense'),
            )
            .order_by('m')
        )
        return Response([
            {
                'month': r['m'].strftime('%Y-%m') if r['m'] else None,
                'receive': float(r['receive'] or 0),
                'expense': float(r['expense'] or 0),
                'net': float((r['receive'] or 0) - (r['expense'] or 0)),
            }
            for r in rows
        ])


class FeeStructureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['program']
    ordering_fields = ['order']
    ordering = ['program', 'order']
