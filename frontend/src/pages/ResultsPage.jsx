import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, RotateCcw, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import ReportCardViewer from '../components/academics/ReportCardViewer';
import AddResultModal from '../components/academics/AddResultModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const ResultsPage = () => {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');

  const EXAM_TYPE_OPTIONS = [
    { value: 'incourse_1st', label: '1st Incourse' },
    { value: 'incourse_2nd', label: '2nd Incourse' },
    { value: 'final', label: 'Final Exam' },
  ];
  const [searchTerm, setSearchTerm] = useState('');
  const [editingResult, setEditingResult] = useState(null);
  const [editMarks, setEditMarks] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalEditResult, setModalEditResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Load all dropdown data first, then results
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Load exams, subjects, students, and results in parallel with large page_size
        const [subjectsRes, studentsRes, resultsRes] = await Promise.all([
          api.get('/academics/subjects/', { params: { page_size: 10000 } }),
          api.get('/accounts/students/', { params: { page_size: 10000 } }),
          api.get('/academics/results/', { params: { page_size: 10000 } })
        ]);
        setSubjects(subjectsRes.data.results || subjectsRes.data || []);
        setStudents(studentsRes.data.results || studentsRes.data || []);
        setResults(resultsRes.data.results || resultsRes.data || []);
        setDataLoaded(true);
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



  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedSubject) params.subject = selectedSubject;
      if (selectedStudent) params.student = selectedStudent;
      if (selectedCourse) params.course = selectedCourse;
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
  }, [selectedCourse, selectedSemester, selectedStudent, selectedSubject]);

  // Fetch results when any filter changes
  useEffect(() => {
    if (dataLoaded) {
      fetchResults();
    }
  }, [dataLoaded, fetchResults]);

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setSelectedSemester('');
    setSelectedIntake('');
    setSelectedSubject('');
    setSelectedStudent('');
    setSelectedExamType('');
  };

  const handleSemesterChange = (value) => {
    setSelectedSemester(value);
    setSelectedIntake('');
    setSelectedSubject('');
    setSelectedStudent('');
    setSelectedExamType('');
  };

  const handleIntakeChange = (value) => {
    setSelectedIntake(value);
    setSelectedStudent('');
  };


  const handleResetFilters = () => {
    setSelectedCourse('');
    setSelectedSemester('');
    setSelectedIntake('');
    setSelectedSubject('');
    setSelectedExamType('');
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
    const studentsWithResults = students.filter((s) => studentIdsWithResults.has(s.id));
    const courses = [...new Set(studentsWithResults.map((s) => s.course).filter(Boolean))];
    const semesters = [...new Set(studentsWithResults.map((s) => s.semester).filter(Boolean))];
    const intakes = [...new Set(studentsWithResults.map((s) => s.intake).filter(Boolean))];

    return {
      courses,
      semesters,
      intakes,
      studentsWithResults,
      studentIdsWithResults,
    };
  }, [results, students]);

  // Filter options based on current selections
  const filteredOptions = useMemo(() => {
    let filteredStudents = availableOptions.studentsWithResults;

    if (selectedCourse) {
      filteredStudents = filteredStudents.filter((s) => s.course === selectedCourse);
    }
    if (selectedSemester) {
      filteredStudents = filteredStudents.filter((s) => s.semester === selectedSemester);
    }
    if (selectedIntake) {
      filteredStudents = filteredStudents.filter((s) => s.intake === selectedIntake);
    }

    let availableSemesters = availableOptions.semesters;
    if (selectedCourse) {
      availableSemesters = [
        ...new Set(
          availableOptions.studentsWithResults
            .filter((s) => s.course === selectedCourse)
            .map((s) => s.semester)
            .filter(Boolean)
        ),
      ];
    }

    let availableIntakes = availableOptions.intakes;
    if (selectedCourse || selectedSemester) {
      availableIntakes = [
        ...new Set(
          availableOptions.studentsWithResults
            .filter((s) => (!selectedCourse || s.course === selectedCourse) &&
                           (!selectedSemester || s.semester === selectedSemester))
            .map((s) => s.intake)
            .filter(Boolean)
        ),
      ];
    }

    // Filter subjects by course_code and semester
    let filteredSubjects = subjects;
    if (selectedCourse) {
      filteredSubjects = filteredSubjects.filter((s) => s.course_code === selectedCourse);
    }
    if (selectedSemester) {
      filteredSubjects = filteredSubjects.filter((s) => s.semester === selectedSemester);
    }

    // Get available exam types based on results (only show types that have results)
    let availableExamTypes = [];
    let relevantResults = results;
    if (selectedCourse || selectedSemester || selectedIntake) {
      relevantResults = results.filter(r => {
        const student = students.find(s => s.id === r.student);
        if (!student) return false;
        if (selectedCourse && student.course !== selectedCourse) return false;
        if (selectedSemester && student.semester !== selectedSemester) return false;
        if (selectedIntake && student.intake !== selectedIntake) return false;
        return true;
      });
    }
    availableExamTypes = [...new Set(relevantResults.map(r => r.exam_type).filter(Boolean))];

    return {
      students: filteredStudents,
      semesters: availableSemesters,
      intakes: availableIntakes,
      subjects: filteredSubjects,
      examTypes: availableExamTypes,
    };
  }, [
    availableOptions,
    selectedCourse,
    selectedSemester,
    selectedIntake,
    subjects,
    results,
    students,
  ]);

  const handleStudentChange = (studentId) => {
    setSelectedStudent(studentId);
    if (studentId) {
      const student = students.find(s => s.id === parseInt(studentId) || s.id === studentId);
      if (student) {
        // Back-propagate student's course/semester
        if (student.course) setSelectedCourse(student.course);
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

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    try {
      setActionLoading(true);
      setLoading(true);
      await api.delete(`/academics/results/${deleteConfirm.id}/`);
      toast.success('Result deleted successfully');
      await fetchResults();
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error('Failed to delete result');
      setLoading(false);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      // Apply course/semester/intake/student filters
      if (selectedCourse || selectedSemester || selectedIntake) {
        const student = students.find(s => s.id === result.student || s.student_id === result.student_id);
        if (student) {
          if (selectedCourse && student.course !== selectedCourse) return false;
          if (selectedSemester && student.semester !== selectedSemester) return false;
          if (selectedIntake && student.intake !== selectedIntake) return false;
        }
      }
      if (selectedStudent && result.student !== parseInt(selectedStudent) && result.student_id !== selectedStudent) return false;
      if (selectedSubject && result.subject !== parseInt(selectedSubject) && result.subject_id !== selectedSubject) return false;
      
      // Filter by exam type
      if (selectedExamType && result.exam_type !== selectedExamType) return false;
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!(
          result.student_id?.toLowerCase().includes(search) ||
          result.student_name?.toLowerCase().includes(search) ||
          result.subject_name?.toLowerCase().includes(search) ||
          result.exam_name?.toLowerCase().includes(search)
        )) return false;
      }
      return true;
    });
  }, [results, students, selectedCourse, selectedSemester, selectedIntake, selectedStudent, selectedSubject, selectedExamType, searchTerm]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredResults, currentPage, ITEMS_PER_PAGE]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCourse, selectedSemester, selectedIntake, selectedStudent, selectedSubject, selectedExamType, searchTerm]);

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

    autoTable(doc, {
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Examination Results</h1>
        <p className="text-gray-600 mt-2">Manage student exam results and generate report cards</p>
      </div>

      {/* Report Card Viewer Section - Collapsible */}
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
        {/* Row 1: Course/Semester/Intake Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        </div>

        {/* Row 2: Subject/Exam Type Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Subject Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Subjects ({filteredOptions.subjects.length})</option>
              {filteredOptions.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Exam Type</label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Exam Types ({filteredOptions.examTypes.length})</option>
              {EXAM_TYPE_OPTIONS.filter(opt => filteredOptions.examTypes.includes(opt.value)).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Search, Student Filter, Reset, Add */}
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

        {/* Row 4: Export Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Results CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Export Results PDF
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingSkeleton type="table" rows={8} />
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
                {paginatedResults.map((result) => {
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
                            onClick={() => handleDeleteClick(result.id)}
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
        
        {/* Pagination */}
        {filteredResults.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredResults.length)} of {filteredResults.length} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
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
          subjects={subjects}
          editingResult={modalEditResult}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Result"
        message="Are you sure you want to delete this result? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default ResultsPage;

