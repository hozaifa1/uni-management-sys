import { useState, useEffect, useMemo } from 'react';
import { X, Wallet, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const monthLabel = (d) => {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const ExpenseModal = ({
  onClose,
  onSuccess,
  categories = [],
  schedules = [],
  initial = null,
  onAddCategory,
}) => {
  const isEdit = !!initial;
  const [formData, setFormData] = useState({
    category: initial?.category || '',
    schedule: initial?.schedule || '',
    period_label: initial?.period_label || '',
    amount: initial?.amount?.toString() || '',
    expense_date: initial?.expense_date || new Date().toISOString().split('T')[0],
    paid_to: initial?.paid_to || '',
    description: initial?.description || '',
  });
  const [loading, setLoading] = useState(false);

  // Schedules filtered by selected category.
  const filteredSchedules = useMemo(() => {
    if (!formData.category) return [];
    return schedules.filter((s) => s.category === Number(formData.category) && s.is_active);
  }, [schedules, formData.category]);

  // When category changes, reset schedule and apply default amount if empty.
  useEffect(() => {
    if (isEdit) return;
    if (!formData.category) return;
    const cat = categories.find((c) => c.id === Number(formData.category));
    setFormData((p) => ({
      ...p,
      schedule: '',
      amount: p.amount || (cat?.default_amount ? String(cat.default_amount) : ''),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category]);

  // When schedule selected, prefill amount + payee + suggest period label.
  useEffect(() => {
    if (!formData.schedule) return;
    const s = schedules.find((x) => x.id === Number(formData.schedule));
    if (!s) return;
    setFormData((p) => ({
      ...p,
      amount: p.amount || String(s.amount_per_period || ''),
      paid_to: p.paid_to || s.payee || '',
      period_label: p.period_label || (s.frequency === 'monthly' ? monthLabel(p.expense_date) : ''),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.schedule]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) return toast.error('Pick a category');
    if (!formData.amount || Number(formData.amount) <= 0) {
      return toast.error('Amount must be greater than 0');
    }
    if (!formData.expense_date) return toast.error('Expense date is required');

    setLoading(true);
    try {
      const payload = {
        category: Number(formData.category),
        schedule: formData.schedule ? Number(formData.schedule) : null,
        period_label: formData.period_label || '',
        amount: Number(formData.amount),
        expense_date: formData.expense_date,
        paid_to: formData.paid_to || '',
        description: formData.description || '',
      };
      if (isEdit) {
        await api.patch(`/payments/expenses/${initial.id}/`, payload);
        toast.success('Expense updated');
      } else {
        await api.post('/payments/expenses/', payload);
        toast.success('Expense recorded');
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
        toast.error('Failed to save expense');
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
            <div className="p-2 bg-red-100 rounded-lg">
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Expense' : 'Record Expense'}
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

          {filteredSchedules.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apply to schedule <span className="text-gray-400">(optional)</span>
              </label>
              <select
                name="schedule"
                value={formData.schedule}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None (one-off expense) —</option>
                {filteredSchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.payee ? `${s.payee} • ` : ''}৳{Number(s.amount_per_period).toLocaleString()}/{s.frequency}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Linking pays down the recurring obligation.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid to</label>
              <input
                type="text"
                name="paid_to"
                value={formData.paid_to}
                onChange={handleChange}
                placeholder="Recipient name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period label <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                name="period_label"
                value={formData.period_label}
                onChange={handleChange}
                placeholder='e.g. "May 2026", "Q1 2026"'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Record Expense')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseModal;
