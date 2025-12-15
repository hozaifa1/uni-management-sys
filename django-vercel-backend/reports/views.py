from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import Coalesce
from decimal import Decimal

from accounts.models import Student
from payments.models import Payment, FeeStructure
from academics.models import Result, Exam


class PaymentReportViewSet(viewsets.ViewSet):
    """
    ViewSet for payment reports
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def semester_wise(self, request):
        """
        Get semester-wise payment summary
        Groups payments by student's semester
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        
        # Build filter for students
        student_filter = Q()
        if course:
            student_filter &= Q(student__course=course)
        if intake:
            student_filter &= Q(student__intake=intake)
        
        # Aggregate payments by semester
        semester_payments = Payment.objects.filter(student_filter).values(
            'student__semester'
        ).annotate(
            total_amount=Sum('amount_paid'),
            total_discount=Sum('discount_amount'),
            payment_count=Count('id'),
            student_count=Count('student', distinct=True)
        ).order_by('student__semester')
        
        result = []
        for item in semester_payments:
            result.append({
                'semester': item['student__semester'],
                'total_amount': float(item['total_amount'] or 0),
                'total_discount': float(item['total_discount'] or 0),
                'net_amount': float((item['total_amount'] or 0) - (item['total_discount'] or 0)),
                'payment_count': item['payment_count'],
                'student_count': item['student_count']
            })
        
        return Response({
            'report_type': 'semester_wise',
            'filters': {'course': course, 'intake': intake},
            'data': result
        })

    @action(detail=False, methods=['get'])
    def current_semester(self, request):
        """
        Get payments for current semester students
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester', '1st')
        
        # Build filter
        student_filter = Q(student__semester=semester)
        if course:
            student_filter &= Q(student__course=course)
        if intake:
            student_filter &= Q(student__intake=intake)
        
        payments = Payment.objects.filter(student_filter).select_related(
            'student', 'student__user'
        ).order_by('-payment_date')
        
        # Aggregate stats
        stats = payments.aggregate(
            total_amount=Sum('amount_paid'),
            total_discount=Sum('discount_amount'),
            payment_count=Count('id'),
            student_count=Count('student', distinct=True)
        )
        
        # Get payment details
        payment_list = []
        for p in payments[:100]:  # Limit to 100 for performance
            payment_list.append({
                'id': p.id,
                'student_name': p.student.user.get_full_name(),
                'student_id': p.student.student_id,
                'amount_paid': float(p.amount_paid),
                'discount_amount': float(p.discount_amount),
                'payment_date': p.payment_date,
                'payment_method': p.payment_method,
                'fee_type': p.fee_type or (p.fee_structure.fee_type if p.fee_structure else None),
                'payment_regularity': p.payment_regularity
            })
        
        return Response({
            'report_type': 'current_semester',
            'filters': {'course': course, 'intake': intake, 'semester': semester},
            'stats': {
                'total_amount': float(stats['total_amount'] or 0),
                'total_discount': float(stats['total_discount'] or 0),
                'net_amount': float((stats['total_amount'] or 0) - (stats['total_discount'] or 0)),
                'payment_count': stats['payment_count'],
                'student_count': stats['student_count']
            },
            'payments': payment_list
        })

    @action(detail=False, methods=['get'])
    def dues(self, request):
        """
        Get due amounts for course completion
        Calculates total course fee - total paid per student
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        
        # Build student filter
        student_filter = Q()
        if course:
            student_filter &= Q(course=course)
        if intake:
            student_filter &= Q(intake=intake)
        if semester:
            student_filter &= Q(semester=semester)
        
        students = Student.objects.filter(student_filter).select_related('user')
        
        dues_list = []
        total_due = Decimal('0.00')
        total_paid = Decimal('0.00')
        
        for student in students:
            # Get total paid by student
            paid = Payment.objects.filter(student=student).aggregate(
                total=Sum('amount_paid')
            )['total'] or Decimal('0.00')
            
            # Get total fee for student's course/intake/semester
            fee_total = FeeStructure.objects.filter(
                course=student.course,
                intake=student.intake,
                semester=student.semester
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            due = fee_total - paid
            total_paid += paid
            total_due += max(due, Decimal('0.00'))
            
            if due > 0:
                dues_list.append({
                    'student_id': student.student_id,
                    'student_name': student.user.get_full_name(),
                    'course': student.course,
                    'intake': student.intake,
                    'semester': student.semester,
                    'total_fee': float(fee_total),
                    'total_paid': float(paid),
                    'due_amount': float(due)
                })
        
        # Sort by due amount descending
        dues_list.sort(key=lambda x: x['due_amount'], reverse=True)
        
        return Response({
            'report_type': 'dues',
            'filters': {'course': course, 'intake': intake, 'semester': semester},
            'summary': {
                'total_students': len(students),
                'students_with_dues': len(dues_list),
                'total_paid': float(total_paid),
                'total_due': float(total_due)
            },
            'data': dues_list
        })

    @action(detail=False, methods=['get'])
    def fee_type_summary(self, request):
        """
        Get payment summary by fee type
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        
        # Build filter
        payment_filter = Q()
        if course:
            payment_filter &= Q(student__course=course)
        if intake:
            payment_filter &= Q(student__intake=intake)
        
        # Aggregate by direct fee_type field
        fee_type_payments = Payment.objects.filter(payment_filter).exclude(
            fee_type__isnull=True
        ).exclude(fee_type='').values('fee_type').annotate(
            total_amount=Sum('amount_paid'),
            payment_count=Count('id')
        ).order_by('-total_amount')
        
        result = []
        for item in fee_type_payments:
            result.append({
                'fee_type': item['fee_type'],
                'total_amount': float(item['total_amount'] or 0),
                'payment_count': item['payment_count']
            })
        
        return Response({
            'report_type': 'fee_type_summary',
            'filters': {'course': course, 'intake': intake},
            'data': result
        })


class ResultReportViewSet(viewsets.ViewSet):
    """
    ViewSet for result/academic reports
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def exam_summary(self, request):
        """
        Get summary of all exams with pass/fail rates
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        
        # Build exam filter
        exam_filter = Q()
        if course:
            exam_filter &= Q(course=course)
        if intake:
            exam_filter &= Q(intake=intake)
        if semester:
            exam_filter &= Q(semester=semester)
        
        exams = Exam.objects.filter(exam_filter).order_by('-exam_date')
        
        exam_stats = []
        for exam in exams:
            results = exam.results.all()
            total_students = results.count()
            
            if total_students > 0:
                avg_marks = results.aggregate(avg=Sum('marks_obtained') / total_students)['avg'] or 0
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
                'intake': exam.intake,
                'semester': exam.semester,
                'exam_date': exam.exam_date,
                'total_marks': exam.total_marks,
                'total_students': total_students,
                'average_marks': float(avg_marks),
                'passed': passed,
                'failed': failed,
                'pass_rate': float(pass_rate)
            })
        
        return Response({
            'report_type': 'exam_summary',
            'filters': {'course': course, 'intake': intake, 'semester': semester},
            'data': exam_stats
        })

    @action(detail=False, methods=['get'])
    def grade_distribution(self, request):
        """
        Get grade distribution across all results or filtered
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        exam_id = request.query_params.get('exam_id')
        
        # Build result filter
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
        
        # Calculate grade distribution
        grade_counts = {
            'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0
        }
        
        for result in results:
            grade = result.calculate_grade()
            if grade in grade_counts:
                grade_counts[grade] += 1
        
        return Response({
            'report_type': 'grade_distribution',
            'filters': {'course': course, 'intake': intake, 'semester': semester, 'exam_id': exam_id},
            'total_results': results.count(),
            'distribution': grade_counts
        })
