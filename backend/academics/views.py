from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q
from django.http import FileResponse
from datetime import datetime

from .models import MajorMinorOption, Subject, Exam, Result, Attendance
from .serializers import (
    MajorMinorOptionSerializer, SubjectSerializer, ExamSerializer, ExamDetailSerializer,
    ResultSerializer, ResultDetailSerializer, BulkResultSerializer,
    AttendanceSerializer, AttendanceDetailSerializer, BulkAttendanceSerializer,
    AttendanceSessionSerializer
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
        Generate PDF report card for a student
        Query params: student_id (required), exam_id (optional - if not provided, generates semester report)
        """
        student_id = request.query_params.get('student_id')
        exam_id = request.query_params.get('exam_id')
        
        if not student_id:
            return Response(
                {'error': 'student_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdf_buffer = generate_report_card(student_id, exam_id)
            
            # Return PDF file response
            filename = f'report_card_{student_id}'
            if exam_id:
                filename += f'_{exam_id}'
            else:
                filename += '_semester'
            filename += '.pdf'
            
            response = FileResponse(
                pdf_buffer,
                content_type='application/pdf',
                as_attachment=True,
                filename=filename
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


class AttendancePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attendance model CRUD operations with additional endpoints
    for attendance management workflow.
    """
    queryset = Attendance.objects.select_related(
        'student', 'student__user', 'subject'
    ).all()
    permission_classes = [IsAuthenticated]
    pagination_class = AttendancePagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'intake', 'semester', 'subject', 'date', 'status']
    search_fields = [
        'student__student_id', 'student__user__first_name',
        'student__user__last_name', 'subject__name'
    ]
    ordering_fields = ['date', 'student__student_id', 'created_at']
    ordering = ['-date', 'student__student_id']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AttendanceDetailSerializer
        return AttendanceSerializer
    
    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        """
        Get dependent dropdown options for Course → Intake → Semester → Subject hierarchy.
        This endpoint helps populate the cascading dropdowns in the UI.
        """
        from accounts.models import Student
        
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        
        # All 8 semesters for a 4-year program
        ALL_SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
        
        # If no params, return all unique courses
        if not course:
            courses_qs = Student.objects.values_list('course', flat=True).distinct()
            # Use set to ensure uniqueness and sort
            courses = sorted(set(c for c in courses_qs if c))
            return Response({
                'courses': courses,
                'intakes': [],
                'semesters': [],
                'subjects': []
            })
        
        # If course provided, get intakes for that course
        intakes_qs = Student.objects.filter(course=course).values_list('intake', flat=True).distinct()
        # Use set to ensure uniqueness and sort
        intakes = sorted(set(i for i in intakes_qs if i))
        
        if not intake:
            return Response({
                'courses': [],
                'intakes': intakes,
                'semesters': [],
                'subjects': []
            })
        
        # If intake provided, return all 8 semesters (not just those with students)
        if not semester:
            return Response({
                'courses': [],
                'intakes': intakes,
                'semesters': ALL_SEMESTERS,
                'subjects': []
            })
        
        # If semester provided, get subjects for that course and semester
        subjects = Subject.objects.filter(
            course_code=course, semester=semester, is_active=True
        )
        subjects_data = SubjectSerializer(subjects, many=True).data
        
        return Response({
            'courses': [],
            'intakes': intakes,
            'semesters': ALL_SEMESTERS,
            'subjects': subjects_data
        })
    
    @action(detail=False, methods=['get'])
    def roster(self, request):
        """
        Fetch students for a specific Course/Intake/Semester/Subject.
        Also includes existing attendance data for the selected date to allow pre-fill.
        """
        from accounts.models import Student
        
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        subject_id = request.query_params.get('subject')
        date_str = request.query_params.get('date')
        
        if not all([course, intake, semester, subject_id]):
            return Response(
                {'error': 'course, intake, semester, and subject parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse date, default to today
        if date_str:
            try:
                selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            selected_date = datetime.now().date()
        
        # Get students matching the criteria
        students = Student.objects.filter(
            course=course,
            intake=intake,
            semester=semester
        ).select_related('user').order_by('student_id')
        
        # Check for existing attendance records
        existing_attendance = Attendance.objects.filter(
            course=course,
            intake=intake,
            semester=semester,
            subject_id=subject_id,
            date=selected_date
        ).values('student_id', 'status', 'id')
        
        attendance_map = {att['student_id']: att for att in existing_attendance}
        has_existing = len(attendance_map) > 0
        
        # Build roster with attendance status
        roster = []
        for student in students:
            att_record = attendance_map.get(student.id)
            roster.append({
                'id': student.id,
                'student_id': student.student_id,
                'name': student.user.get_full_name(),
                'photo': student.photo.url if student.photo else None,
                'status': att_record['status'] if att_record else 'present',
                'attendance_id': att_record['id'] if att_record else None,
            })
        
        return Response({
            'date': selected_date.isoformat(),
            'course': course,
            'intake': intake,
            'semester': semester,
            'subject_id': int(subject_id),
            'has_existing_attendance': has_existing,
            'total_students': len(roster),
            'roster': roster
        })
    
    @action(detail=False, methods=['post'])
    def bulk_submit(self, request):
        """
        Bulk endpoint to save/update attendance for all students in the list.
        Creates new records or updates existing ones.
        """
        course = request.data.get('course')
        intake = request.data.get('intake')
        semester = request.data.get('semester')
        subject_id = request.data.get('subject_id')
        date_str = request.data.get('date')
        session = request.data.get('session', '')
        attendance_list = request.data.get('attendance', [])
        
        if not all([course, intake, semester, subject_id, date_str]):
            return Response(
                {'error': 'course, intake, semester, subject_id, and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response(
                {'error': 'Subject not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from accounts.models import Student
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for item in attendance_list:
            serializer = BulkAttendanceSerializer(data=item)
            if not serializer.is_valid():
                errors.append({
                    'student_id': item.get('student_id'),
                    'error': serializer.errors
                })
                continue
            
            try:
                student = Student.objects.get(id=serializer.validated_data['student_id'])
                
                attendance, created = Attendance.objects.update_or_create(
                    student=student,
                    subject=subject,
                    date=selected_date,
                    defaults={
                        'status': serializer.validated_data['status'],
                        'course': course,
                        'intake': intake,
                        'semester': semester,
                        'session': session or student.session,
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
            except Student.DoesNotExist:
                errors.append({
                    'student_id': item.get('student_id'),
                    'error': 'Student not found'
                })
        
        return Response({
            'success': True,
            'message': f'Attendance saved: {created_count} created, {updated_count} updated',
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Fetch past attendance sessions with pagination and filtering.
        Returns summarized attendance sessions grouped by date/subject.
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        subject_id = request.query_params.get('subject')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        limit = int(request.query_params.get('limit', 10))
        
        # Build base queryset
        queryset = Attendance.objects.values(
            'date', 'course', 'intake', 'semester', 'session',
            'subject', 'subject__name', 'subject__code'
        ).annotate(
            total_students=Count('id'),
            present_count=Count('id', filter=Q(status='present')),
            absent_count=Count('id', filter=Q(status='absent'))
        ).order_by('-date')
        
        # Apply filters
        if course:
            queryset = queryset.filter(course=course)
        if intake:
            queryset = queryset.filter(intake=intake)
        if semester:
            queryset = queryset.filter(semester=semester)
        if subject_id:
            queryset = queryset.filter(subject=subject_id)
        if date_from:
            try:
                date_from_parsed = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=date_from_parsed)
            except ValueError:
                pass
        if date_to:
            try:
                date_to_parsed = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=date_to_parsed)
            except ValueError:
                pass
        
        # Limit results
        sessions = list(queryset[:limit])
        
        # Format response
        result = []
        for session in sessions:
            result.append({
                'date': session['date'],
                'course': session['course'],
                'intake': session['intake'],
                'semester': session['semester'],
                'session': session['session'],
                'subject_id': session['subject'],
                'subject_name': session['subject__name'],
                'subject_code': session['subject__code'],
                'total_students': session['total_students'],
                'present_count': session['present_count'],
                'absent_count': session['absent_count'],
            })
        
        return Response({
            'count': len(result),
            'sessions': result
        })
    
    @action(detail=False, methods=['get'])
    def session_details(self, request):
        """
        Get detailed attendance records for a specific session (date + subject + context).
        Used for viewing/editing past attendance.
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        subject_id = request.query_params.get('subject')
        date_str = request.query_params.get('date')
        
        if not all([course, intake, semester, subject_id, date_str]):
            return Response(
                {'error': 'course, intake, semester, subject, and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendance_records = self.queryset.filter(
            course=course,
            intake=intake,
            semester=semester,
            subject_id=subject_id,
            date=selected_date
        ).order_by('student__student_id')
        
        serializer = AttendanceDetailSerializer(attendance_records, many=True)
        
        # Get subject info
        try:
            subject = Subject.objects.get(id=subject_id)
            subject_info = {
                'id': subject.id,
                'name': subject.name,
                'code': subject.code
            }
        except Subject.DoesNotExist:
            subject_info = None
        
        present_count = attendance_records.filter(status='present').count()
        absent_count = attendance_records.filter(status='absent').count()
        
        return Response({
            'date': selected_date.isoformat(),
            'course': course,
            'intake': intake,
            'semester': semester,
            'subject': subject_info,
            'total_students': attendance_records.count(),
            'present_count': present_count,
            'absent_count': absent_count,
            'records': serializer.data
        })
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """
        Update a single attendance record's status.
        """
        attendance = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['present', 'absent']:
            return Response(
                {'error': 'Status must be "present" or "absent"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendance.status = new_status
        attendance.save()
        
        serializer = AttendanceSerializer(attendance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_session_date(self, request):
        """
        Update the date for an entire attendance session.
        Used when attendance was logged on the wrong day.
        """
        course = request.data.get('course')
        intake = request.data.get('intake')
        semester = request.data.get('semester')
        subject_id = request.data.get('subject_id')
        old_date_str = request.data.get('old_date')
        new_date_str = request.data.get('new_date')
        
        if not all([course, intake, semester, subject_id, old_date_str, new_date_str]):
            return Response(
                {'error': 'All parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            old_date = datetime.strptime(old_date_str, '%Y-%m-%d').date()
            new_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if attendance already exists for the new date
        existing = Attendance.objects.filter(
            course=course,
            intake=intake,
            semester=semester,
            subject_id=subject_id,
            date=new_date
        ).exists()
        
        if existing:
            return Response(
                {'error': 'Attendance already exists for the new date. Delete it first or choose another date.'},
                status=status.HTTP_409_CONFLICT
            )
        
        # Update all records
        updated = Attendance.objects.filter(
            course=course,
            intake=intake,
            semester=semester,
            subject_id=subject_id,
            date=old_date
        ).update(date=new_date)
        
        return Response({
            'success': True,
            'message': f'Updated {updated} attendance records from {old_date} to {new_date}',
            'updated_count': updated
        })
    
    @action(detail=False, methods=['delete'])
    def delete_session(self, request):
        """
        Delete all attendance records for a specific session.
        """
        course = request.query_params.get('course')
        intake = request.query_params.get('intake')
        semester = request.query_params.get('semester')
        subject_id = request.query_params.get('subject')
        date_str = request.query_params.get('date')
        
        if not all([course, intake, semester, subject_id, date_str]):
            return Response(
                {'error': 'All parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count, _ = Attendance.objects.filter(
            course=course,
            intake=intake,
            semester=semester,
            subject_id=subject_id,
            date=selected_date
        ).delete()
        
        return Response({
            'success': True,
            'message': f'Deleted {deleted_count} attendance records',
            'deleted_count': deleted_count
        })
    
    @action(detail=False, methods=['get'])
    def student_attendance(self, request):
        """
        Get attendance summary for a specific student.
        """
        student_id = request.query_params.get('student_id')
        subject_id = request.query_params.get('subject')

        if getattr(request.user, 'role', None) == 'STUDENT':
            student_profile = getattr(request.user, 'student_profile', None)
            if not student_profile:
                return Response(
                    {'error': 'Student profile not found for this account'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            student_id = student_profile.id
        elif not student_id:
            return Response(
                {'error': 'student_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.queryset.filter(student_id=student_id)
        
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        total = queryset.count()
        present = queryset.filter(status='present').count()
        absent = queryset.filter(status='absent').count()
        
        attendance_records = AttendanceSerializer(queryset[:50], many=True).data
        
        return Response({
            'student_id': student_id,
            'total_classes': total,
            'present': present,
            'absent': absent,
            'attendance_percentage': round((present / total * 100), 2) if total > 0 else 0,
            'records': attendance_records
        })
