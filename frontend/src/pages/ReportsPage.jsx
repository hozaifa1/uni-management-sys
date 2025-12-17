import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart3, DollarSign, TrendingUp, Users, FileText, Download, 
  AlertCircle, Calendar, Filter, RefreshCw, Search, RotateCcw 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('payments');
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState([]);
  
  // Payment Reports Data
  const [semesterWiseData, setSemesterWiseData] = useState([]);
  const [currentSemesterData, setCurrentSemesterData] = useState({ stats: {}, payments: [] });
  const [duesData, setDuesData] = useState({ summary: {}, data: [] });
  const [feeTypeData, setFeeTypeData] = useState([]);
  
  // Result Reports Data
  const [examSummaryData, setExamSummaryData] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState({});

  const courses = ['BBA', 'MBA', 'CSE', 'THM'];
  const intakes = ['1st', '2nd', '9th', '10th', '15th', '16th', '17th', '18th', '19th', '20th'];
  const semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

  // Fetch students for filter
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/accounts/students/', { params: { page_size: 10000 } });
        setStudents(response.data.results || response.data || []);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };
    fetchStudents();
  }, []);

  // Filter students based on course/intake/semester
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedCourse) list = list.filter(s => s.course === selectedCourse);
    if (selectedIntake) list = list.filter(s => s.intake === selectedIntake);
    if (selectedSemester) list = list.filter(s => s.semester === selectedSemester);
    if (studentSearch) {
      const search = studentSearch.toLowerCase();
      list = list.filter(s => 
        s.student_id?.toLowerCase().includes(search) ||
        `${s.user?.first_name} ${s.user?.last_name}`.toLowerCase().includes(search)
      );
    }
    return list;
  }, [students, selectedCourse, selectedIntake, selectedSemester, studentSearch]);

  const handleStudentSelect = (studentId) => {
    setSelectedStudent(studentId);
    if (studentId) {
      const student = students.find(s => s.id === parseInt(studentId));
      if (student) {
        if (student.course) setSelectedCourse(student.course);
        if (student.intake) setSelectedIntake(student.intake);
        if (student.semester) setSelectedSemester(student.semester);
      }
    }
  };

  const handleResetFilters = () => {
    setSelectedCourse('');
    setSelectedIntake('');
    setSelectedSemester('');
    setSelectedStudent('');
    setStudentSearch('');
  };

  const fetchPaymentReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCourse) params.course = selectedCourse;
      if (selectedIntake) params.intake = selectedIntake;
      if (selectedStudent) params.student = selectedStudent;

      const [semesterRes, currentRes, duesRes, feeTypeRes] = await Promise.all([
        api.get('/reports/payments/semester_wise/', { params }),
        api.get('/reports/payments/current_semester/', { params: { ...params, semester: selectedSemester || '1st' } }),
        api.get('/reports/payments/dues/', { params: { ...params, semester: selectedSemester } }),
        api.get('/reports/payments/fee_type_summary/', { params }),
      ]);

      setSemesterWiseData(semesterRes.data.data || []);
      setCurrentSemesterData(currentRes.data || { stats: {}, payments: [] });
      setDuesData(duesRes.data || { summary: {}, data: [] });
      setFeeTypeData(feeTypeRes.data.data || []);
    } catch (error) {
      console.error('Error fetching payment reports:', error);
      toast.error('Failed to load payment reports');
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedIntake, selectedSemester, selectedStudent]);

  const fetchResultReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCourse) params.course = selectedCourse;
      if (selectedIntake) params.intake = selectedIntake;
      if (selectedSemester) params.semester = selectedSemester;
      if (selectedStudent) params.student = selectedStudent;

      // Fetch exam summary and grade distribution
      const [examRes, gradeRes] = await Promise.all([
        api.get('/reports/results/exam_summary/', { params }),
        api.get('/reports/results/grade_distribution/', { params }),
      ]);

      setExamSummaryData(examRes.data.data || []);
      setGradeDistribution(gradeRes.data || {});
    } catch (error) {
      console.error('Error fetching result reports:', error);
      toast.error('Failed to load result reports');
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedIntake, selectedSemester, selectedStudent]);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPaymentReports();
    } else {
      fetchResultReports();
    }
  }, [activeTab, selectedCourse, selectedIntake, selectedSemester, selectedStudent, fetchPaymentReports, fetchResultReports]);

  // Single comprehensive PDF export that respects all filters
  const exportComprehensiveReportPDF = () => {
    const doc = new jsPDF();
    let yPos = 22;
    
    // Get selected student info if any
    const studentInfo = selectedStudent 
      ? students.find(s => s.id === parseInt(selectedStudent))
      : null;

    // Title
    doc.setFontSize(18);
    doc.text('Comprehensive Payment Report', 14, yPos);
    yPos += 10;
    
    // Filter info
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPos);
    yPos += 6;
    
    // Show applied filters
    const filters = [];
    if (selectedCourse) filters.push(`Course: ${selectedCourse}`);
    if (selectedIntake) filters.push(`Intake: ${selectedIntake}`);
    if (selectedSemester) filters.push(`Semester: ${selectedSemester}`);
    if (studentInfo) filters.push(`Student: ${studentInfo.user?.first_name} ${studentInfo.user?.last_name} (${studentInfo.student_id})`);
    
    if (filters.length > 0) {
      doc.text(`Filters: ${filters.join(' | ')}`, 14, yPos);
      yPos += 10;
    } else {
      doc.text('Filters: All Data', 14, yPos);
      yPos += 10;
    }

    // Section 1: Semester-wise Payment Summary
    if (semesterWiseData.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text('1. Semester-wise Payment Summary', 14, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Semester', 'Total Amount', 'Discount', 'Net Amount', 'Payments', 'Students']],
        body: semesterWiseData.map(s => [
          s.semester || 'N/A',
          `TK ${s.total_amount?.toLocaleString() || 0}`,
          `TK ${s.total_discount?.toLocaleString() || 0}`,
          `TK ${s.net_amount?.toLocaleString() || 0}`,
          s.payment_count || 0,
          s.student_count || 0,
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Section 2: Current Semester Summary
    if (currentSemesterData.stats && Object.keys(currentSemesterData.stats).length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text(`2. Current Semester Summary (${selectedSemester || '1st'})`, 14, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Amount', `TK ${currentSemesterData.stats.total_amount?.toLocaleString() || 0}`],
          ['Net Amount (After Discounts)', `TK ${currentSemesterData.stats.net_amount?.toLocaleString() || 0}`],
          ['Number of Payments', currentSemesterData.stats.payment_count || 0],
          ['Number of Students', currentSemesterData.stats.student_count || 0],
        ],
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Section 3: Fee Type Breakdown
    if (feeTypeData.length > 0) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 22;
      }

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text('3. Payments by Fee Type', 14, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      const totalFeeTypeAmount = feeTypeData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
      doc.setFontSize(10);
      doc.text(`Total: TK ${totalFeeTypeAmount.toLocaleString()}`, 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Fee Type', 'Total Amount', 'Payment Count', 'Percentage']],
        body: feeTypeData.map(item => [
          item.fee_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
          `TK ${item.total_amount?.toLocaleString() || 0}`,
          item.payment_count || 0,
          `${((item.total_amount / totalFeeTypeAmount) * 100).toFixed(1)}%`,
        ]),
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Section 4: Due Amounts for Course Completion
    if (duesData.data?.length > 0) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 22;
      }

      doc.setFontSize(14);
      doc.setTextColor(239, 68, 68);
      doc.text('4. Due Amounts for Course Completion', 14, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      // Summary stats
      doc.setFontSize(10);
      doc.text(`Total Students: ${duesData.summary?.total_students || 0} | Students with Dues: ${duesData.summary?.students_with_dues || 0} | Total Due: TK ${duesData.summary?.total_due?.toLocaleString() || 0}`, 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Student ID', 'Name', 'Course', 'Intake', 'Semester', 'Total Fee', 'Paid', 'Due']],
        body: duesData.data.map(d => [
          d.student_id,
          d.student_name,
          d.course,
          d.intake,
          d.semester,
          `TK ${d.total_fee?.toLocaleString() || 0}`,
          `TK ${d.total_paid?.toLocaleString() || 0}`,
          `TK ${d.due_amount?.toLocaleString() || 0}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

    // Generate filename with filters
    const filenameParts = ['payment_report'];
    if (selectedCourse) filenameParts.push(selectedCourse);
    if (studentInfo) filenameParts.push(studentInfo.student_id);
    filenameParts.push(new Date().toISOString().split('T')[0]);
    
    doc.save(`${filenameParts.join('_')}.pdf`);
    toast.success('Comprehensive report exported successfully');
  };

  const gradeChartData = Object.entries(gradeDistribution.distribution || {}).map(([grade, count]) => ({
    name: grade,
    value: count,
  }));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Reports
        </h1>
        <p className="text-gray-600 mt-2">View payment and academic reports</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <DollarSign className="w-5 h-5 inline-block mr-2" />
          Payment Reports
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'results'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <TrendingUp className="w-5 h-5 inline-block mr-2" />
          Result Reports
        </button>
      </div>

      {/* Filters and Export */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-700">Filters</h3>
          </div>
          {activeTab === 'payments' && (
            <button
              onClick={exportComprehensiveReportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              Export Report PDF
            </button>
          )}
        </div>
        {/* Row 1: Course/Intake/Semester */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Intake</label>
            <select
              value={selectedIntake}
              onChange={(e) => setSelectedIntake(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Intakes</option>
              {intakes.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Students ({filteredStudents.length})</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.student_id} - {s.user?.first_name} {s.user?.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Row 2: Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => activeTab === 'payments' ? fetchPaymentReports() : fetchResultReports()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Payment Reports */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Semester-wise Payment Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Semester-wise Payments
                </h3>
                {semesterWiseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={semesterWiseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semester" />
                      <YAxis />
                      <Tooltip formatter={(value) => `৳${value.toLocaleString()}`} />
                      <Bar dataKey="total_amount" fill="#3B82F6" name="Total Amount" />
                      <Bar dataKey="net_amount" fill="#10B981" name="Net Amount" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-10">No semester payment data available</p>
                )}
              </div>

              {/* Current Semester Stats */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Current Semester Summary ({selectedSemester || '1st'})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-800">
                      ৳{currentSemesterData.stats?.total_amount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 mb-1">Net Amount</p>
                    <p className="text-2xl font-bold text-green-800">
                      ৳{currentSemesterData.stats?.net_amount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 mb-1">Payments</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {currentSemesterData.stats?.payment_count || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 mb-1">Students</p>
                    <p className="text-2xl font-bold text-orange-800">
                      {currentSemesterData.stats?.student_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fee Type Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Payments by Fee Type
                </h3>
                {feeTypeData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={feeTypeData.map(item => ({
                            name: item.fee_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
                            value: item.total_amount
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {feeTypeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip formatter={(value) => `৳${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {feeTypeData.map((item, idx) => (
                        <div key={item.fee_type} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${COLORS[idx % COLORS.length]}15` }}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="font-medium capitalize">{item.fee_type?.replace('_', ' ') || 'Unknown'}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold" style={{ color: COLORS[idx % COLORS.length] }}>৳{item.total_amount?.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{item.payment_count} payments</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-10">No fee type payment data available</p>
                )}
              </div>

              {/* Dues Report */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Due for Course Completion
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-xl font-bold">{duesData.summary?.total_students || 0}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Students with Dues</p>
                    <p className="text-xl font-bold text-red-800">{duesData.summary?.students_with_dues || 0}</p>
                  </div>
                  <div className="p-4 bg-red-100 rounded-lg">
                    <p className="text-sm text-red-700">Total Due Amount</p>
                    <p className="text-xl font-bold text-red-800">৳{duesData.summary?.total_due?.toLocaleString() || 0}</p>
                  </div>
                </div>
                {duesData.data?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {duesData.data.slice(0, 10).map((d, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium">{d.student_name}</div>
                              <div className="text-gray-500 text-xs">{d.student_id}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{d.course} - {d.intake}</td>
                            <td className="px-4 py-3 text-sm">৳{d.total_fee?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-green-600">৳{d.total_paid?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-red-600">৳{d.due_amount?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {duesData.data.length > 10 && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Showing 10 of {duesData.data.length} students. Export PDF for full list.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result Reports */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {/* Grade Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Grade Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {gradeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={gradeChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {gradeChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-10">No grade data available</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(gradeDistribution.distribution || {}).map(([grade, count], idx) => (
                      <div key={grade} className="p-3 rounded-lg" style={{ backgroundColor: `${COLORS[idx % COLORS.length]}20` }}>
                        <p className="text-2xl font-bold" style={{ color: COLORS[idx % COLORS.length] }}>{count}</p>
                        <p className="text-sm text-gray-600">Grade {grade}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exam Summary */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Exam Summary</h3>
                {examSummaryData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Marks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {examSummaryData.map((exam) => (
                          <tr key={exam.exam_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{exam.exam_name}</td>
                            <td className="px-4 py-3 text-sm capitalize">{exam.exam_type?.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-sm">{new Date(exam.exam_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm">{exam.total_students}</td>
                            <td className="px-4 py-3 text-sm">{exam.average_marks?.toFixed(1)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                exam.pass_rate >= 70 ? 'bg-green-100 text-green-800' :
                                exam.pass_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {exam.pass_rate?.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-10">No exam data available</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
