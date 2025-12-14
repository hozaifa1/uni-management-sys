import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Download, DollarSign, TrendingUp, Calendar, CreditCard, Eye, Trash2, RotateCcw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AddPaymentModal from '../components/payments/AddPaymentModal';
import PaymentHistory from '../components/payments/PaymentHistory';

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online Payment' },
];

const FEE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'tuition', label: 'Tuition Fee' },
  { value: 'exam', label: 'Examination Fee' },
  { value: 'admission', label: 'Admission Fee' },
];

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPaymentForHistory, setSelectedPaymentForHistory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState({
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    pending_payments: 0,
    total_students: 0,
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [studentsRes, paymentsRes, examsRes] = await Promise.all([
          api.get('/accounts/students/', { params: { page_size: 1000 } }),
          api.get('/payments/payments/'),
          api.get('/academics/exams/'),
        ]);
        setStudents(studentsRes.data.results || studentsRes.data || []);
        setPayments(paymentsRes.data.results || paymentsRes.data || []);
        setExams(examsRes.data.results || examsRes.data || []);
        if (paymentsRes.data.count) {
          setTotalCount(paymentsRes.data.count);
          setTotalPages(Math.ceil(paymentsRes.data.count / 20));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/payments/payments/statistics/');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        ...(selectedStudent && { student: selectedStudent }),
        ...(selectedMethod && { payment_method: selectedMethod }),
        ...(dateFrom && { payment_date__gte: dateFrom }),
        ...(dateTo && { payment_date__lte: dateTo }),
      };

      const response = await api.get('/payments/payments/', { params });
      setPayments(response.data.results || response.data || []);

      if (response.data.count) {
        setTotalCount(response.data.count);
        setTotalPages(Math.ceil(response.data.count / 20));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedStudent, selectedMethod, dateFrom, dateTo]);

  // Derive options that actually have payments
  const availableOptions = useMemo(() => {
    const studentIdsWithPayments = new Set(
      payments
        .map((p) => p.student ?? p.student_id)
        .filter(Boolean)
        .map((id) => (typeof id === 'number' ? id : parseInt(id, 10) || id))
    );

    const studentsWithPayments = students.filter((s) => studentIdsWithPayments.has(s.id));
    const courses = [...new Set(studentsWithPayments.map((s) => s.course).filter(Boolean))];
    const intakes = [...new Set(studentsWithPayments.map((s) => s.intake).filter(Boolean))];
    const semesters = [...new Set(studentsWithPayments.map((s) => s.semester).filter(Boolean))];
    const sessions = [...new Set(studentsWithPayments.map((s) => s.session).filter(Boolean))];

    return {
      courses,
      intakes,
      semesters,
      sessions,
      studentsWithPayments,
      studentIdsWithPayments,
    };
  }, [payments, students]);

  // Filter options based on current selections
  const filteredOptions = useMemo(() => {
    let filteredStudents = availableOptions.studentsWithPayments;

    if (selectedCourse) {
      filteredStudents = filteredStudents.filter((s) => s.course === selectedCourse);
    }
    if (selectedIntake) {
      filteredStudents = filteredStudents.filter((s) => s.intake === selectedIntake);
    }
    if (selectedSemester) {
      filteredStudents = filteredStudents.filter((s) => s.semester === selectedSemester);
    }
    if (selectedSession) {
      filteredStudents = filteredStudents.filter((s) => s.session === selectedSession);
    }

    let availableIntakes = availableOptions.intakes;
    if (selectedCourse) {
      availableIntakes = [
        ...new Set(
          availableOptions.studentsWithPayments
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
          availableOptions.studentsWithPayments
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

    let availableSessions = availableOptions.sessions;
    if (selectedCourse || selectedIntake || selectedSemester) {
      availableSessions = [
        ...new Set(
          availableOptions.studentsWithPayments
            .filter(
              (s) =>
                (!selectedCourse || s.course === selectedCourse) &&
                (!selectedIntake || s.intake === selectedIntake) &&
                (!selectedSemester || s.semester === selectedSemester)
            )
            .map((s) => s.session)
            .filter(Boolean)
        ),
      ];
    }

    // Filter exams based on course/intake/semester
    let filteredExams = exams;
    if (selectedCourse || selectedIntake || selectedSemester) {
      filteredExams = exams.filter(
        (e) =>
          (!selectedCourse || e.course === selectedCourse) &&
          (!selectedIntake || e.intake === selectedIntake) &&
          (!selectedSemester || e.semester === selectedSemester)
      );
    }

    return {
      students: filteredStudents,
      intakes: availableIntakes,
      semesters: availableSemesters,
      sessions: availableSessions,
      exams: filteredExams,
    };
  }, [
    availableOptions,
    selectedCourse,
    selectedIntake,
    selectedSemester,
    selectedSession,
    exams,
  ]);

  // Filter handlers with cascade reset
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

  const handleFeeTypeChange = (value) => {
    setSelectedFeeType(value);
    if (value !== 'exam') {
      setSelectedExam('');
    }
  };

  const handleResetFilters = () => {
    setSelectedCourse('');
    setSelectedIntake('');
    setSelectedSemester('');
    setSelectedSession('');
    setSelectedStudent('');
    setSelectedMethod('');
    setSelectedFeeType('');
    setSelectedExam('');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  // Filter payments based on all filter criteria
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Fee type filter
      if (selectedFeeType && payment.fee_type !== selectedFeeType) {
        return false;
      }
      
      // Payment method filter
      if (selectedMethod && payment.payment_method !== selectedMethod) {
        return false;
      }
      
      // Student filter
      if (selectedStudent) {
        const paymentStudentId = payment.student ?? payment.student_id;
        if (paymentStudentId != selectedStudent) {
          return false;
        }
      }
      
      // Exam filter (for exam fee type)
      if (selectedExam && payment.exam_id && payment.exam_id != selectedExam) {
        return false;
      }
      
      // Date range filters
      if (dateFrom) {
        const paymentDate = new Date(payment.payment_date);
        const fromDate = new Date(dateFrom);
        if (paymentDate < fromDate) return false;
      }
      
      if (dateTo) {
        const paymentDate = new Date(payment.payment_date);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire "to" day
        if (paymentDate > toDate) return false;
      }
      
      // Course/Intake/Semester/Session filters - filter by student's attributes
      if (selectedCourse || selectedIntake || selectedSemester || selectedSession) {
        const paymentStudentId = payment.student ?? payment.student_id;
        const student = students.find(s => s.id === paymentStudentId || s.id === parseInt(paymentStudentId));
        
        if (!student) return false;
        
        if (selectedCourse && student.course !== selectedCourse) return false;
        if (selectedIntake && student.intake !== selectedIntake) return false;
        if (selectedSemester && student.semester !== selectedSemester) return false;
        if (selectedSession && student.session !== selectedSession) return false;
      }
      
      // Search term filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          payment.student_name?.toLowerCase().includes(search) ||
          payment.student_id?.toLowerCase().includes(search) ||
          payment.transaction_id?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [payments, students, selectedFeeType, selectedMethod, selectedStudent, selectedExam, selectedCourse, selectedIntake, selectedSemester, selectedSession, dateFrom, dateTo, searchTerm]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await api.delete(`/payments/payments/${id}/`);
        toast.success('Payment deleted successfully');
        fetchPayments();
        fetchStatistics();
      } catch (error) {
        console.error('Error deleting payment:', error);
        toast.error('Failed to delete payment');
      }
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchPayments();
    fetchStatistics();
  };

  const exportToCSV = () => {
    if (payments.length === 0) {
      toast.error('No payments to export');
      return;
    }

    const headers = ['Student Name', 'Student ID', 'Amount', 'Payment Date', 'Method', 'Transaction ID', 'Fee Type'];
    const csvData = payments.map(p => [
      p.student_name || 'N/A',
      p.student_id || 'N/A',
      p.amount_paid,
      p.payment_date,
      p.payment_method,
      p.transaction_id || 'N/A',
      p.fee_type || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments exported successfully');
  };

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Manage student payment records and transactions</p>
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
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            Add Payment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">৳{Number(statistics.total_revenue || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">৳{Number(statistics.total_expenses || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${Number(statistics.net_profit) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ৳{Number(statistics.net_profit || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Payments</p>
              <p className="text-2xl font-bold text-orange-600">৳{Number(statistics.pending_payments || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        {/* Row 1: Course/Intake/Semester/Session Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          {/* Course Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sessions ({filteredOptions.sessions.length})</option>
              {filteredOptions.sessions.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </div>

          {/* Fee Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fee Type</label>
            <select
              value={selectedFeeType}
              onChange={(e) => handleFeeTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FEE_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Filter - Only shown when fee type is 'exam' */}
          {selectedFeeType === 'exam' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Exam</label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Exams ({filteredOptions.exams.length})</option>
                {filteredOptions.exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Method Filter - moves based on exam visibility */}
          {selectedFeeType !== 'exam' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Row 2: Search, Student, Method (if exam type), Dates, Reset */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Name, ID, transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Student Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Students ({filteredOptions.students.length})</option>
              {filteredOptions.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.student_id} - {student.user?.first_name} {student.user?.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter - shown here when exam type is selected */}
          {selectedFeeType === 'exam' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center justify-center w-full px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:ring-2 focus:ring-red-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {payment.student_name?.[0] || 'S'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.student_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{payment.student_id || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">৳{Number(payment.amount_paid).toLocaleString()}</div>
                      {payment.discount_amount > 0 && (
                        <div className="text-xs text-gray-500">Discount: ৳{payment.discount_amount}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                        {payment.fee_type?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full capitalize">
                        {payment.payment_method?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {payment.transaction_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPaymentForHistory(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No payments found. Add your first payment to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} ({totalCount} total payments)
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
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <AddPaymentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          students={students}
        />
      )}

      {/* Payment History Modal */}
      {selectedPaymentForHistory && (
        <PaymentHistory
          payment={selectedPaymentForHistory}
          onClose={() => setSelectedPaymentForHistory(null)}
        />
      )}
    </div>
  );
};

export default PaymentsPage;
