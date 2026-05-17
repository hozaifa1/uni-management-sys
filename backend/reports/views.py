from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q

from accounts.models import Student
from payments.models import Payment
from academics.models import Result, Exam


class PaymentReportViewSet(viewsets.ViewSet):
    """
    Payment reports — reflect only payments that actually happened.

    The system intentionally does NOT track expected fees, dues, or
    "supposed to pay" amounts. All figures here are actuals.
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def semester_wise(self, request):
        """
        Semester-wise payment summary.

        Groups payments by the student's current semester.
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')

        student_filter = Q()
        if course:
            student_filter &= Q(student__course=course)
        if intake:
            student_filter &= Q(student__intake=intake)

        semester_payments = Payment.objects.filter(student_filter).values(
            'student__semester',
        ).annotate(
            total_amount=Sum('amount_paid'),
            total_discount=Sum('discount_amount'),
            payment_count=Count('id'),
            student_count=Count('student', distinct=True),
        ).order_by('student__semester')

        result = []
        for item in semester_payments:
            result.append({
                'semester': item['student__semester'],
                'total_amount': float(item['total_amount'] or 0),
                'total_discount': float(item['total_discount'] or 0),
                'net_amount': float(
                    (item['total_amount'] or 0) - (item['total_discount'] or 0)
                ),
                'payment_count': item['payment_count'],
                'student_count': item['student_count'],
            })

        return Response({
            'report_type': 'semester_wise',
            'filters': {'course': course, 'intake': intake},
            'data': result,
        })

    @action(detail=False, methods=['get'])
    def current_semester(self, request):
        """
        Payments for students currently in the given semester.
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester', '1st')

        student_filter = Q(student__semester=semester)
        if course:
            student_filter &= Q(student__course=course)
        if intake:
            student_filter &= Q(student__intake=intake)

        payments = Payment.objects.filter(student_filter).select_related(
            'student', 'student__user',
        ).order_by('-payment_date')

        stats = payments.aggregate(
            total_amount=Sum('amount_paid'),
            total_discount=Sum('discount_amount'),
            payment_count=Count('id'),
            student_count=Count('student', distinct=True),
        )

        payment_list = []
        for p in payments[:100]:
            payment_list.append({
                'id': p.id,
                'student_name': p.student.user.get_full_name(),
                'student_id': p.student.student_id,
                'amount_paid': float(p.amount_paid),
                'discount_amount': float(p.discount_amount),
                'payment_date': p.payment_date,
                'payment_method': p.payment_method,
                'fee_type': p.fee_type,
                'payment_regularity': p.payment_regularity,
            })

        return Response({
            'report_type': 'current_semester',
            'filters': {'course': course, 'intake': intake, 'semester': semester},
            'stats': {
                'total_amount': float(stats['total_amount'] or 0),
                'total_discount': float(stats['total_discount'] or 0),
                'net_amount': float(
                    (stats['total_amount'] or 0) - (stats['total_discount'] or 0)
                ),
                'payment_count': stats['payment_count'],
                'student_count': stats['student_count'],
            },
            'payments': payment_list,
        })

    @action(detail=False, methods=['get'])
    def fee_type_summary(self, request):
        """
        Payment summary grouped by fee type label.
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')

        payment_filter = Q()
        if course:
            payment_filter &= Q(student__course=course)
        if intake:
            payment_filter &= Q(student__intake=intake)

        fee_type_payments = Payment.objects.filter(payment_filter).exclude(
            fee_type__isnull=True,
        ).exclude(fee_type='').values('fee_type').annotate(
            total_amount=Sum('amount_paid'),
            payment_count=Count('id'),
        ).order_by('-total_amount')

        result = []
        for item in fee_type_payments:
            result.append({
                'fee_type': item['fee_type'],
                'total_amount': float(item['total_amount'] or 0),
                'payment_count': item['payment_count'],
            })

        return Response({
            'report_type': 'fee_type_summary',
            'filters': {'course': course, 'intake': intake},
            'data': result,
        })


class ResultReportViewSet(viewsets.ViewSet):
    """
    ViewSet for result/academic reports.
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def exam_summary(self, request):
        """Summary of recent exams with pass/fail rates."""
        course = request.query_params.get('course')
        semester = request.query_params.get('semester')

        exam_filter = Q()
        if course:
            exam_filter &= Q(course=course)
        if semester:
            exam_filter &= Q(semester=semester)

        exams = Exam.objects.filter(exam_filter).select_related(
            'subject',
        ).prefetch_related('results').order_by('-exam_date')[:100]

        exam_stats = []
        for exam in exams:
            try:
                results = exam.results.all()
                total_students = results.count()

                if total_students > 0:
                    from django.db.models import Avg
                    avg_marks = results.aggregate(avg=Avg('marks_obtained'))['avg'] or 0
                    passing_marks = exam.total_marks * 0.33
                    passed = results.filter(marks_obtained__gte=passing_marks).count()
                    failed = total_students - passed
                    pass_rate = (passed / total_students) * 100
                else:
                    avg_marks = 0
                    passed = 0
                    failed = 0
                    pass_rate = 0

                exam_stats.append({
                    'exam_id': exam.id,
                    'exam_name': exam.name,
                    'exam_type': exam.exam_type,
                    'course': exam.course,
                    'semester': exam.semester,
                    'subject_name': exam.subject.name if exam.subject else None,
                    'exam_date': exam.exam_date,
                    'total_marks': exam.total_marks,
                    'total_students': total_students,
                    'average_marks': float(avg_marks),
                    'passed': passed,
                    'failed': failed,
                    'pass_rate': float(pass_rate),
                })
            except Exception as e:  # pragma: no cover — defensive
                import logging
                logging.error(f"Error processing exam {exam.id}: {e}")
                continue

        return Response({
            'report_type': 'exam_summary',
            'filters': {'course': course, 'semester': semester},
            'data': exam_stats,
        })

    @action(detail=False, methods=['get'])
    def grade_distribution(self, request):
        """Grade distribution across results, optionally filtered."""
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        exam_id = request.query_params.get('exam_id')

        result_filter = Q()
        if course:
            result_filter &= Q(student__course=course)
        if intake:
            result_filter &= Q(student__intake=intake)
        if semester:
            result_filter &= Q(student__semester=semester)
        if exam_id:
            result_filter &= Q(exam_id=exam_id)

        results = Result.objects.filter(result_filter).select_related('subject')

        grade_counts = {
            'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0,
        }

        for result in results:
            grade = result.calculate_grade()
            if grade in grade_counts:
                grade_counts[grade] += 1

        return Response({
            'report_type': 'grade_distribution',
            'filters': {
                'course': course, 'intake': intake,
                'semester': semester, 'exam_id': exam_id,
            },
            'total_results': results.count(),
            'distribution': grade_counts,
        })
