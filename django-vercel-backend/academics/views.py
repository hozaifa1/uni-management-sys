from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q
from django.http import FileResponse

from .models import MajorMinorOption, Subject, Exam, Result
from .serializers import (
    MajorMinorOptionSerializer, SubjectSerializer, ExamSerializer, ExamDetailSerializer,
    ResultSerializer, ResultDetailSerializer, BulkResultSerializer
)
from .utils import generate_report_card, generate_bulk_report_cards


class MajorMinorOptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MajorMinorOption model CRUD operations
    """
    queryset = MajorMinorOption.objects.filter(is_active=True)
    serializer_class = MajorMinorOptionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'option_type', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'course']
    ordering = ['course', 'name']
    
    @action(detail=False, methods=['get'])
    def by_course(self, request):
        """Get major options filtered by course"""
        course = request.query_params.get('course')
        if not course:
            return Response(
                {'error': 'course parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        majors = self.queryset.filter(course=course)
        serializer = self.get_serializer(majors, many=True)
        return Response(serializer.data)


class SubjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Subject model CRUD operations
    """
    queryset = Subject.objects.select_related('course', 'major').all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'course_code', 'semester', 'subject_type', 'major', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'semester', 'course_code']
    ordering = ['course_code', 'semester', 'code']
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get all results for a specific subject"""
        subject = self.get_object()
        results = subject.results.select_related('student', 'exam').all()
        serializer = ResultSerializer(results, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_semester(self, request):
        """Get subjects grouped by semester for a course"""
        course_code = request.query_params.get('course_code')
        if not course_code:
            return Response(
                {'error': 'course_code parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        subjects = self.queryset.filter(course_code=course_code, is_active=True)
        
        # Group by semester
        grouped = {}
        for subject in subjects:
            sem = subject.semester
            if sem not in grouped:
                grouped[sem] = []
            grouped[sem].append(SubjectSerializer(subject).data)
        
        return Response(grouped)


class ExamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Exam model CRUD operations
    """
    queryset = Exam.objects.select_related('subject').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['exam_type', 'course', 'semester', 'subject', 'exam_date']
    search_fields = ['name', 'description', 'subject__name']
    ordering_fields = ['exam_date', 'name', 'subject__name']
    ordering = ['-exam_date']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ExamDetailSerializer
        return ExamSerializer
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get all results for a specific exam"""
        exam = self.get_object()
        results = exam.results.select_related(
            'student', 'student__user', 'subject'
        ).all()
        serializer = ResultSerializer(results, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get exam statistics"""
        exam = self.get_object()
        results = exam.results.all()
        
        if not results.exists():
            return Response({
                'message': 'No results available for this exam',
                'total_students': 0
            })
        
        # Calculate statistics
        total_students = results.count()
        average_marks = results.aggregate(avg=Avg('marks_obtained'))['avg'] or 0
        
        # Calculate pass/fail (assuming 33% is passing)
        passing_marks = exam.total_marks * 0.33
        passed = results.filter(marks_obtained__gte=passing_marks).count()
        failed = total_students - passed
        pass_rate = (passed / total_students * 100) if total_students > 0 else 0
        
        # Grade distribution
        grade_distribution = {
            'A+': results.filter(marks_obtained__gte=exam.total_marks * 0.8).count(),
            'A': results.filter(
                marks_obtained__gte=exam.total_marks * 0.7,
                marks_obtained__lt=exam.total_marks * 0.8
            ).count(),
            'A-': results.filter(
                marks_obtained__gte=exam.total_marks * 0.6,
                marks_obtained__lt=exam.total_marks * 0.7
            ).count(),
            'B': results.filter(
                marks_obtained__gte=exam.total_marks * 0.5,
                marks_obtained__lt=exam.total_marks * 0.6
            ).count(),
            'C': results.filter(
                marks_obtained__gte=exam.total_marks * 0.4,
                marks_obtained__lt=exam.total_marks * 0.5
            ).count(),
            'D': results.filter(
                marks_obtained__gte=exam.total_marks * 0.33,
                marks_obtained__lt=exam.total_marks * 0.4
            ).count(),
            'F': results.filter(marks_obtained__lt=exam.total_marks * 0.33).count(),
        }
        
        return Response({
            'exam': ExamSerializer(exam).data,
            'total_students': total_students,
            'average_marks': float(average_marks),
            'passed': passed,
            'failed': failed,
            'pass_rate': float(pass_rate),
            'grade_distribution': grade_distribution
        })


class ResultViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Result model CRUD operations
    """
    queryset = Result.objects.select_related(
        'student', 'student__user', 'exam', 'subject'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'exam', 'subject']
    search_fields = [
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'exam__name', 'subject__name'
    ]
    ordering_fields = ['exam__exam_date', 'marks_obtained']
    ordering = ['-exam__exam_date']
    
    def get_queryset(self):
        """
        Filter results by course, intake, and semester through the student.
        """
        queryset = super().get_queryset()
        
        course = self.request.query_params.get('course')
        intake = self.request.query_params.get('intake')
        semester = self.request.query_params.get('semester')
        
        if course:
            queryset = queryset.filter(student__course=course)
        if intake:
            queryset = queryset.filter(student__intake=intake)
        if semester:
            queryset = queryset.filter(student__semester=semester)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ResultDetailSerializer
        return ResultSerializer
    
    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """
        Bulk upload results from CSV data
        Expected format: student_id, subject_code, marks_obtained, remarks
        """
        exam_id = request.data.get('exam_id')
        results_data = request.data.get('results', [])
        
        if not exam_id:
            return Response(
                {'error': 'exam_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            exam = Exam.objects.get(id=exam_id)
        except Exam.DoesNotExist:
            return Response(
                {'error': 'Exam not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate and create results
        created_results = []
        errors = []
        
        from accounts.models import Student
        
        for idx, result_data in enumerate(results_data):
            serializer = BulkResultSerializer(data=result_data)
            
            if serializer.is_valid():
                try:
                    # Get student and subject
                    student = Student.objects.get(
                        student_id=serializer.validated_data['student_id']
                    )
                    subject = Subject.objects.get(
                        code=serializer.validated_data['subject_code']
                    )
                    
                    # Create or update result
                    result, created = Result.objects.update_or_create(
                        student=student,
                        exam=exam,
                        subject=subject,
                        defaults={
                            'marks_obtained': serializer.validated_data['marks_obtained'],
                            'remarks': serializer.validated_data.get('remarks', '')
                        }
                    )
                    
                    created_results.append(ResultSerializer(result).data)
                    
                except Student.DoesNotExist:
                    errors.append({
                        'row': idx + 1,
                        'error': f"Student with ID {serializer.validated_data['student_id']} not found"
                    })
                except Subject.DoesNotExist:
                    errors.append({
                        'row': idx + 1,
                        'error': f"Subject with code {serializer.validated_data['subject_code']} not found"
                    })
            else:
                errors.append({
                    'row': idx + 1,
                    'error': serializer.errors
                })
        
        return Response({
            'created': len(created_results),
            'errors': len(errors),
            'results': created_results,
            'error_details': errors
        }, status=status.HTTP_201_CREATED if created_results else status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def student_results(self, request):
        """Get all results for a specific student"""
        student_id = request.query_params.get('student_id')
        
        if not student_id:
            return Response(
                {'error': 'student_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = self.queryset.filter(student__id=student_id)
        
        page = self.paginate_queryset(results)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def report_card(self, request, pk=None):
        """
        Generate report card for a student and exam
        (This will be expanded in Day 7 with PDF generation)
        """
        result = self.get_object()
        student = result.student
        exam = result.exam
        
        # Get all results for this student and exam
        results = Result.objects.filter(
            student=student,
            exam=exam
        ).select_related('subject')
        
        # Calculate totals
        total_marks = sum(r.subject.total_marks for r in results)
        marks_obtained = sum(float(r.marks_obtained) for r in results)
        percentage = (marks_obtained / total_marks * 100) if total_marks > 0 else 0
        
        # Calculate overall grade
        if percentage >= 80:
            grade = 'A+'
        elif percentage >= 70:
            grade = 'A'
        elif percentage >= 60:
            grade = 'A-'
        elif percentage >= 50:
            grade = 'B'
        elif percentage >= 40:
            grade = 'C'
        elif percentage >= 33:
            grade = 'D'
        else:
            grade = 'F'
        
        from accounts.serializers import StudentSerializer
        
        return Response({
            'student': StudentSerializer(student).data,
            'exam': ExamSerializer(exam).data,
            'results': ResultSerializer(results, many=True).data,
            'total_marks': total_marks,
            'marks_obtained': marks_obtained,
            'percentage': percentage,
            'grade': grade
        })
    
    @action(detail=False, methods=['get'])
    def generate_report_card(self, request):
        """
        Generate PDF report card for a student's exam
        Query params: student_id, exam_id
        """
        student_id = request.query_params.get('student_id')
        exam_id = request.query_params.get('exam_id')
        
        if not student_id or not exam_id:
            return Response(
                {'error': 'student_id and exam_id parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdf_buffer = generate_report_card(student_id, exam_id)
            
            # Return PDF file response
            response = FileResponse(
                pdf_buffer,
                content_type='application/pdf',
                as_attachment=True,
                filename=f'report_card_{student_id}_{exam_id}.pdf'
            )
            return response
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating report card: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def generate_bulk_report_cards(self, request):
        """
        Generate PDF report cards for all students by course/intake/semester/session
        Query params: course, intake, semester, session, exam_id
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        session = request.query_params.get('session')
        exam_id = request.query_params.get('exam_id')
        
        if not exam_id:
            return Response(
                {'error': 'exam_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            report_cards = generate_bulk_report_cards(
                course=course, intake=intake, semester=semester, 
                session=session, exam_id=exam_id
            )
            
            if not report_cards:
                return Response(
                    {'error': 'No report cards could be generated. Check if students have results for this exam.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response({
                'success': True,
                'count': len(report_cards),
                'message': f'Generated {len(report_cards)} report cards successfully'
            })
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating report cards: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
