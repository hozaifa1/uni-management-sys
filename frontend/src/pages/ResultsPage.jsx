import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, Eye, RotateCcw, Users, TrendingUp, Award, XCircle, BarChart3, Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import ReportCardViewer from '../components/academics/ReportCardViewer';
import AddResultModal from '../components/academics/AddResultModal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [editingResult, setEditingResult] = useState(null);
  const [editMarks, setEditMarks] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalEditResult, setModalEditResult] = useState(null);
  const [examStats, setExamStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

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

  // Fetch exams filtered by course/intake/semester when filters change
  useEffect(() => {
    const fetchFilteredExams = async () => {
      try {
        const params = {};
        if (selectedCourse) params.course = selectedCourse;
        if (selectedIntake) params.intake = selectedIntake;
        if (selectedSemester) params.semester = selectedSemester;
        const examsRes = await api.get('/academics/exams/', { params });
        setExams(examsRes.data.results || examsRes.data || []);
      } catch (err) {
        console.error('Error fetching exams:', err);
      }
    };
    if (dataLoaded) {
      fetchFilteredExams();
    }
  }, [selectedCourse, selectedIntake, selectedSemester, dataLoaded]);

  // Fetch exam statistics when an exam is selected
  useEffect(() => {
    const fetchExamStats = async () => {
      if (!selectedExam) {
        setExamStats(null);
        return;
      }
      try {
        setStatsLoading(true);
        const response = await api.get(`/academics/exams/${selectedExam}/statistics/`);
        setExamStats(response.data);
      } catch (err) {
        console.error('Error fetching exam statistics:', err);
        setExamStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchExamStats();
  }, [selectedExam]);

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
      const response = await api.get('/academics/results/', { params });
      setResults(response.data.results || response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedExam, selectedIntake, selectedSemester, selectedStudent, selectedSubject]);

  // Fetch results when any filter changes
  useEffect(() => {
    if (dataLoaded) {
      fetchResults();
    }
  }, [dataLoaded, fetchResults]);

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setSelectedIntake('');
    setSelectedSemester('');
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


  const handleResetFilters = () => {
    setSelectedCourse('');
    setSelectedIntake('');
    setSelectedSemester('');
    setSelectedExam('');
    setSelectedSubject('');
    setSelectedStudent('');
    setSearchTerm('');
  };

  // Derive options that actually have results
  const availableOptions = useMemo(() => {
    const studentIdsWithResults = new Set(
      results
        .map((r) => r.student ?? r.student_id)
        .filter(Boolean)
        .map((id) => (typeof id === 'number' ? id : parseInt(id, 10) || id))
    );
    const examIdsWithResults = new Set(
      results
        .map((r) => r.exam ?? r.exam_id)
        .filter(Boolean)
        .map((id) => (typeof id === 'number' ? id : parseInt(id, 10) || id))
    );

    const studentsWithResults = students.filter((s) => studentIdsWithResults.has(s.id));
    const courses = [...new Set(studentsWithResults.map((s) => s.course).filter(Boolean))];
    const intakes = [...new Set(studentsWithResults.map((s) => s.intake).filter(Boolean))];
    const semesters = [...new Set(studentsWithResults.map((s) => s.semester).filter(Boolean))];
    const examsWithResults = exams.filter((e) => examIdsWithResults.has(e.id));

    return {
      courses,
      intakes,
      semesters,
      studentsWithResults,
      examsWithResults,
      studentIdsWithResults,
      examIdsWithResults,
    };
  }, [results, students, exams]);

  // Filter options based on current selections
  const filteredOptions = useMemo(() => {
    let filteredStudents = availableOptions.studentsWithResults;

    if (selectedCourse) {
      filteredStudents = filteredStudents.filter((s) => s.course === selectedCourse);
    }
    if (selectedIntake) {
      filteredStudents = filteredStudents.filter((s) => s.intake === selectedIntake);
    }
    if (selectedSemester) {
      filteredStudents = filteredStudents.filter((s) => s.semester === selectedSemester);
    }
    let availableIntakes = availableOptions.intakes;
    if (selectedCourse) {
      availableIntakes = [
        ...new Set(
          availableOptions.studentsWithResults
            .filter((s) => s.course === selectedCourse)
            .map((s) => s.intake)
            .filter(Boolean)
        ),
      ];
    }

    let availableSemesters = availableOptions.semesters;
    if (selectedCourse || selectedIntake) {
      availableSemesters = [
        ...new Set(
          availableOptions.studentsWithResults
            .filter(
              (s) =>
                (!selectedCourse || s.course === selectedCourse) &&
                (!selectedIntake || s.intake === selectedIntake)
            )
            .map((s) => s.semester)
            .filter(Boolean)
        ),
      ];
    }

    let filteredExams = availableOptions.examsWithResults;
    if (selectedStudent) {
      const studentExamIds = new Set(
        results
          .filter(
            (r) =>
              r.student === parseInt(selectedStudent, 10) ||
              r.student === selectedStudent ||
              r.student_id === parseInt(selectedStudent, 10) ||
              r.student_id === selectedStudent
          )
          .map((r) => r.exam ?? r.exam_id)
      );
      filteredExams = filteredExams.filter((e) => studentExamIds.has(e.id));
    } else if (selectedCourse || selectedIntake || selectedSemester) {
      filteredExams = filteredExams.filter(
        (e) =>
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
    };
  }, [
    availableOptions,
    selectedCourse,
    selectedIntake,
    selectedSemester,
    selectedStudent,
    results,
  ]);

  const handleStudentChange = (studentId) => {
    setSelectedStudent(studentId);
    if (studentId) {
      const student = students.find(s => s.id === parseInt(studentId) || s.id === studentId);
      if (student) {
        // Back-propagate student's course/intake/semester
        if (student.course) setSelectedCourse(student.course);
        if (student.intake) setSelectedIntake(student.intake);
        if (student.semester) setSelectedSemester(student.semester);
      }
    }
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

  const openAddResultModal = (result = null) => {
    setModalEditResult(result);
    setShowAddModal(true);
  };

  const closeAddResultModal = () => {
    setShowAddModal(false);
    setModalEditResult(null);
  };

  const handleAddResultSuccess = async () => {
    closeAddResultModal();
    await fetchResults();
    if (selectedExam) {
      try {
        const response = await api.get(`/academics/exams/${selectedExam}/statistics/`);
        setExamStats(response.data);
      } catch (err) {
        console.error('Error refreshing exam statistics:', err);
      }
    }
  };

  const getGradeChartData = () => {
    if (!examStats?.grade_distribution) return [];
    const colors = {
      'A+': '#10b981',
      'A': '#34d399',
      'A-': '#3b82f6',
      'B': '#60a5fa',
      'C': '#fbbf24',
      'D': '#f97316',
      'F': '#ef4444'
    };
    return Object.entries(examStats.grade_distribution).map(([grade, count]) => ({
      grade,
      count,
      color: colors[grade] || '#6b7280'
    }));
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

  const exportToCSV = () => {
    if (filteredResults.length === 0) {
      toast.error('No results to export');
      return;
    }

    const headers = ['Student Name', 'Student ID', 'Exam', 'Subject', 'Marks', 'Total', 'Grade', 'Percentage'];
    const csvData = filteredResults.map(r => [
      r.student_name || 'N/A',
      r.student_id || 'N/A',
      r.exam_name || 'N/A',
      r.subject_name || 'N/A',
      r.marks_obtained,
      r.subject_total_marks || 100,
      r.grade || 'N/A',
      `${r.percentage?.toFixed(2) || 0}%`,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `results_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Results exported to CSV successfully');
  };

  const exportToPDF = () => {
    if (filteredResults.length === 0) {
      toast.error('No results to export');
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Examination Results', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Records: ${filteredResults.length}`, 14, 36);

    doc.autoTable({
      startY: 42,
      head: [['Student', 'Student ID', 'Exam', 'Subject', 'Marks', 'Grade']],
      body: filteredResults.map(r => [
        r.student_name || 'N/A',
        r.student_id || 'N/A',
        r.exam_name || 'N/A',
        r.subject_name || 'N/A',
        `${r.marks_obtained}/${r.subject_total_marks || 100}`,
        r.grade || 'N/A',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`results_export_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Results exported to PDF successfully');
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Examination Results</h1>
          <p className="text-gray-600 mt-2">Manage student exam results and generate report cards</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Export PDF
          </button>
        </div>
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
        {/* Row 1: Course/Intake/Semester/Exam/Subject Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
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

          {/* Exam Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Exams ({filteredOptions.exams.length})</option>
              {filteredOptions.exams.map((exam) => (
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

        {/* Row 2: Search, Student Filter, Reset, Add */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Students ({filteredOptions.students.length})</option>
              {filteredOptions.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.student_id} - {student.user?.first_name} {student.user?.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center justify-center w-full px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:ring-2 focus:ring-red-500"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Filters
            </button>
          </div>

          <button
            onClick={() => openAddResultModal()}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Result
          </button>
        </div>
      </div>

      {/* Exam Statistics Section */}
      {selectedExam && (
        <div className="mb-6">
          {statsLoading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading statistics...</p>
            </div>
          ) : examStats && examStats.total_students > 0 ? (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Students Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Students</p>
                      <p className="text-3xl font-bold text-gray-900">{examStats.total_students}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Average Marks Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Average Marks</p>
                      <p className="text-3xl font-bold text-gray-900">{examStats.average_marks?.toFixed(1)}</p>
                      <p className="text-xs text-gray-400">out of {examStats.exam?.total_marks || 100}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Pass Rate Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pass Rate</p>
                      <p className="text-3xl font-bold text-green-600">{examStats.pass_rate?.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">{examStats.passed} passed / {examStats.failed} failed</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Fail Count Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Failed Students</p>
                      <p className="text-3xl font-bold text-red-600">{examStats.failed}</p>
                      <p className="text-xs text-gray-400">{((examStats.failed / examStats.total_students) * 100).toFixed(1)}% of total</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grade Distribution Bar Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Grade Distribution</h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getGradeChartData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value) => [`${value} students`, 'Count']}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {getGradeChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pass/Fail Pie Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Pass/Fail Distribution</h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Passed', value: examStats.passed, color: '#10b981' },
                            { name: 'Failed', value: examStats.failed, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value) => [`${value} students`, 'Count']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          ) : examStats?.message ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">
              {examStats.message}
            </div>
          ) : null}
        </div>
      )}

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

      {/* Add/Edit Result Modal */}
      {showAddModal && (
        <AddResultModal
          onClose={closeAddResultModal}
          onSuccess={handleAddResultSuccess}
          students={students}
          exams={exams}
          subjects={subjects}
          editingResult={modalEditResult}
        />
      )}
    </div>
  );
};

export default ResultsPage;

