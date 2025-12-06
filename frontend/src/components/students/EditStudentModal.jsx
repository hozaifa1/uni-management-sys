import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const SEMESTER_OPTIONS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const InputField = ({ label, name, type = 'text', required = false, value, onChange, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      {...props}
    />
  </div>
);

const SelectField = ({ label, name, options, required = false, placeholder = 'Select...', value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
  </div>
);

const EditStudentModal = ({ student, batches, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date_of_birth: '',
    blood_group: '',
    admission_date: '',
    session: '',
    semester: '',
    batch: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_yearly_income: '',
    other_info: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setFormData({
        date_of_birth: student.date_of_birth || '',
        blood_group: student.blood_group || '',
        admission_date: student.admission_date || '',
        session: student.session || '',
        semester: student.semester || '',
        batch: student.batch || '',
        guardian_name: student.guardian_name || '',
        guardian_phone: student.guardian_phone || '',
        guardian_yearly_income: student.guardian_yearly_income || '',
        other_info: student.other_info || '',
      });
    }
  }, [student]);

  if (!student) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.patch(`/accounts/students/${student.id}/`, formData);
      toast.success('Student updated successfully');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Failed to update student. Please try again.';
      setError(errorMsg);
      toast.error('Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  const batchOptions = (batches || []).map(b => ({ value: b.id, label: b.name }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Student</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              required
              value={formData.date_of_birth}
              onChange={handleChange}
            />
            <SelectField
              label="Blood Group"
              name="blood_group"
              options={BLOOD_GROUP_OPTIONS}
              value={formData.blood_group}
              onChange={handleChange}
              placeholder="Select blood group"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Batch"
              name="batch"
              options={batchOptions}
              required
              value={formData.batch}
              onChange={handleChange}
              placeholder="Select batch"
            />
            <InputField
              label="Session"
              name="session"
              value={formData.session}
              onChange={handleChange}
            />
            <SelectField
              label="Semester"
              name="semester"
              options={SEMESTER_OPTIONS}
              value={formData.semester}
              onChange={handleChange}
              placeholder="Select semester"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Admission Date"
              name="admission_date"
              type="date"
              required
              value={formData.admission_date}
              onChange={handleChange}
            />
            <InputField
              label="Guardian Name"
              name="guardian_name"
              required
              value={formData.guardian_name}
              onChange={handleChange}
            />
            <InputField
              label="Guardian Phone"
              name="guardian_phone"
              required
              value={formData.guardian_phone}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Guardian Yearly Income"
              name="guardian_yearly_income"
              type="number"
              value={formData.guardian_yearly_income}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Other Information</label>
            <textarea
              name="other_info"
              value={formData.other_info}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes about the student"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
