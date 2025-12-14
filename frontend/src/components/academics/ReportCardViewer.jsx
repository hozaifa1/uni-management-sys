import { useState, useEffect, useMemo } from 'react';
import { Download, FileText, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ReportCardViewer = () => {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);
        const [studentsRes, examsRes, resultsRes] = await Promise.all([
          api.get('/accounts/students/'),
          api.get('/academics/exams/'),
          api.get('/academics/results/')
        ]);
        setStudents(studentsRes.data.results || studentsRes.data || []);
        setExams(examsRes.data.results || examsRes.data || []);
        setResults(resultsRes.data.results || resultsRes.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, []);

  // Extract unique values from results that actually have data
  const availableOptions = useMemo(() => {
    const studentIdsWithResults = new Set(results.map(r => r.student));
    const examIdsWithResults = new Set(results.map(r => r.exam));
    
    // Get students that have results
    const studentsWithResults = students.filter(s => studentIdsWithResults.has(s.id));
    
    // Extract unique courses/intakes/semesters/sessions from students with results
    const courses = [...new Set(studentsWithResults.map(s => s.course).filter(Boolean))];
    const intakes = [...new Set(studentsWithResults.map(s => s.intake).filter(Boolean))];
    const semesters = [...new Set(studentsWithResults.map(s => s.semester).filter(Boolean))];
    const sessions = [...new Set(studentsWithResults.map(s => s.session).filter(Boolean))];
    
    // Get exams that have results
    const examsWithResults = exams.filter(e => examIdsWithResults.has(e.id));
    
    return {
      courses,
      intakes,
      semesters,
      sessions,
      studentsWithResults,
      examsWithResults,
      studentIdsWithResults,
      examIdsWithResults
    };
  }, [results, students, exams]);

  // Filter options based on current selections
  const filteredOptions = useMemo(() => {
    let filteredStudents = availableOptions.studentsWithResults;
    
    // Filter students by selected course/intake/semester/session
    if (selectedCourse) {
      filteredStudents = filteredStudents.filter(s => s.course === selectedCourse);
    }
    if (selectedIntake) {
      filteredStudents = filteredStudents.filter(s => s.intake === selectedIntake);
    }
    if (selectedSemester) {
      filteredStudents = filteredStudents.filter(s => s.semester === selectedSemester);
    }
    if (selectedSession) {
      filteredStudents = filteredStudents.filter(s => s.session === selectedSession);
    }
    
    // Get available intakes based on selected course
    let availableIntakes = availableOptions.intakes;
    if (selectedCourse) {
      availableIntakes = [...new Set(
        availableOptions.studentsWithResults
          .filter(s => s.course === selectedCourse)
          .map(s => s.intake)
          .filter(Boolean)
      )];
    }
    
    // Get available semesters based on selected course and intake
    let availableSemesters = availableOptions.semesters;
    if (selectedCourse || selectedIntake) {
      availableSemesters = [...new Set(
        availableOptions.studentsWithResults
          .filter(s => (!selectedCourse || s.course === selectedCourse) && 
                       (!selectedIntake || s.intake === selectedIntake))
          .map(s => s.semester)
          .filter(Boolean)
      )];
    }
    
    // Get available sessions based on selected course, intake, semester
    let availableSessions = availableOptions.sessions;
    if (selectedCourse || selectedIntake || selectedSemester) {
      availableSessions = [...new Set(
        availableOptions.studentsWithResults
          .filter(s => (!selectedCourse || s.course === selectedCourse) && 
                       (!selectedIntake || s.intake === selectedIntake) &&
                       (!selectedSemester || s.semester === selectedSemester))
          .map(s => s.session)
          .filter(Boolean)
      )];
    }
    
    // Get exams that have results for the selected student OR match the course/intake/semester filters
    let filteredExams = availableOptions.examsWithResults;
    if (selectedStudent) {
      // Only show exams where this student has results
      const studentExamIds = new Set(
        results
          .filter(r => r.student === parseInt(selectedStudent) || r.student === selectedStudent)
          .map(r => r.exam)
      );
      filteredExams = filteredExams.filter(e => studentExamIds.has(e.id));
    } else if (selectedCourse || selectedIntake || selectedSemester) {
      // Filter exams by course/intake/semester
      filteredExams = filteredExams.filter(e => 
        (!selectedCourse || e.course === selectedCourse) &&
        (!selectedIntake || e.intake === selectedIntake) &&
        (!selectedSemester || e.semester === selectedSemester)
      );
    }
    
    return {
      students: filteredStudents,
      exams: filteredExams,
      intakes: availableIntakes,
      semesters: availableSemesters,
      sessions: availableSessions
    };
  }, [availableOptions, selectedCourse, selectedIntake, selectedSemester, selectedSession, selectedStudent, results]);

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setSelectedIntake('');
    setSelectedSemester('');
    setSelectedSession('');
    setSelectedStudent('');
    setSelectedExam('');
  };

  const handleIntakeChange = (value) => {
    setSelectedIntake(value);
    setSelectedStudent('');
    setSelectedExam('');
  };

  const handleSemesterChange = (value) => {
    setSelectedSemester(value);
    setSelectedStudent('');
    setSelectedExam('');
  };

  const handleSessionChange = (value) => {
    setSelectedSession(value);
    setSelectedStudent('');
    setSelectedExam('');
  };

  // Handle student selection - back-propagate course/intake/semester/session
  const handleStudentChange = (studentId) => {
    setSelectedStudent(studentId);
    setSelectedExam(''); // Reset exam when student changes
    if (studentId) {
      const student = students.find(s => s.id === parseInt(studentId) || s.id === studentId);
      if (student) {
        if (student.course) setSelectedCourse(student.course);
        if (student.intake) setSelectedIntake(student.intake);
        if (student.semester) setSelectedSemester(student.semester);
        if (student.session) setSelectedSession(student.session);
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedStudent || !selectedExam) {
      setError('Please select both student and exam');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(
        `/academics/results/generate_report_card/?student_id=${selectedStudent}&exam_id=${selectedExam}`,
        {
          responseType: 'blob'
        }
      );

      const student = students.find(s => s.id === parseInt(selectedStudent) || s.id === selectedStudent);
      const studentName = student?.student_id || selectedStudent;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_card_${studentName}_${selectedExam}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Report card downloaded successfully!');
    } catch (error) {
      console.error('Error downloading report card:', error);
      const errorMsg = 'Failed to download report card. Please ensure the student has results for this exam.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = () => {
    if (!selectedStudent || !selectedExam) {
      setError('Please select both student and exam');
      return;
    }

    const student = students.find(s => s.id === parseInt(selectedStudent) || s.id === selectedStudent);
    const exam = exams.find(e => e.id === parseInt(selectedExam) || e.id === selectedExam);
    
    if (!student) {
      setError('Student not found');
      return;
    }

    const studentEmail = student.user?.email || '';
    const studentName = student.user?.first_name 
      ? `${student.user.first_name} ${student.user.last_name || ''}`.trim()
      : student.student_id;
    const examName = exam?.name || 'Exam';
    
    if (!studentEmail) {
      toast.error('Student does not have an email address registered');
      setError('Student does not have an email address registered');
      return;
    }

    const subject = encodeURIComponent(`Report Card - ${examName}`);
    const body = encodeURIComponent(
      `Dear ${studentName},\n\nPlease find attached your report card for ${examName}.\n\nBest regards,\nIGMIS Administration`
    );
    
    window.open(`mailto:${studentEmail}?subject=${subject}&body=${body}`, '_blank');
    toast.success(`Opening email client for ${studentEmail}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <FileText className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Report Card Viewer</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {dataLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      ) : (
        <>
          {/* Row 1: Course/Intake/Semester/Session Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Course Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Courses ({availableOptions.courses.length})</option>
                {availableOptions.courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            {/* Intake Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Intake</label>
              <select
                value={selectedIntake}
                onChange={(e) => handleIntakeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Intakes ({filteredOptions.intakes.length})</option>
                {filteredOptions.intakes.map((intake) => (
                  <option key={intake} value={intake}>
                    {intake}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Semesters ({filteredOptions.semesters.length})</option>
                {filteredOptions.semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Session</label>
              <select
                value={selectedSession}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Sessions ({filteredOptions.sessions.length})</option>
                {filteredOptions.sessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Student and Exam Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student ({filteredOptions.students.length} with results)
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a student...</option>
                {filteredOptions.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.student_id} - {student.user?.first_name} {student.user?.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Exam ({filteredOptions.exams.length} with results)
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an exam...</option>
                {filteredOptions.exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} - {new Date(exam.exam_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      {!dataLoading && (
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleDownload}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5 mr-2" />
          {loading ? 'Downloading...' : 'Download PDF'}
        </button>

        <button
          onClick={handleSendEmail}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Mail className="w-5 h-5 mr-2" />
          Send to Email
        </button>
      </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Only students with existing results are shown. Select a student and an exam to download or email their report card.
        </p>
      </div>
    </div>
  );
};

export default ReportCardViewer;

