import { useState } from 'react';
import { X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const KIND_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'rent', label: 'Rent' },
  { value: 'utility', label: 'Utility' },
  { value: 'food', label: 'Food' },
  { value: 'conveyance', label: 'Conveyance' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

const AddCategoryModal = ({ onClose, onSuccess, initial = null }) => {
  const isEdit = !!initial;
  const [formData, setFormData] = useState({
    name: initial?.name || '',
    kind: initial?.kind || 'other',
    default_amount: initial?.default_amount?.toString() || '0',
    is_active: initial?.is_active ?? true,
    notes: initial?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        kind: formData.kind,
        default_amount: Number(formData.default_amount) || 0,
        is_active: !!formData.is_active,
        notes: formData.notes || '',
      };
      if (isEdit) {
        await api.patch(`/payments/expense-categories/${initial.id}/`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/payments/expense-categories/', payload);
        toast.success('Category added');
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
        toast.error('Failed to save category');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? 'Edit Category' : 'Add Category'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Mr. Karim Salary, Generator Fuel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kind</label>
            <select
              name="kind"
              value={formData.kind}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Used for grouping and colors.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
              <input
                type="number"
                name="default_amount"
                value={formData.default_amount}
                onChange={handleChange}
                min="0"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Auto-suggested when creating schedules.</p>
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

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Category')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryModal;
