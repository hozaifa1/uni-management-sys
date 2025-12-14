import { useState, useEffect } from 'react';
import { Download, Eye, FileText, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const COURSE_OPTIONS = [
  { value: 'BBA', label: 'BBA' },
  { value: 'MBA', label: 'MBA' },
  { value: 'CSE', label: 'CSE' },
  { value: 'THM', label: 'THM' },
];
const INTAKE_OPTIONS = {
  BBA: ['15th', '16th', '17th', '18th', '19th', '20th'],
  MBA: ['9th', '10th'],
  CSE: ['1st', '2nd'],
  THM: ['1st'],
};
const SEMESTER_OPTIONS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

const ReportCardViewer = () => {
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
        const [studentsRes, examsRes] = await Promise.all([
          api.get('/accounts/students/'),
          api.get('/academics/exams/')
        ]);
        setStudents(studentsRes.data.results || studentsRes.data || []);
        setExams(examsRes.data.results || examsRes.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch exams filtered by course/intake/semester when filters change
  useEffect(() => {
    const fetchFilteredExams = async () => {
      try {
        const params = {};
        if (selectedCourse) params.course = selectedCourse;
        if (selectedIntake) params.intake = selectedIntake;
        if (selectedSemester) params.semester = selectedSemester;
        if (selectedSession) params.session = selectedSession;
        const examsRes = await api.get('/academics/exams/', { params });
        setExams(examsRes.data.results || examsRes.data || []);
      } catch (err) {
        console.error('Error fetching exams:', err);
      }
    };
    if (!dataLoading) {
      fetchFilteredExams();
    }
  }, [selectedCourse, selectedIntake, selectedSemester, selectedSession, dataLoading]);

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setSelectedIntake('');
    setSelectedStudent('');
    setSelectedExam('');
  };

  // Handle student selection - back-propagate course/intake/semester/session
  const handleStudentChange = (studentId) => {
    setSelectedStudent(studentId);
    if (studentId) {
      const student = students.find(s => s.id === parseInt(studentId) || s.id === studentId);
      if (student) {
        // Back-propagate student's course/intake/semester/session
        if (student.course) setSelectedCourse(student.course);
        if (student.intake) setSelectedIntake(student.intake);
        if (student.semester) setSelectedSemester(student.semester);
        if (student.session) setSelectedSession(student.session);
      }
    }
  };

  // Filter students based on selected course/intake/semester/session
  const filteredStudents = students.filter(student => {
    if (selectedCourse && student.course !== selectedCourse) return false;
    if (selectedIntake && student.intake !== selectedIntake) return false;
    if (selectedSemester && student.semester !== selectedSemester) return false;
    if (selectedSession && student.session !== selectedSession) return false;
    return true;
  });

  const handlePreview = async () => {
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

      // Create a blob URL and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing report card:', error);
      const errorMsg = 'Failed to preview report card. Please ensure the student has results for this exam.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
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

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_card_${selectedStudent}_${selectedExam}.pdf`);
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

  const handlePrint = async () => {
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

      // Create a blob URL and open in new tab for printing
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    } catch (error) {
      console.error('Error printing report card:', error);
      const errorMsg = 'Failed to print report card. Please ensure the student has results for this exam.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
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
                <option value="">All Courses</option>
                {COURSE_OPTIONS.map((course) => (
                  <option key={course.value} value={course.value}>
                    {course.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Intake Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Intake</label>
              <select
                value={selectedIntake}
                onChange={(e) => { setSelectedIntake(e.target.value); setSelectedStudent(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Intakes</option>
                {(selectedCourse ? INTAKE_OPTIONS[selectedCourse] || [] : Object.values(INTAKE_OPTIONS).flat().filter((v, i, a) => a.indexOf(v) === i)).map((intake) => (
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
                onChange={(e) => { setSelectedSemester(e.target.value); setSelectedStudent(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Semesters</option>
                {SEMESTER_OPTIONS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Session</label>
              <input
                type="text"
                placeholder="e.g. 2024-2025"
                value={selectedSession}
                onChange={(e) => { setSelectedSession(e.target.value); setSelectedStudent(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Row 2: Student and Exam Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student ({filteredStudents.length} available)
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a student...</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.student_id} - {student.user?.first_name} {student.user?.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Exam
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an exam...</option>
                {exams.map((exam) => (
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
          onClick={handlePreview}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Eye className="w-5 h-5 mr-2" />
          Preview
        </button>

        <button
          onClick={handleDownload}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5 mr-2" />
          {loading ? 'Downloading...' : 'Download'}
        </button>

        <button
          onClick={handlePrint}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print
        </button>
      </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Select a student and an exam to view, download, or print their report card.
          The report card will include all subject-wise marks, grades, and overall performance for the selected exam.
        </p>
      </div>
    </div>
  );
};

export default ReportCardViewer;

