import { useState, useEffect } from 'react';
import { X, Search, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AddResultModal = ({ onClose, onSuccess, students = [], exams = [], subjects = [], editingResult = null }) => {
  const [formData, setFormData] = useState({
    student: '',
    exam: '',
    subject: '',
    marks_obtained: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const isEditMode = !!editingResult;

  useEffect(() => {
    if (editingResult) {
      setFormData({
        student: editingResult.student || '',
        exam: editingResult.exam || '',
        subject: editingResult.subject || '',
        marks_obtained: editingResult.marks_obtained || '',
        remarks: editingResult.remarks || '',
      });

      const student = students.find(s => s.id === editingResult.student);
      if (student) {
        setSelectedStudent(student);
        setStudentSearch(getStudentDisplayName(student));
      }

      const subject = subjects.find(s => s.id === editingResult.subject);
      if (subject) {
        setSelectedSubject(subject);
      }
    }
  }, [editingResult, students, subjects]);

  useEffect(() => {
    if (formData.exam && selectedStudent) {
      const exam = exams.find(e => e.id === parseInt(formData.exam));
      if (exam && exam.course) {
        const courseSubjects = subjects.filter(s => 
          s.course === exam.course || s.course_name === exam.course
        );
        setFilteredSubjects(courseSubjects.length > 0 ? courseSubjects : subjects);
      } else {
        setFilteredSubjects(subjects);
      }
    } else {
      setFilteredSubjects(subjects);
    }
  }, [formData.exam, selectedStudent, subjects, exams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'subject') {
      const subject = subjects.find(s => s.id === parseInt(value));
      setSelectedSubject(subject);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setFormData((prev) => ({ ...prev, student: student.id }));
    setStudentSearch(getStudentDisplayName(student));
    setShowStudentDropdown(false);
  };

  const getStudentDisplayName = (student) => {
    if (!student) return '';
    const name = student.user?.first_name && student.user?.last_name
      ? `${student.user.first_name} ${student.user.last_name}`
      : student.user?.username || 'N/A';
    return `${name} (${student.student_id || 'N/A'})`;
  };

  const filteredStudents = students.filter((student) => {
    const searchLower = studentSearch.toLowerCase();
    const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.toLowerCase();
    const studentId = (student.student_id || '').toLowerCase();
    const username = (student.user?.username || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           studentId.includes(searchLower) || 
           username.includes(searchLower);
  });

  const getMaxMarks = () => {
    if (selectedSubject?.total_marks) return selectedSubject.total_marks;
    const exam = exams.find(e => e.id === parseInt(formData.exam));
    return exam?.total_marks || 100;
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.student) errors.push('Please select a student');
    if (!formData.exam) errors.push('Please select an exam');
    if (!formData.subject) errors.push('Please select a subject');
    if (formData.marks_obtained === '' || formData.marks_obtained === null) {
      errors.push('Please enter marks obtained');
    }
    
    const marks = parseFloat(formData.marks_obtained);
    if (isNaN(marks) || marks < 0) {
      errors.push('Marks must be a valid non-negative number');
    }
    
    const maxMarks = getMaxMarks();
    if (marks > maxMarks) {
      errors.push(`Marks cannot exceed ${maxMarks}`);
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }

    setLoading(true);

    try {
      const payload = {
        student: formData.student,
        exam: formData.exam,
        subject: formData.subject,
        marks_obtained: parseFloat(formData.marks_obtained),
        remarks: formData.remarks || '',
      };

      if (isEditMode) {
        await api.patch(`/academics/results/${editingResult.id}/`, payload);
        toast.success('Result updated successfully!');
      } else {
        await api.post('/academics/results/', payload);
        toast.success('Result added successfully!');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving result:', error);
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        if (typeof errorData === 'string') {
          toast.error(errorData);
        } else if (Array.isArray(errorData)) {
          errorData.forEach(msg => toast.error(msg));
        } else {
          Object.entries(errorData).forEach(([field, messages]) => {
            const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (Array.isArray(messages)) {
              messages.forEach(msg => toast.error(`${fieldName}: ${msg}`));
            } else {
              toast.error(`${fieldName}: ${messages}`);
            }
          });
        }
      } else {
        toast.error(error.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'add'} result. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = () => {
    const marks = parseFloat(formData.marks_obtained);
    const maxMarks = getMaxMarks();
    if (isNaN(marks) || maxMarks === 0) return 0;
    return ((marks / maxMarks) * 100).toFixed(2);
  };

  const getGradePreview = () => {
    const percentage = parseFloat(calculatePercentage());
    if (percentage >= 80) return { grade: 'A+', color: 'text-green-600 bg-green-100' };
    if (percentage >= 70) return { grade: 'A', color: 'text-green-600 bg-green-100' };
    if (percentage >= 60) return { grade: 'A-', color: 'text-blue-600 bg-blue-100' };
    if (percentage >= 50) return { grade: 'B', color: 'text-blue-600 bg-blue-100' };
    if (percentage >= 40) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100' };
    if (percentage >= 33) return { grade: 'D', color: 'text-orange-600 bg-orange-100' };
    return { grade: 'F', color: 'text-red-600 bg-red-100' };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Result' : 'Add New Result'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Student Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search student by name or ID..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setShowStudentDropdown(true);
                }}
                onFocus={() => setShowStudentDropdown(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isEditMode}
              />
            </div>
            
            {showStudentDropdown && studentSearch && !isEditMode && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.slice(0, 10).map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleStudentSelect(student)}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {student.user?.first_name?.[0] || student.user?.username?.[0] || 'S'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {student.user?.first_name} {student.user?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.student_id} • {student.course} • Sem {student.semester}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500">No students found</div>
                )}
              </div>
            )}
          </div>

          {/* Selected Student Info */}
          {selectedStudent && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {getStudentDisplayName(selectedStudent)} • 
                {selectedStudent.course} • {selectedStudent.intake} Intake • Semester {selectedStudent.semester}
              </p>
            </div>
          )}

          {/* Exam and Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam <span className="text-red-500">*</span>
              </label>
              <select
                name="exam"
                value={formData.exam}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isEditMode}
              >
                <option value="">Select Exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({exam.exam_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isEditMode}
              >
                <option value="">Select Subject</option>
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code ? `${subject.code} - ` : ''}{subject.name} (Max: {subject.total_marks})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Marks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marks Obtained <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="marks_obtained"
                value={formData.marks_obtained}
                onChange={handleChange}
                min="0"
                max={getMaxMarks()}
                step="0.01"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Enter marks (Max: ${getMaxMarks()})`}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                / {getMaxMarks()}
              </span>
            </div>
          </div>

          {/* Grade Preview */}
          {formData.marks_obtained !== '' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Percentage: </span>
                  <span className="text-lg font-bold text-gray-900">{calculatePercentage()}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Grade: </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getGradePreview().color}`}>
                    {getGradePreview().grade}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes about this result..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Result' : 'Add Result')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddResultModal;
