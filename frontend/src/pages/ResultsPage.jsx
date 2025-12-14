import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ReportCardViewer from '../components/academics/ReportCardViewer';

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

const ResultsPage = () => {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingResult, setEditingResult] = useState(null);
  const [editMarks, setEditMarks] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load all dropdown data first, then results
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Load exams, subjects, and students in parallel first
        const [examsRes, subjectsRes, studentsRes] = await Promise.all([
          api.get('/academics/exams/'),
          api.get('/academics/subjects/'),
          api.get('/accounts/students/')
        ]);
        setExams(examsRes.data.results || examsRes.data || []);
        setSubjects(subjectsRes.data.results || subjectsRes.data || []);
        setStudents(studentsRes.data.results || studentsRes.data || []);
        setDataLoaded(true);
        
        // Then load results
        const resultsRes = await api.get('/academics/results/');
        setResults(resultsRes.data.results || resultsRes.data || []);
        setError('');
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Fetch exams filtered by course when course changes
  useEffect(() => {
    const fetchExamsByCourse = async () => {
      try {
        const params = selectedCourse ? { course: selectedCourse } : {};
        const examsRes = await api.get('/academics/exams/', { params });
        setExams(examsRes.data.results || examsRes.data || []);
      } catch (err) {
        console.error('Error fetching exams:', err);
      }
    };
    if (dataLoaded) {
      fetchExamsByCourse();
    }
  }, [selectedCourse, dataLoaded]);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedExam) params.exam = selectedExam;
      if (selectedSubject) params.subject = selectedSubject;
      if (selectedStudent) params.student = selectedStudent;
      if (selectedCourse) params.course = selectedCourse;
      if (selectedIntake) params.intake = selectedIntake;
      if (selectedSemester) params.semester = selectedSemester;
      if (selectedSession) params.session = selectedSession;

      const response = await api.get('/academics/results/', { params });
      setResults(response.data.results || response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedExam, selectedIntake, selectedSemester, selectedSession, selectedStudent, selectedSubject]);

  // Fetch results when filters change
  useEffect(() => {
    if (!dataLoaded) return;
    fetchResults();
  }, [dataLoaded, fetchResults]);

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setSelectedIntake('');
    setSelectedStudent('');
    setSelectedExam(''); // Reset exam when course changes
  };

  const openEditModal = (result) => {
    setEditingResult(result);
    setEditMarks(result.marks_obtained);
    setEditRemarks(result.remarks || '');
  };

  const closeEditModal = () => {
    setEditingResult(null);
    setEditMarks('');
    setEditRemarks('');
  };

  const handleUpdate = async () => {
    if (!editingResult) return;
    setActionLoading(true);
    setLoading(true);
    try {
      await api.patch(`/academics/results/${editingResult.id}/`, {
        marks_obtained: Number(editMarks),
        remarks: editRemarks,
      });
      toast.success('Result updated successfully');
      await fetchResults();
      closeEditModal();
    } catch (error) {
      console.error('Error updating result:', error);
      toast.error('Failed to update result');
      setLoading(false);
    } finally {
      setActionLoading(false);
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this result?')) {
      try {
        setActionLoading(true);
        setLoading(true);
        await api.delete(`/academics/results/${id}/`);
        toast.success('Result deleted successfully');
        await fetchResults();
      } catch (error) {
        console.error('Error deleting result:', error);
        toast.error('Failed to delete result');
        setLoading(false);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const filteredResults = results.filter((result) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      result.student_id?.toLowerCase().includes(search) ||
      result.student_name?.toLowerCase().includes(search) ||
      result.subject_name?.toLowerCase().includes(search) ||
      result.exam_name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Examination Results</h1>
        <p className="text-gray-600 mt-2">Manage student exam results and generate report cards</p>
      </div>

      {/* Report Card Viewer Section */}
      <div className="mb-8">
        <ReportCardViewer />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Row 1: Course/Intake/Semester/Session Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
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
              onChange={(e) => setSelectedIntake(e.target.value)}
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
              onChange={(e) => setSelectedSemester(e.target.value)}
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
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Exam Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Search and Student Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by student, subject, or exam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Student Filter */}
          <div>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Students ({filteredStudents.length})</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.student_id} - {student.user?.first_name} {student.user?.last_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {}}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Result
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading results...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No results found</p>
            <p className="text-sm mt-2">Try adjusting your filters or add new results</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marks Obtained
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((result) => {
                  const totalMarks = result.subject_total_marks || result.subject?.total_marks || 0;
                  const percentage = totalMarks
                    ? ((Number(result.marks_obtained) / Number(totalMarks)) * 100).toFixed(2)
                    : (Number(result.percentage) || 0).toFixed(2);

                  return (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {result.student_name}
                          </div>
                          <div className="text-sm text-gray-500">{result.student_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.exam_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.subject_name || result.subject?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.marks_obtained}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {totalMarks || 100}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            result.grade === 'A+' || result.grade === 'A'
                              ? 'bg-green-100 text-green-800'
                              : result.grade === 'B' || result.grade === 'A-'
                              ? 'bg-blue-100 text-blue-800'
                              : result.grade === 'C' || result.grade === 'D'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {result.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(result)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(result.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Edit Result</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Marks Obtained
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMarks}
                  onChange={(e) => setEditMarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Remarks
                </label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeEditModal}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 ${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 ${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;

