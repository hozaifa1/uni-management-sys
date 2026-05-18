import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online Payment' },
];

const FEE_TYPE_OPTIONS = [
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

const SEMESTERS = ['1st Sem','2nd Sem','3rd Sem','4th Sem','5th Sem','6th Sem','7th Sem','8th Sem'];

const EditPaymentModal = ({ payment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fee_type: payment.fee_type || '',
    amount_paid: payment.amount_paid?.toString() || '',
    discount_amount: payment.discount_amount?.toString() || '0',
    late_fine: payment.late_fine?.toString() || '0',
    semester: payment.semester || '',
    payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
    payment_method: payment.payment_method || 'cash',
    payment_regularity: payment.payment_regularity || 'regular',
    transaction_id: payment.transaction_id || '',
    remarks: payment.remarks || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const finalAmount = Math.max(
    (parseFloat(formData.amount_paid) || 0) - (parseFloat(formData.discount_amount) || 0),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/payments/payments/${payment.id}/`, {
        fee_type: formData.fee_type || null,
        amount_paid: formData.amount_paid,
        discount_amount: formData.discount_amount || 0,
        late_fine: formData.late_fine || 0,
        semester: formData.semester || null,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        payment_regularity: formData.payment_regularity,
        transaction_id: formData.transaction_id || null,
        remarks: formData.remarks || null,
      });
      toast.success('Payment updated');
      onSuccess();
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([k, v]) => {
          toast.error(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        });
      } else {
        toast.error('Failed to update payment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Payment</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>Student:</strong> {payment.student_name} ({payment.student_id})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fee Type</label>
              <select name="fee_type" value={formData.fee_type} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">— None —</option>
                {FEE_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Semester</label>
              <select name="semester" value={formData.semester} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">— None —</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount *</label>
              <input type="number" name="amount_paid" value={formData.amount_paid}
                onChange={handleChange} min="0" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount</label>
              <input type="number" name="discount_amount" value={formData.discount_amount}
                onChange={handleChange} min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Late Fine</label>
              <input type="number" name="late_fine" value={formData.late_fine}
                onChange={handleChange} min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium text-green-800">Final (after discount):</span>
            <span className="text-xl font-bold text-green-600">৳{finalAmount.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" name="payment_date" value={formData.payment_date}
                onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Method *</label>
              <select name="payment_method" value={formData.payment_method}
                onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {PAYMENT_METHOD_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Transaction ID</label>
            <input type="text" name="transaction_id" value={formData.transaction_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </form>

        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPaymentModal;
