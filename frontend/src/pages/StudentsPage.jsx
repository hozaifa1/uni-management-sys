import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import api from '../services/api';
import AddStudentModal from '../components/students/AddStudentModal';
import StudentDetailModal from '../components/students/StudentDetailModal';
import EditStudentModal from '../components/students/EditStudentModal';

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
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudentForView, setSelectedStudentForView] = useState(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm, selectedCourse, selectedIntake, selectedSemester, selectedSession]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        ...(selectedCourse && { course: selectedCourse }),
        ...(selectedIntake && { intake: selectedIntake }),
        ...(selectedSemester && { semester: selectedSemester }),
        ...(selectedSession && { session: selectedSession }),
      };
      
      const response = await api.get('/accounts/students/', { params });
      setStudents(response.data.results || response.data || []);
      
      if (response.data.count) {
        setTotalPages(Math.ceil(response.data.count / 20));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setSelectedIntake(''); // Reset intake when course changes
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.delete(`/accounts/students/${id}/`);
        fetchStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student');
      }
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

  if (loading && students.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">Manage student records and information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Student
        </button>
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
                  Semester
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
              {students.length > 0 ? (
                students.map((student) => (
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
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.session || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.semester ? (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          {student.semester}
                        </span>
                      ) : 'N/A'}
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
                          onClick={() => handleDelete(student.id)}
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
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No students found. Add your first student to get started!
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
              Page {currentPage} of {totalPages}
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
    </div>
  );
};

export default StudentsPage;

