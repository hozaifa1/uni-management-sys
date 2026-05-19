import { useState, useEffect } from 'react';
import { X, CalendarClock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time' },
];

const ScheduleModal = ({ onClose, onSuccess, categories = [], initial = null, onAddCategory }) => {
  const isEdit = !!initial;
  const [formData, setFormData] = useState({
    category: initial?.category || '',
    payee: initial?.payee || '',
    amount_per_period: initial?.amount_per_period?.toString() || '',
    frequency: initial?.frequency || 'monthly',
    start_date: initial?.start_date || new Date().toISOString().split('T')[0],
    end_date: initial?.end_date || '',
    day_of_period: initial?.day_of_period?.toString() || '',
    is_active: initial?.is_active ?? true,
    notes: initial?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  // Auto-fill amount from category default when category changes (only on create).
  useEffect(() => {
    if (isEdit) return;
    if (!formData.category) return;
    const cat = categories.find((c) => c.id === Number(formData.category));
    if (cat && Number(cat.default_amount) > 0 && !formData.amount_per_period) {
      setFormData((p) => ({ ...p, amount_per_period: String(cat.default_amount) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) return toast.error('Select a category');
    if (!formData.amount_per_period || Number(formData.amount_per_period) <= 0) {
      return toast.error('Amount must be greater than 0');
    }
    if (!formData.start_date) return toast.error('Start date required');

    setLoading(true);
    try {
      const payload = {
        category: Number(formData.category),
        payee: formData.payee || '',
        amount_per_period: Number(formData.amount_per_period),
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        day_of_period: formData.day_of_period ? Number(formData.day_of_period) : null,
        is_active: !!formData.is_active,
        notes: formData.notes || '',
      };
      if (isEdit) {
        await api.patch(`/payments/expense-schedules/${initial.id}/`, payload);
        toast.success('Schedule updated');
      } else {
        await api.post('/payments/expense-schedules/', payload);
        toast.success('Schedule added');
      }
      onSuccess();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([f, msgs]) => {
          const msg = Array.isArray(msgs) ? msgs.join(' ') : msgs;
          toast.error(`${f}: ${msg}`);
        });
      } else {
        toast.error('Failed to save schedule');
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <CalendarClock className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Schedule' : 'Add Recurring Schedule'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                {categories.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {onAddCategory && (
                <button
                  type="button"
                  onClick={onAddCategory}
                  className="px-3 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center gap-1 text-sm"
                  title="Add new category"
                >
                  <Plus className="w-4 h-4" /> New
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
              <input
                type="text"
                name="payee"
                value={formData.payee}
                onChange={handleChange}
                placeholder="e.g. Mr. Karim, DESCO"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount per period <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
              <input
                type="number"
                name="amount_per_period"
                value={formData.amount_per_period}
                onChange={handleChange}
                min="0"
                required
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank = ongoing.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due day <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="number"
              name="day_of_period"
              value={formData.day_of_period}
              onChange={handleChange}
              min="1"
              max="31"
              placeholder="e.g. 1 (day of month)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              checked={!!formData.is_active}
              onChange={handleChange}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </form>

        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Schedule')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
