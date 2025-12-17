"""
Utility functions for academics app
Includes PDF report card generation
"""
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.conf import settings
from datetime import datetime

from accounts.models import Student
from academics.models import Exam, Result


def generate_report_card(student_id, exam_id=None):
    """
    Generate a PDF report card for a student's results
    
    Args:
        student_id: ID of the student
        exam_id: ID of the exam (optional - if not provided, generates semester report with all results)
    
    Returns:
        BytesIO buffer containing the PDF
    """
    # Get student
    try:
        student = Student.objects.select_related('user').get(id=student_id)
    except Student.DoesNotExist:
        raise ValueError("Student not found")
    
    # Get exam if specified
    exam = None
    if exam_id:
        try:
            exam = Exam.objects.get(id=exam_id)
        except Exam.DoesNotExist:
            raise ValueError("Exam not found")
        # Get results for specific exam
        results = Result.objects.filter(
            student=student,
            exam=exam
        ).select_related('subject', 'exam').order_by('subject__name')
    else:
        # Get all results for student's current semester
        results = Result.objects.filter(
            student=student
        ).select_related('subject', 'exam').order_by('subject__name', 'exam__exam_type')
    
    if not results.exists():
        raise ValueError("No results found for this student")
    
    # Create PDF buffer - compact margins to fit on 1 page
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=25, leftMargin=25, topMargin=20, bottomMargin=20)
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#2d3748'),
        spaceAfter=10,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=6,
        spaceBefore=8,
        fontName='Helvetica-Bold'
    )
    
    # Title
    elements.append(Paragraph("IGMIS University", title_style))
    elements.append(Paragraph("Academic Transcript", subtitle_style))
    elements.append(Spacer(1, 0.1*inch))
    
    # Student Information (removed email and phone per requirements)
    elements.append(Paragraph("Student Information", heading_style))
    
    student_data = [
        ['Student ID:', student.student_id, 'Name:', student.user.get_full_name()],
        ['Course:', student.course, 'Intake:', student.intake],
        ['Semester:', student.semester, 'Session:', student.session],
    ]
    
    student_table = Table(student_data, colWidths=[1.5*inch, 2*inch, 1.2*inch, 2*inch])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0'))
    ]))
    
    elements.append(student_table)
    elements.append(Spacer(1, 0.15*inch))
    
    # Exam Information - only show if specific exam was requested
    if exam:
        elements.append(Paragraph("Examination Details", heading_style))
        
        exam_data = [
            ['Exam Name:', exam.name],
            ['Exam Type:', exam.get_exam_type_display()],
            ['Exam Date:', exam.exam_date.strftime('%B %d, %Y')],
        ]
        
        exam_table = Table(exam_data, colWidths=[2*inch, 4.5*inch])
        exam_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0'))
        ]))
        
        elements.append(exam_table)
        elements.append(Spacer(1, 0.15*inch))
        
        # Results Table - Single exam format
        elements.append(Paragraph("Subject-wise Performance", heading_style))
        results_data = [['Subject', 'Code', 'Marks', 'Obtained', '%', 'Grade', 'Comment']]
    else:
        # Semester report - show all exam results grouped by subject
        elements.append(Paragraph("Semester Results Summary", heading_style))
        results_data = [['Subject', 'Exam Type', 'Marks', 'Obtained', '%', 'Grade']]
    
    total_marks_possible = 0
    total_marks_obtained = 0
    
    for result in results:
        percentage = result.get_percentage()
        grade = result.calculate_grade()
        
        if exam:
            # Single exam format - include comments
            comment = (result.teacher_comment or '')[:30]
            if result.teacher_comment and len(result.teacher_comment) > 30:
                comment += '...'
            
            results_data.append([
                result.subject.name[:20],
                result.subject.code,
                str(result.subject.total_marks),
                f"{result.marks_obtained:.1f}",
                f"{percentage:.1f}%",
                grade,
                comment
            ])
        else:
            # Semester report format - include exam type
            exam_type_display = result.exam.get_exam_type_display() if result.exam else 'N/A'
            results_data.append([
                result.subject.name[:25],
                exam_type_display,
                str(result.subject.total_marks),
                f"{result.marks_obtained:.1f}",
                f"{percentage:.1f}%",
                grade
            ])
        
        total_marks_possible += result.subject.total_marks
        total_marks_obtained += float(result.marks_obtained)
    
    # Calculate overall statistics
    overall_percentage = (total_marks_obtained / total_marks_possible * 100) if total_marks_possible > 0 else 0
    
    # Add totals row
    if exam:
        results_data.append([
            'TOTAL',
            '',
            str(total_marks_possible),
            f"{total_marks_obtained:.1f}",
            f"{overall_percentage:.1f}%",
            calculate_overall_grade(overall_percentage),
            ''
        ])
        results_table = Table(results_data, colWidths=[1.4*inch, 0.7*inch, 0.6*inch, 0.7*inch, 0.6*inch, 0.5*inch, 1.6*inch])
    else:
        results_data.append([
            'TOTAL',
            '',
            str(total_marks_possible),
            f"{total_marks_obtained:.1f}",
            f"{overall_percentage:.1f}%",
            calculate_overall_grade(overall_percentage)
        ])
        results_table = Table(results_data, colWidths=[1.8*inch, 1.0*inch, 0.7*inch, 0.7*inch, 0.7*inch, 0.6*inch])
    results_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        
        # Data rows
        ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -2), colors.HexColor('#2d3748')),
        ('ALIGN', (0, 1), (0, -2), 'LEFT'),
        ('ALIGN', (1, 1), (-2, -2), 'CENTER'),
        ('ALIGN', (-1, 1), (-1, -2), 'LEFT'),  # Comments left aligned
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -2), 4),
        ('TOPPADDING', (0, 1), (-1, -2), 4),
        
        # Total row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#4299e1')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.whitesmoke),
        ('ALIGN', (0, -1), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 5),
        ('TOPPADDING', (0, -1), (-1, -1), 5),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#718096'))
    ]))
    
    elements.append(results_table)
    elements.append(Spacer(1, 0.15*inch))
    
    # Performance Summary - compact version
    elements.append(Paragraph("Performance Summary", heading_style))
    
    # Calculate GPA (simplified)
    gpa = calculate_gpa(overall_percentage)
    
    # Horizontal summary to save space
    summary_data = [
        ['Percentage:', f"{overall_percentage:.1f}%", 'Grade:', calculate_overall_grade(overall_percentage), 'GPA:', f"{gpa:.2f}", 'Result:', 'PASS' if overall_percentage >= 40 else 'FAIL'],
    ]
    
    summary_table = Table(summary_data, colWidths=[0.8*inch, 0.7*inch, 0.6*inch, 0.5*inch, 0.5*inch, 0.5*inch, 0.6*inch, 0.6*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (2, 0), (2, 0), colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (4, 0), (4, 0), colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (6, 0), (6, 0), colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTNAME', (4, 0), (4, 0), 'Helvetica-Bold'),
        ('FONTNAME', (6, 0), (6, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0'))
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#718096'),
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y %I:%M %p')} | Computer-generated document", footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF value
    buffer.seek(0)
    return buffer


def calculate_overall_grade(percentage):
    """Calculate letter grade based on percentage"""
    if percentage >= 80:
        return 'A+'
    elif percentage >= 70:
        return 'A'
    elif percentage >= 60:
        return 'A-'
    elif percentage >= 50:
        return 'B'
    elif percentage >= 40:
        return 'C'
    elif percentage >= 33:
        return 'D'
    else:
        return 'F'


def calculate_gpa(percentage):
    """Calculate GPA based on percentage (4.0 scale)"""
    if percentage >= 80:
        return 4.0
    elif percentage >= 70:
        return 3.5
    elif percentage >= 60:
        return 3.0
    elif percentage >= 50:
        return 2.5
    elif percentage >= 40:
        return 2.0
    elif percentage >= 33:
        return 1.0
    else:
        return 0.0


def generate_bulk_report_cards(course=None, intake=None, semester=None, session=None, exam_id=None):
    """
    Generate report cards for all students matching the criteria for a specific exam
    
    Args:
        course: Course code (optional)
        intake: Intake number (optional)
        semester: Semester (optional)
        session: Academic session (optional)
        exam_id: ID of the exam
    
    Returns:
        List of tuples (student_name, pdf_buffer)
    """
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        raise ValueError("Exam not found")
    
    # Build filter for students
    student_filter = {}
    if course:
        student_filter['course'] = course
    if intake:
        student_filter['intake'] = intake
    if semester:
        student_filter['semester'] = semester
    if session:
        student_filter['session'] = session
    
    # Get students matching the criteria
    students = Student.objects.filter(**student_filter)
    
    report_cards = []
    for student in students:
        # Check if student has results for this exam
        if Result.objects.filter(student=student, exam=exam).exists():
            try:
                pdf_buffer = generate_report_card(student.id, exam_id)
                report_cards.append((student.user.get_full_name(), pdf_buffer))
            except Exception as e:
                print(f"Error generating report card for {student.user.get_full_name()}: {str(e)}")
    
    return report_cards

