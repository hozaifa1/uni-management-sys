import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Download, FileText, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import AddStudentModal from '../components/students/AddStudentModal';
import StudentDetailModal from '../components/students/StudentDetailModal';
import EditStudentModal from '../components/students/EditStudentModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

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

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [selectedStudentForView, setSelectedStudentForView] = useState(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/students/', { params: { page_size: 10000 } });
      setStudents(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (selectedCourse && student.course !== selectedCourse) return false;
      if (selectedIntake && student.intake !== selectedIntake) return false;
      if (selectedSemester && student.semester !== selectedSemester) return false;
      if (selectedSession && student.session !== selectedSession) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.toLowerCase();
        const studentId = (student.student_id || '').toLowerCase();
        if (!fullName.includes(search) && !studentId.includes(search)) return false;
      }
      return true;
    });
  }, [students, selectedCourse, selectedIntake, selectedSemester, selectedSession, searchTerm]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage, ITEMS_PER_PAGE]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCourse, selectedIntake, selectedSemester, selectedSession, searchTerm]);

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setSelectedIntake(''); // Reset intake when course changes
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/accounts/students/${deleteConfirm.id}/`);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchStudents();
  };

  const handleEditSuccess = () => {
    setSelectedStudentForEdit(null);
    fetchStudents();
  };

  const getCourseLabel = (student) => {
    const course = student.course || 'N/A';
    const major = student.major_name ? ` - ${student.major_name}` : '';
    return `${course}${major}`;
  };


  // Export all student info to PDF
  const exportStudentsPDF = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Student Information', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Students: ${filteredStudents.length}`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [['Student ID', 'Name', 'Course', 'Intake', 'Semester', 'Phone', 'Email']],
      body: filteredStudents.map(s => [
        s.student_id || 'N/A',
        s.user ? `${s.user.first_name || ''} ${s.user.last_name || ''}`.trim() : 'N/A',
        getCourseLabel(s),
        s.intake || 'N/A',
        s.semester || 'N/A',
        s.user?.phone_number || 'N/A',
        s.user?.email || 'N/A',
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`students_info_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Student info exported to PDF');
  };

  // Export phone numbers only
  const exportPhonesPDF = () => {
    const studentsWithPhone = filteredStudents.filter(s => s.user?.phone_number);
    if (studentsWithPhone.length === 0) {
      toast.error('No students with phone numbers');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Student Phone Directory', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total: ${studentsWithPhone.length} students`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [['Student ID', 'Name', 'Course', 'Phone Number']],
      body: studentsWithPhone.map(s => [
        s.student_id || 'N/A',
        s.user ? `${s.user.first_name || ''} ${s.user.last_name || ''}`.trim() : 'N/A',
        `${getCourseLabel(s)}${s.semester ? ` (Sem ${s.semester})` : ''}`,
        s.user?.phone_number || 'N/A',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`students_phones_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Phone directory exported to PDF');
  };

  // Export addresses only
  const exportAddressesPDF = () => {
    const studentsWithAddress = filteredStudents.filter(s => s.present_address || s.user?.address);
    if (studentsWithAddress.length === 0) {
      toast.error('No students with addresses');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Student Address Directory', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total: ${studentsWithAddress.length} students`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [['Student ID', 'Name', 'Course', 'Present Address']],
      body: studentsWithAddress.map(s => [
        s.student_id || 'N/A',
        s.user ? `${s.user.first_name || ''} ${s.user.last_name || ''}`.trim() : 'N/A',
        `${getCourseLabel(s)}${s.semester ? ` (Sem ${s.semester})` : ''}`,
        s.present_address || s.user?.address || 'N/A',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] },
      columnStyles: { 3: { cellWidth: 80 } },
    });

    doc.save(`students_addresses_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Address directory exported to PDF');
  };

  if (loading && students.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">Manage student records and information</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportStudentsPDF}
            className="flex items-center gap-2 px-3 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            title="Export all student info"
          >
            <FileText className="w-4 h-4" />
            All Info
          </button>
          <button
            onClick={exportPhonesPDF}
            className="flex items-center gap-2 px-3 py-2 border border-green-300 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            title="Export phone numbers"
          >
            <Phone className="w-4 h-4" />
            Phones
          </button>
          <button
            onClick={exportAddressesPDF}
            className="flex items-center gap-2 px-3 py-2 border border-orange-300 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            title="Export addresses"
          >
            <MapPin className="w-4 h-4" />
            Addresses
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <select
              value={selectedIntake}
              onChange={(e) => setSelectedIntake(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <input
              type="text"
              placeholder="Session (e.g. 2024-2025)"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course / Intake
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {student.photo ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={student.photo}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                              {student.user?.first_name?.[0] || student.user?.username?.[0] || 'S'}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.user?.first_name && student.user?.last_name
                              ? `${student.user.first_name} ${student.user.last_name}`
                              : student.user?.username || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{student.user?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">{student.student_id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {student.course || 'N/A'}
                        </span>
                        {student.intake && (
                          <span className="ml-1 text-xs text-gray-500">({student.intake} Intake)</span>
                        )}
                        {(student.semester || student.major_name) && (
                          <div className="mt-1 text-xs text-gray-500">
                            {student.semester ? `Sem ${student.semester}` : ''}{student.major_name ? `${student.semester ? ' • ' : ''}${student.major_name}` : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.session || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.user?.phone_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStudentForView(student)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedStudentForEdit(student)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(student.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No students found. Add your first student to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length} students
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

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* View Student Modal */}
      {selectedStudentForView && (
        <StudentDetailModal
          student={selectedStudentForView}
          onClose={() => setSelectedStudentForView(null)}
        />
      )}

      {/* Edit Student Modal */}
      {selectedStudentForEdit && (
        <EditStudentModal
          student={selectedStudentForEdit}
          onClose={() => setSelectedStudentForEdit(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default StudentsPage;

