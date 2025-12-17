import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Download, FileText, Eye, Trash2, RotateCcw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AddPaymentModal from '../components/payments/AddPaymentModal';
import PaymentHistory from '../components/payments/PaymentHistory';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online Payment' },
];

const FEE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'lab_fee', label: 'Lab Fee' },
  { value: 'library_fee', label: 'Library Fee' },
  { value: 'fine', label: 'Fine' },
  { value: 'semester_fee', label: 'Semester Fee' },
  { value: 'tuition_fee', label: 'Tuition Fee' },
  { value: 'admission_fee', label: 'Admission Fee' },
  { value: 'exam_fee', label: 'Exam Fee' },
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
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPaymentForHistory, setSelectedPaymentForHistory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Use Promise.allSettled to handle partial failures gracefully
        const [studentsRes, paymentsRes, examsRes] = await Promise.allSettled([
          api.get('/accounts/students/', { params: { page_size: 10000 } }),
          api.get('/payments/payments/', { params: { page_size: 10000 } }),
          api.get('/academics/exams/', { params: { page_size: 10000 } }),
        ]);
        
        if (studentsRes.status === 'fulfilled') {
          setStudents(studentsRes.value.data.results || studentsRes.value.data || []);
        }
        if (paymentsRes.status === 'fulfilled') {
          setPayments(paymentsRes.value.data.results || paymentsRes.value.data || []);
        }
        if (examsRes.status === 'fulfilled') {
          setExams(examsRes.value.data.results || examsRes.value.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);


  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/payments/', { params: { page_size: 10000 } });
      setPayments(response.data.results || response.data || []);
      setCurrentPage(1);
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

    return {
      courses,
      intakes,
      semesters,
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
      exams: filteredExams,
    };
  }, [
    availableOptions,
    selectedCourse,
    selectedIntake,
    selectedSemester,
    exams,
  ]);

  // Filter handlers with cascade reset
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
      
      // Course/Intake/Semester filters - filter by student's attributes
      if (selectedCourse || selectedIntake || selectedSemester) {
        const paymentStudentId = payment.student ?? payment.student_id;
        const student = students.find(s => s.id === paymentStudentId || s.id === parseInt(paymentStudentId));
        
        if (!student) return false;
        
        if (selectedCourse && student.course !== selectedCourse) return false;
        if (selectedIntake && student.intake !== selectedIntake) return false;
        if (selectedSemester && student.semester !== selectedSemester) return false;
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
  }, [payments, students, selectedFeeType, selectedMethod, selectedStudent, selectedExam, selectedCourse, selectedIntake, selectedSemester, dateFrom, dateTo, searchTerm]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage, ITEMS_PER_PAGE]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFeeType, selectedMethod, selectedStudent, selectedExam, selectedCourse, selectedIntake, selectedSemester, dateFrom, dateTo, searchTerm]);

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/payments/payments/${deleteConfirm.id}/`);
      toast.success('Payment deleted successfully');
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchPayments();
  };

  const exportToCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }

    const headers = ['Student Name', 'Student ID', 'Amount', 'Payment Date', 'Method', 'Transaction ID', 'Fee Type', 'Regularity'];
    const csvData = filteredPayments.map(p => [
      p.student_name || 'N/A',
      p.student_id || 'N/A',
      p.amount_paid,
      p.payment_date,
      p.payment_method,
      p.transaction_id || 'N/A',
      p.fee_type || 'N/A',
      p.payment_regularity || 'N/A',
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
    toast.success('Payments exported to CSV successfully');
  };

  const exportToPDF = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Payment Records', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Records: ${filteredPayments.length}`, 14, 36);

    // Table - calculate received amount (amount - discount)
    autoTable(doc, {
      startY: 42,
      head: [['Student Name', 'Student ID', 'Amount', 'Discount', 'Received', 'Date', 'Method', 'Fee Type', 'Regularity']],
      body: filteredPayments.map(p => {
        const received = parseFloat(p.amount_paid || 0) - parseFloat(p.discount_amount || 0);
        return [
          p.student_name || 'N/A',
          p.student_id || 'N/A',
          `${p.amount_paid}`,
          `${p.discount_amount || 0}`,
          `${received}`,
          p.payment_date,
          p.payment_method?.replace('_', ' ') || 'N/A',
          p.fee_type?.replace('_', ' ') || 'N/A',
          p.payment_regularity || 'N/A',
        ];
      }),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`payments_export_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Payments exported to PDF successfully');
  };

  if (loading && payments.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <LoadingSkeleton type="table" rows={8} />
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
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Export PDF
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
                  Received
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regularity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.length > 0 ? (
                paginatedPayments.map((payment) => (
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
                      <div className="text-sm font-medium text-gray-900">৳{Number(payment.amount_paid).toLocaleString()}</div>
                      {payment.discount_amount > 0 && (
                        <div className="text-xs text-gray-500">Discount: ৳{payment.discount_amount}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        ৳{(Number(payment.amount_paid) - Number(payment.discount_amount || 0)).toLocaleString()}
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        payment.payment_regularity === 'regular' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {payment.payment_regularity || 'Regular'}
                      </span>
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
                          onClick={() => handleDeleteClick(payment.id)}
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
        {filteredPayments.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length} payments
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default PaymentsPage;
