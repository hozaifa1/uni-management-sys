import { useState, useEffect, useMemo } from 'react';
import { X, Search, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const EXAM_TYPE_OPTIONS = [
  { value: 'incourse_1st', label: '1st Incourse' },
  { value: 'incourse_2nd', label: '2nd Incourse' },
  { value: 'final', label: 'Final Exam' },
];

const AddResultModal = ({ onClose, onSuccess, students = [], subjects: initialSubjects = [], editingResult = null }) => {
  const [formData, setFormData] = useState({
    student: '',
    exam: '',
    exam_type: '',
    subject: '',
    marks_obtained: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Local copies of subjects and exams fetched based on selection
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [examsLoading, setExamsLoading] = useState(false);

  const isEditMode = !!editingResult;

  // Sync initial subjects prop
  useEffect(() => {
    setSubjects(initialSubjects);
  }, [initialSubjects]);

  // Fetch exams when subject is selected
  useEffect(() => {
    const fetchExamsForSubject = async () => {
      if (!formData.subject) {
        setExams([]);
        return;
      }
      try {
        setExamsLoading(true);
        const response = await api.get('/academics/exams/', {
          params: { subject: formData.subject, page_size: 100 }
        });
        setExams(response.data.results || response.data || []);
      } catch (err) {
        console.error('Error fetching exams:', err);
        setExams([]);
      } finally {
        setExamsLoading(false);
      }
    };
    if (!isEditMode) {
      fetchExamsForSubject();
    }
  }, [formData.subject, isEditMode]);

  // Auto-select exam when subject and exam_type are both selected
  useEffect(() => {
    if (!isEditMode && formData.subject && formData.exam_type && exams.length > 0) {
      const matchingExam = exams.find(e => e.exam_type === formData.exam_type);
      if (matchingExam) {
        setFormData(prev => ({ ...prev, exam: matchingExam.id }));
      } else {
        setFormData(prev => ({ ...prev, exam: '' }));
      }
    }
  }, [formData.subject, formData.exam_type, exams, isEditMode]);

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

  const filteredSubjects = useMemo(() => {
    if (isEditMode) {
      return subjects;
    }

    let list = subjects;

    if (formData.exam) {
      const exam = exams.find((e) => e.id === parseInt(formData.exam, 10));
      if (exam?.course) {
        list = list.filter(
          (subject) => subject.course_code === exam.course || subject.course === exam.course || subject.course_name === exam.course
        );
      }
    }

    if (selectedStudent?.course) {
      // Filter by course_code (primary) or course field as fallback
      list = list.filter((subject) => 
        subject.course_code === selectedStudent.course || subject.course === selectedStudent.course
      );
    }

    if (selectedStudent?.semester) {
      // Also filter by semester to show only relevant subjects
      list = list.filter((subject) => subject.semester === selectedStudent.semester);
    }

    return list;
  }, [exams, formData.exam, isEditMode, selectedStudent, subjects]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'subject') {
      const subject = subjects.find(s => s.id === parseInt(value));
      setSelectedSubject(subject);
      // Reset exam type and exam when subject changes
      if (!isEditMode) {
        setFormData((prev) => ({ ...prev, exam_type: '', exam: '' }));
      }
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

  const filteredStudents = useMemo(() => {
    let list = students;

    // Constrain by selected exam
    if (formData.exam) {
      const exam = exams.find((e) => e.id === parseInt(formData.exam, 10));
      if (exam) {
        list = list.filter(
          (student) =>
            (!exam.course || student.course === exam.course) &&
            (!exam.semester || student.semester === exam.semester)
        );
      }
    }

    // Constrain by selected subject (match course)
    if (formData.subject) {
      const subjectObj = subjects.find((s) => s.id === parseInt(formData.subject, 10));
      if (subjectObj?.course_code || subjectObj?.course) {
        const subjectCourse = subjectObj.course_code || subjectObj.course;
        list = list.filter((student) => student.course === subjectCourse);
      }
    }

    // Search filter
    const searchLower = studentSearch.toLowerCase();
    list = list.filter((student) => {
      const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.toLowerCase();
      const studentId = (student.student_id || '').toLowerCase();
      const username = (student.user?.username || '').toLowerCase();
      return (
        !studentSearch ||
        fullName.includes(searchLower) ||
        studentId.includes(searchLower) ||
        username.includes(searchLower)
      );
    });

    return list;
  }, [exams, formData.exam, formData.subject, studentSearch, students, subjects]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
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

        {/* Form - Scrollable middle section */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {/* Subject Section */}
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
              <option value="">
                {filteredSubjects.length === 0 && selectedStudent
                  ? `No subjects for ${selectedStudent.course}`
                  : 'Select Subject'}
              </option>
              {filteredSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} - ` : ''}{subject.name} (Max: {subject.total_marks})
                </option>
              ))}
            </select>
            {filteredSubjects.length === 0 && selectedStudent && (
              <p className="text-sm text-yellow-600 mt-1">
                No subjects found for this student's course. Please ensure subjects are seeded.
              </p>
            )}
          </div>

          {/* Exam Type Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Type <span className="text-red-500">*</span>
            </label>
            <select
              name="exam_type"
              value={formData.exam_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isEditMode || !formData.subject}
            >
              <option value="">
                {!formData.subject ? 'Select a subject first' : 'Select Exam Type'}
              </option>
              {EXAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {examsLoading && (
              <p className="text-sm text-gray-500 mt-1">Loading exams...</p>
            )}
            {!examsLoading && formData.subject && formData.exam_type && !formData.exam && (
              <p className="text-sm text-yellow-600 mt-1">
                No exam found for this subject and exam type. Please ensure exams are seeded.
              </p>
            )}
            {formData.exam && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Exam auto-selected based on subject and type
              </p>
            )}
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

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-white">
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
