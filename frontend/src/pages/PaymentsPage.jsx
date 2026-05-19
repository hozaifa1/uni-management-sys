import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Download, FileText, Eye, Pencil, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AddPaymentModal from '../components/payments/AddPaymentModal';
import EditPaymentModal from '../components/payments/EditPaymentModal';
import EditReceivablesModal from '../components/payments/EditReceivablesModal';
import PaymentHistory from '../components/payments/PaymentHistory';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';

const ALL_SEMESTERS = ['1st Sem','2nd Sem','3rd Sem','4th Sem','5th Sem','6th Sem','7th Sem','8th Sem'];
const COURSE_OPTIONS = ['BBA', 'MBA', 'CSE', 'THM'];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online Payment' },
];

const FEE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'tuition', label: 'Tuition Fee' },
  { value: 'application_fee', label: 'Application Fee' },
  { value: 'admission_fee', label: 'Admission Fee' },
  { value: 'mt_exam_fee', label: 'Midterm Exam Fee' },
  { value: 'nu_exam_fee', label: 'NU Exam Fee' },
  { value: 'semester_fee', label: 'Semester Fee' },
  { value: 'library_deposit', label: 'Library Deposit' },
  { value: 'library_fine', label: 'Library Fine' },
  { value: 'lab_fee', label: 'Lab Fee' },
  { value: 'fine', label: 'Fine' },
  { value: 'other', label: 'Other' },
];

const RECEIVABLE_COLUMNS = [
  { key: 'semester_fee', label: 'Semester Fee' },
  { key: 'monthly_tuition_fee', label: 'Monthly Tuition' },
  { key: 'midterm_fee', label: 'Midterm Fee', compute: (s) =>
      Number(s.midterm_1_fee || 0) + Number(s.midterm_2_fee || 0) },
  { key: 'nu_exam_fee', label: 'NU Exam Fee' },
  { key: 'library_deposit', label: 'Library Deposit' },
];

const DuesPanel = ({ summaries, students, canEdit, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [intakeFilter, setIntakeFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [editingRow, setEditingRow] = useState(null);

  // Build student-id -> {course, intake} from the students list (fallback when
  // summary row doesn't have program/intake_batch populated).
  const studentLookup = useMemo(() => {
    const map = new Map();
    for (const s of students || []) map.set(s.id, s);
    return map;
  }, [students]);

  // Normalised rows — fill program/intake_batch from student when missing.
  const enriched = useMemo(() => {
    return summaries.map((s) => {
      const stu = studentLookup.get(s.student);
      return {
        ...s,
        program: s.program || stu?.course || '',
        intake_batch: s.intake_batch || stu?.intake || '',
      };
    });
  }, [summaries, studentLookup]);

  // Available intakes — narrow by course only (semester stays full 1st-8th).
  const intakeOptions = useMemo(() => {
    const set = new Set();
    for (const s of enriched) {
      if (courseFilter && s.program !== courseFilter) continue;
      if (s.intake_batch) set.add(s.intake_batch);
    }
    return [...set].sort();
  }, [enriched, courseFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((s) => {
      if (courseFilter && s.program !== courseFilter) return false;
      if (intakeFilter && s.intake_batch !== intakeFilter) return false;
      if (semesterFilter && s.semester !== semesterFilter) return false;
      if (q) {
        const name = (s.student_name || '').toLowerCase();
        const roll = (s.student_roll || '').toLowerCase();
        if (!name.includes(q) && !roll.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, courseFilter, intakeFilter, semesterFilter]);

  const totals = useMemo(() => filtered.reduce((acc, s) => ({
    due: acc.due + Number(s.cumulative_due_after_semester || 0),
    received: acc.received + Number(s.cumulative_received_after_semester || 0),
    closing: acc.closing + Number(s.closing_balance || 0),
    receivable: acc.receivable + Number(s.total_receivable_end_of_semester || 0),
  }), { due: 0, received: 0, closing: 0, receivable: 0 }), [filtered]);

  const handleReset = () => {
    setSearch('');
    setCourseFilter('');
    setIntakeFilter('');
    setSemesterFilter('');
  };

  const handleCourseChange = (v) => {
    setCourseFilter(v);
    setIntakeFilter('');
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-xs text-red-700 font-medium">Total Cumulative Dues</div>
          <div className="text-2xl font-bold text-red-700">৳{totals.due.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-xs text-green-700 font-medium">Total Received</div>
          <div className="text-2xl font-bold text-green-700">৳{totals.received.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-xs text-amber-700 font-medium">Sum of Closing Balances</div>
          <div className="text-2xl font-bold text-amber-700">৳{totals.closing.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-xs text-blue-700 font-medium">Sum of Receivables</div>
          <div className="text-2xl font-bold text-blue-700">৳{totals.receivable.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Course</label>
            <select
              value={courseFilter}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Courses</option>
              {COURSE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Intake</label>
            <select
              value={intakeFilter}
              onChange={(e) => setIntakeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Intakes ({intakeOptions.length})</option>
              {intakeOptions.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Semesters</option>
              {ALL_SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Name or roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center w-full px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intake</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sem</th>
                {RECEIVABLE_COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-medium text-blue-700 uppercase whitespace-nowrap bg-blue-50/50">
                  Total Receivable
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cum. Due</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.slice(0, 300).map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{s.student_roll}</td>
                  <td className="px-3 py-2">{s.student_name}</td>
                  <td className="px-3 py-2">{s.program}</td>
                  <td className="px-3 py-2">{s.intake_batch}</td>
                  <td className="px-3 py-2">{s.semester}</td>
                  {RECEIVABLE_COLUMNS.map((c) => {
                    const v = c.compute ? c.compute(s) : Number(s[c.key] || 0);
                    return (
                      <td key={c.key} className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                        ৳{Number(v).toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right whitespace-nowrap bg-blue-50/30">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-semibold text-blue-700">
                        ৳{Number(s.total_receivable_end_of_semester || 0).toLocaleString()}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditingRow(s)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit receivable fees"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">
                    ৳{Number(s.semester_total_received || 0).toLocaleString()}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${Number(s.closing_balance) > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    ৳{Number(s.closing_balance || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-red-700 whitespace-nowrap">
                    ৳{Number(s.cumulative_due_after_semester || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5 + RECEIVABLE_COLUMNS.length + 4} className="px-6 py-12 text-center text-gray-500">
                    No records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filtered.length > 300 && (
            <div className="p-3 text-sm text-gray-500 text-center bg-gray-50">
              Showing first 300 of {filtered.length} records — refine filters to narrow.
            </div>
          )}
        </div>
      </div>

      {editingRow && (
        <EditReceivablesModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSuccess={() => {
            setEditingRow(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

const PaymentsPage = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'ADMIN' || user?.is_superuser;
  const canEdit = isAdmin;
  const canDelete = isAdmin;

  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [activeTab, setActiveTab] = useState('payments');
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
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedPaymentForHistory, setSelectedPaymentForHistory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Fetch with reasonable page sizes for performance
        const [studentsRes, paymentsRes, examsRes, summariesRes] = await Promise.allSettled([
          api.get('/accounts/students/', { params: { page_size: 500 } }),
          api.get('/payments/payments/', { params: { page_size: 200 } }),
          api.get('/academics/exams/', { params: { page_size: 100 } }),
          api.get('/payments/semester-summaries/', { params: { page_size: 10000 } }),
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
        if (summariesRes.status === 'fulfilled') {
          setSummaries(summariesRes.value.data.results || summariesRes.value.data || []);
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
      const response = await api.get('/payments/payments/', { params: { page_size: 200 } });
      setPayments(response.data.results || response.data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedStudent, selectedMethod, dateFrom, dateTo]);

  const fetchSummaries = useCallback(async () => {
    try {
      const response = await api.get('/payments/semester-summaries/', {
        params: { page_size: 10000 },
      });
      setSummaries(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      toast.error('Failed to refresh dues data');
    }
  }, []);

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

  const filteredTotals = useMemo(() => {
    const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const totalReceived = filteredPayments.reduce(
      (sum, p) => sum + (Number(p.amount_paid || 0) - Number(p.discount_amount || 0)),
      0
    );
    return { totalAmount, totalReceived };
  }, [filteredPayments]);

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

    const semOrder = ['1st Sem','2nd Sem','3rd Sem','4th Sem','5th Sem','6th Sem','7th Sem','8th Sem'];
    const latestByStudent = summaries.reduce((acc, s) => {
      const cur = acc[s.student];
      if (!cur || semOrder.indexOf(s.semester) > semOrder.indexOf(cur.semester)) {
        acc[s.student] = s;
      }
      return acc;
    }, {});
    const duesFor = (p) => {
      const sid = p.student ?? p.student_id;
      const latest = latestByStudent[sid];
      return {
        closing: latest ? Number(latest.closing_balance || 0) : 0,
        cumulative: latest ? Number(latest.cumulative_due_after_semester || 0) : 0,
      };
    };

    const headers = ['Student Name', 'Student ID', 'Amount', 'Payment Date', 'Method', 'Fee Type', 'Regularity', 'Due (latest sem)', 'Cumulative Due'];
    const csvData = filteredPayments.map(p => {
      const d = duesFor(p);
      return [
        p.student_name || 'N/A',
        p.student_id || 'N/A',
        p.amount_paid,
        p.payment_date,
        p.payment_method,
        p.fee_type || 'N/A',
        p.payment_regularity || 'N/A',
        d.closing,
        d.cumulative,
      ];
    });

    const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const totalsRow = ['TOTAL', '', totalAmount, '', '', '', '', '', ''];

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(',')),
      totalsRow.map(cell => `"${cell}"`).join(','),
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
    const pdfTotalAmount = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const pdfTotalDiscount = filteredPayments.reduce((sum, p) => sum + parseFloat(p.discount_amount || 0), 0);
    const pdfTotalReceived = pdfTotalAmount - pdfTotalDiscount;

    const semOrder = ['1st Sem','2nd Sem','3rd Sem','4th Sem','5th Sem','6th Sem','7th Sem','8th Sem'];
    const latestByStudent = summaries.reduce((acc, s) => {
      const cur = acc[s.student];
      if (!cur || semOrder.indexOf(s.semester) > semOrder.indexOf(cur.semester)) {
        acc[s.student] = s;
      }
      return acc;
    }, {});
    const duesFor = (p) => {
      const sid = p.student ?? p.student_id;
      const latest = latestByStudent[sid];
      return {
        closing: latest ? Number(latest.closing_balance || 0) : 0,
        cumulative: latest ? Number(latest.cumulative_due_after_semester || 0) : 0,
      };
    };

    autoTable(doc, {
      startY: 42,
      head: [['Student Name', 'Student ID', 'Amount', 'Discount', 'Received', 'Date', 'Method', 'Fee Type', 'Regularity', 'Due', 'Cum. Due']],
      body: filteredPayments.map(p => {
        const received = parseFloat(p.amount_paid || 0) - parseFloat(p.discount_amount || 0);
        const d = duesFor(p);
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
          `${d.closing}`,
          `${d.cumulative}`,
        ];
      }),
      foot: [['TOTAL', '', `${pdfTotalAmount}`, `${pdfTotalDiscount}`, `${pdfTotalReceived}`, '', '', '', '', '', '']],
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
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
          <p className="text-gray-600 mt-1">Manage student payments, dues, and receivables</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Payment
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab('dues')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
              activeTab === 'dues'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Dues &amp; Receivables ({summaries.length})
          </button>
        </nav>
      </div>

      {activeTab === 'dues' && (
        <DuesPanel
          summaries={summaries}
          students={students}
          canEdit={canEdit}
          onRefresh={fetchSummaries}
        />
      )}

      {activeTab === 'payments' && (
      <>
      {/* Begin payments tab content */}

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

      {/* Export Buttons & Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
          {filteredPayments.length > 0 && (
            <span className="ml-3 text-gray-700">
              · Total Amount: <span className="font-semibold">৳{filteredTotals.totalAmount.toLocaleString()}</span>
              <span className="mx-2">·</span>Total Received: <span className="font-semibold text-green-600">৳{filteredTotals.totalReceived.toLocaleString()}</span>
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due (latest sem)
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {(() => {
                        const studentId = payment.student ?? payment.student_id;
                        const order = ['1st Sem','2nd Sem','3rd Sem','4th Sem','5th Sem','6th Sem','7th Sem','8th Sem'];
                        const studentSummaries = summaries.filter(s => s.student === studentId);
                        if (studentSummaries.length === 0) return <span className="text-gray-400">—</span>;
                        const latest = [...studentSummaries].sort(
                          (a, b) => order.indexOf(b.semester) - order.indexOf(a.semester)
                        )[0];
                        const due = Number(latest.closing_balance || 0);
                        const cumDue = Number(latest.cumulative_due_after_semester || 0);
                        return (
                          <div className="text-right">
                            <div className={`font-semibold ${due > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                              ৳{due.toLocaleString()}
                            </div>
                            {cumDue > 0 && (
                              <div className="text-xs text-gray-500">Cum: ৳{cumDue.toLocaleString()}</div>
                            )}
                          </div>
                        );
                      })()}
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
                        {canEdit && (
                          <button
                            onClick={() => setEditingPayment(payment)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(payment.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    No payments found. Add your first payment to get started!
                  </td>
                </tr>
              )}
            </tbody>
            {filteredPayments.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td className="px-6 py-3 text-sm font-bold text-gray-700">
                    Total ({filteredPayments.length})
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    ৳{filteredTotals.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-green-600">
                    ৳{filteredTotals.totalReceived.toLocaleString()}
                  </td>
                  <td colSpan="6"></td>
                </tr>
              </tfoot>
            )}
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

      {/* End payments tab content */}
      </>
      )}

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

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSuccess={() => {
            setEditingPayment(null);
            fetchPayments();
          }}
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
