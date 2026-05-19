import { useState, useMemo } from 'react';
import { X, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FEE_FIELDS = [
  { key: 'semester_fee', label: 'Semester Fee' },
  { key: 'monthly_tuition_fee', label: 'Monthly Tuition Fee' },
  { key: 'midterm_1_fee', label: 'Midterm 1 Fee' },
  { key: 'midterm_2_fee', label: 'Midterm 2 Fee' },
  { key: 'nu_exam_fee', label: 'NU Exam Fee' },
  { key: 'library_deposit', label: 'Library Deposit' },
  { key: 'receivable_at_mt_exam', label: 'Receivable at MT Exam' },
  { key: 'total_payable_at_form_fillup', label: 'Total Payable at Form Fillup' },
  { key: 'total_receivable_end_of_semester', label: 'Total Receivable (End of Sem)' },
];

const SCOPE_OPTIONS = [
  { value: 'student', label: 'This Student Only' },
  { value: 'intake', label: 'All Students in Intake' },
  { value: 'semester', label: 'All Students in Semester' },
  { value: 'course', label: 'All Students in Course' },
];

const EditReceivablesModal = ({ row, onClose, onSuccess }) => {
  const [scope, setScope] = useState('student');
  const [fields, setFields] = useState(() =>
    Object.fromEntries(
      FEE_FIELDS.map((f) => [f.key, row?.[f.key] != null ? String(row[f.key]) : ''])
    )
  );
  // Tracks which fields the user actually edited (so blanks don't overwrite).
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const target = useMemo(() => {
    if (scope === 'student') return { student: row.student };
    if (scope === 'intake') {
      return {
        intake_batch: row.intake_batch,
        program: row.program || undefined,
      };
    }
    if (scope === 'semester') {
      return {
        semester: row.semester,
        program: row.program || undefined,
        intake_batch: row.intake_batch || undefined,
      };
    }
    if (scope === 'course') return { program: row.program };
    return {};
  }, [scope, row]);

  const scopeSummary = useMemo(() => {
    const parts = [];
    if (scope === 'student') parts.push(`${row.student_name || row.student_roll}`);
    if (scope === 'intake') parts.push(`Intake ${row.intake_batch || '—'}`);
    if (scope === 'semester') parts.push(`${row.semester || '—'}`);
    if (scope === 'course') parts.push(`Course ${row.program || '—'}`);
    if (scope !== 'course' && row.program) parts.push(`(${row.program})`);
    return parts.join(' ');
  }, [scope, row]);

  const handleChange = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    for (const f of FEE_FIELDS) {
      if (!touched[f.key]) continue;
      const v = fields[f.key];
      if (v === '' || v == null) continue;
      payload[f.key] = v;
    }
    if (Object.keys(payload).length === 0) {
      toast.error('Edit at least one field before saving.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/payments/semester-summaries/bulk-update-receivables/', {
        scope,
        target,
        fields: payload,
      });
      toast.success(`Updated ${res.data.updated} record(s).`);
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update receivables.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Edit Receivable Fees</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Apply changes to</label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${
                    scope === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Target: <span className="font-medium text-gray-700">{scopeSummary}</span>
            </p>
          </div>

          {/* Fields */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              Fee fields <span className="text-xs text-gray-500 font-normal">(only changed fields will be saved)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FEE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fields[f.key]}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        touched[f.key] ? 'border-blue-400 bg-blue-50/30' : 'border-gray-300'
                      }`}
                      placeholder="—"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-sm disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReceivablesModal;
