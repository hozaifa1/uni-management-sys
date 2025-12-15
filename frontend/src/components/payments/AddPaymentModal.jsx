import { useState, useEffect } from 'react';
import { X, Search, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online Payment' },
];

const FEE_TYPE_OPTIONS = [
  { value: 'lab_fee', label: 'Lab Fee' },
  { value: 'library_fee', label: 'Library Fee' },
  { value: 'fine', label: 'Fine' },
  { value: 'semester_fee', label: 'Semester Fee' },
  { value: 'tuition_fee', label: 'Tuition Fee' },
  { value: 'admission_fee', label: 'Admission Fee' },
  { value: 'exam_fee', label: 'Exam Fee' },
];

const REGULARITY_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'irregular', label: 'Irregular' },
];

const AddPaymentModal = ({ onClose, onSuccess, students = [] }) => {
  const [formData, setFormData] = useState({
    student: '',
    fee_structure: '',
    fee_type: '',
    amount_paid: '',
    discount_amount: '0',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    payment_regularity: 'regular',
    transaction_id: '',
    remarks: '',
  });
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (selectedStudent) {
      fetchFeeStructures(selectedStudent);
    }
  }, [selectedStudent]);

  const fetchFeeStructures = async (student) => {
    try {
      const params = {};
      if (student.course) params.course = student.course;
      if (student.semester) params.semester = student.semester;
      
      const response = await api.get('/payments/fee-structures/', { params });
      setFeeStructures(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeeStructureChange = (e) => {
    const feeId = e.target.value;
    setFormData((prev) => ({ ...prev, fee_structure: feeId }));
    
    if (feeId) {
      const fee = feeStructures.find(f => f.id === parseInt(feeId));
      if (fee) {
        setFormData((prev) => ({ ...prev, amount_paid: fee.amount }));
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

  const filteredStudents = students.filter((student) => {
    const searchLower = studentSearch.toLowerCase();
    const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.toLowerCase();
    const studentId = (student.student_id || '').toLowerCase();
    const username = (student.user?.username || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           studentId.includes(searchLower) || 
           username.includes(searchLower);
  });

  const calculateFinalAmount = () => {
    const amount = parseFloat(formData.amount_paid) || 0;
    const discount = parseFloat(formData.discount_amount) || 0;
    return Math.max(amount - discount, 0);
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.student) errors.push('Please select a student');
    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      errors.push('Amount must be greater than 0');
    }
    if (!formData.payment_date) errors.push('Payment date is required');
    if (!formData.payment_method) errors.push('Payment method is required');
    
    const discount = parseFloat(formData.discount_amount) || 0;
    const amount = parseFloat(formData.amount_paid) || 0;
    if (discount > amount) {
      errors.push('Discount cannot exceed the amount paid');
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
        amount_paid: formData.amount_paid,
        discount_amount: formData.discount_amount || 0,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        payment_regularity: formData.payment_regularity || 'regular',
        fee_type: formData.fee_type || null,
        transaction_id: formData.transaction_id || null,
        remarks: formData.remarks || null,
      };

      if (formData.fee_structure) {
        payload.fee_structure = formData.fee_structure;
      }

      await api.post('/payments/payments/', payload);
      toast.success('Payment added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error adding payment:', error);
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, messages]) => {
          const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          if (Array.isArray(messages)) {
            messages.forEach(msg => toast.error(`${fieldName}: ${msg}`));
          } else {
            toast.error(`${fieldName}: ${messages}`);
          }
        });
      } else {
        toast.error(error.response?.data?.detail || 'Failed to add payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Payment</h2>
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
              />
            </div>
            
            {showStudentDropdown && studentSearch && (
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
                          {student.student_id} • {student.course} • {student.semester} Sem
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
                {selectedStudent.course} • {selectedStudent.intake} Intake • {selectedStudent.semester} Semester
              </p>
            </div>
          )}

          {/* Fee Structure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fee Type
            </label>
            <select
              name="fee_structure"
              value={formData.fee_structure}
              onChange={handleFeeStructureChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedStudent}
            >
              <option value="">Select Fee Type (Optional)</option>
              {feeStructures.map((fee) => (
                <option key={fee.id} value={fee.id}>
                  {fee.fee_type?.replace('_', ' ')} - ৳{fee.amount} (Due: {new Date(fee.due_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Fee Type and Regularity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Type
              </label>
              <select
                name="fee_type"
                value={formData.fee_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Fee Type</option>
                {FEE_TYPE_OPTIONS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regularity
              </label>
              <select
                name="payment_regularity"
                value={formData.payment_regularity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {REGULARITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount and Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">৳</span>
                <input
                  type="number"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">৳</span>
                <input
                  type="number"
                  name="discount_amount"
                  value={formData.discount_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Final Amount Display */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">Final Amount (After Discount):</span>
              <span className="text-xl font-bold text-green-600">৳{calculateFinalAmount().toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Date and Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction ID
            </label>
            <input
              type="text"
              name="transaction_id"
              value={formData.transaction_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter transaction reference (optional)"
            />
          </div>

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
              placeholder="Any additional notes..."
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
            {loading ? 'Adding...' : 'Add Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentModal;
