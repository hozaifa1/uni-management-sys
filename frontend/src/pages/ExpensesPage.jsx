import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, Download, FileText, Pencil, Trash2,
  AlertCircle, Tag, CalendarClock, Wallet, TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ExpenseModal from '../components/expenses/ExpenseModal';
import ScheduleModal from '../components/expenses/ScheduleModal';
import AddCategoryModal from '../components/expenses/AddCategoryModal';

const FREQUENCY_LABELS = {
  monthly: 'Monthly', weekly: 'Weekly', quarterly: 'Quarterly',
  yearly: 'Yearly', one_time: 'One-time',
};

const KIND_BADGE = {
  salary: 'bg-blue-100 text-blue-700',
  rent: 'bg-amber-100 text-amber-700',
  utility: 'bg-cyan-100 text-cyan-700',
  food: 'bg-emerald-100 text-emerald-700',
  conveyance: 'bg-indigo-100 text-indigo-700',
  maintenance: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

const formatTk = (n) => `৳${Number(n || 0).toLocaleString()}`;

// ---------------- Dues Panel ----------------
const DuesPanel = ({ overview, schedules, onRecord, onRefresh }) => {
  const [kindFilter, setKindFilter] = useState('');

  const filteredCategories = useMemo(() => {
    const rows = overview?.categories || [];
    return kindFilter ? rows.filter((r) => r.category_kind === kindFilter) : rows;
  }, [overview, kindFilter]);

  const kinds = useMemo(() => {
    const set = new Set((overview?.categories || []).map((c) => c.category_kind));
    return Array.from(set);
  }, [overview]);

  if (!overview) return <LoadingSkeleton />;

  const totals = overview.totals || {};

  return (
    <div className="space-y-6">
      {/* Totals strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Expected to date</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatTk(totals.expected_total)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatTk(totals.paid_total)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Outstanding due</p>
          <p className={`text-2xl font-bold mt-1 ${totals.outstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatTk(totals.outstanding)}
          </p>
        </div>
      </div>

      {/* Kind filter chips */}
      {kinds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setKindFilter('')}
            className={`px-3 py-1 text-xs rounded-full border ${
              !kindFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            All
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`px-3 py-1 text-xs rounded-full border capitalize ${
                kindFilter === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Category cards */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No active obligations yet. Add a schedule under the <strong>Schedules</strong> tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((c) => {
            const overdue = c.outstanding > 0;
            const borderClr = overdue ? 'border-red-200' : 'border-emerald-200';
            const dueClr = overdue ? 'text-red-600' : 'text-emerald-600';
            return (
              <div key={c.category_id} className={`bg-white p-5 rounded-xl shadow-sm border-2 ${borderClr}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.category_name}</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${KIND_BADGE[c.category_kind] || KIND_BADGE.other} capitalize`}>
                      {c.category_kind}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{c.schedule_count} schedule{c.schedule_count > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Expected</span><span>{formatTk(c.expected_total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Paid</span><span>{formatTk(c.paid_total)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-gray-100">
                    <span className="text-gray-700">Due</span>
                    <span className={dueClr}>{formatTk(c.outstanding)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onRecord(c)}
                  className="w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
                >
                  Record Payment
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------- Schedules Panel ----------------
const SchedulesPanel = ({ schedules, canEdit, canDelete, onAdd, onEdit, onDelete }) => {
  if (!schedules) return <LoadingSkeleton />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Recurring Obligations ({schedules.length})</h3>
        {canEdit && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4" /> Add Schedule
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Payee</th>
              <th className="px-4 py-3 text-left">Frequency</th>
              <th className="px-4 py-3 text-right">Per period</th>
              <th className="px-4 py-3 text-right">Expected</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3 text-left">Start</th>
              <th className="px-4 py-3 text-left">End</th>
              <th className="px-4 py-3 text-center">Status</th>
              {(canEdit || canDelete) && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schedules.length === 0 ? (
              <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500">No schedules yet.</td></tr>
            ) : schedules.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.category_name}</td>
                <td className="px-4 py-3 text-gray-700">{s.payee || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{FREQUENCY_LABELS[s.frequency] || s.frequency}</td>
                <td className="px-4 py-3 text-right">{formatTk(s.amount_per_period)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatTk(s.expected_total)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatTk(s.paid_total)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${s.outstanding > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {formatTk(s.outstanding)}
                </td>
                <td className="px-4 py-3 text-gray-600">{s.start_date}</td>
                <td className="px-4 py-3 text-gray-600">{s.end_date || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {(canEdit || canDelete) && (
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {canEdit && (
                      <button onClick={() => onEdit(s)} className="text-blue-600 hover:text-blue-800" title="Edit">
                        <Pencil className="w-4 h-4 inline" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => onDelete(s)} className="text-red-600 hover:text-red-800" title="Delete">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------- Ledger Panel ----------------
const LedgerPanel = ({ expenses, categories, canEdit, canDelete, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return (expenses || []).filter((e) => {
      if (categoryFilter && String(e.category) !== String(categoryFilter)) return false;
      if (dateFrom && e.expense_date < dateFrom) return false;
      if (dateTo && e.expense_date > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [e.paid_to, e.category_name, e.period_label, e.description]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, dateFrom, dateTo, search]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0), [filtered]);

  const exportCSV = () => {
    const headers = ['Date', 'Category', 'Paid To', 'Period', 'Amount', 'Description'];
    const rows = filtered.map((e) => [
      e.expense_date,
      e.category_name || e.expense_type || '',
      e.paid_to || '',
      e.period_label || '',
      e.amount,
      (e.description || '').replace(/\n/g, ' '),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Expense Ledger', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total: BDT ${total.toLocaleString()}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [['Date', 'Category', 'Paid To', 'Period', 'Amount']],
      body: filtered.map((e) => [
        e.expense_date,
        e.category_name || e.expense_type || '',
        e.paid_to || '',
        e.period_label || '',
        `BDT ${Number(e.amount).toLocaleString()}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`expenses-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payee, period, description..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            title="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            title="To"
          />
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''} • Total <strong className="text-red-600">{formatTk(total)}</strong>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Paid To</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Description</th>
                {(canEdit || canDelete) && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No expenses match the filters.</td></tr>
              ) : filtered.slice(0, 300).map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.expense_date}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{e.category_name || e.expense_type || '—'}</span>
                    {e.category_kind && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${KIND_BADGE[e.category_kind] || KIND_BADGE.other} capitalize`}>
                        {e.category_kind}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.paid_to || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.period_label || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{formatTk(e.amount)}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={e.description}>{e.description || '—'}</td>
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {canEdit && (
                        <button onClick={() => onEdit(e)} className="text-blue-600 hover:text-blue-800" title="Edit">
                          <Pencil className="w-4 h-4 inline" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(e)} className="text-red-600 hover:text-red-800" title="Delete">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 300 && (
            <div className="p-3 text-sm text-gray-500 text-center bg-gray-50">
              Showing first 300 of {filtered.length} — narrow your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------- Main Page ----------------
const ExpensesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser;
  const canEdit = isAdmin;
  const canDelete = isAdmin;

  const [activeTab, setActiveTab] = useState('dues');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [overview, setOverview] = useState(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: null, id: null });
  const [presetCategoryId, setPresetCategoryId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, schedRes, expRes, overviewRes] = await Promise.allSettled([
        api.get('/payments/expense-categories/', { params: { page_size: 200 } }),
        api.get('/payments/expense-schedules/', { params: { page_size: 200 } }),
        api.get('/payments/expenses/', { params: { page_size: 500 } }),
        api.get('/payments/expenses/dues-overview/'),
      ]);
      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value.data.results || catsRes.value.data || []);
      }
      if (schedRes.status === 'fulfilled') {
        setSchedules(schedRes.value.data.results || schedRes.value.data || []);
      }
      if (expRes.status === 'fulfilled') {
        setExpenses(expRes.value.data.results || expRes.value.data || []);
      }
      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load expenses data', err);
      toast.error('Failed to load expenses data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRecordFromCard = (categoryRow) => {
    setPresetCategoryId(categoryRow.category_id);
    setEditingExpense(null);
    setShowExpenseModal(true);
  };

  const handleDelete = async () => {
    const { type, id } = confirmDelete;
    try {
      if (type === 'expense') {
        await api.delete(`/payments/expenses/${id}/`);
        toast.success('Expense deleted');
      } else if (type === 'schedule') {
        await api.delete(`/payments/expense-schedules/${id}/`);
        toast.success('Schedule deleted');
      }
      setConfirmDelete({ open: false, type: null, id: null });
      loadAll();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses]
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Track payables, recurring obligations, and outflows</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditingExpense(null); setPresetCategoryId(null); setShowExpenseModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-md"
          >
            <Plus className="w-5 h-5" />
            Record Expense
          </button>
        )}
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg"><TrendingDown className="w-6 h-6 text-red-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total spent</p>
            <p className="text-2xl font-bold text-gray-900">{formatTk(totalSpent)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-lg"><CalendarClock className="w-6 h-6 text-orange-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Active schedules</p>
            <p className="text-2xl font-bold text-gray-900">{schedules.filter((s) => s.is_active).length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg"><Tag className="w-6 h-6 text-purple-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Categories</p>
            <p className="text-2xl font-bold text-gray-900">{categories.filter((c) => c.is_active).length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'dues', label: 'Dues Overview', icon: AlertCircle },
            { key: 'schedules', label: 'Schedules', icon: CalendarClock },
            { key: 'ledger', label: 'Expense Ledger', icon: Wallet },
            { key: 'categories', label: 'Categories', icon: Tag },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === t.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'dues' && (
        <DuesPanel
          overview={overview}
          schedules={schedules}
          onRecord={handleRecordFromCard}
          onRefresh={loadAll}
        />
      )}

      {activeTab === 'schedules' && (
        <SchedulesPanel
          schedules={schedules}
          canEdit={canEdit}
          canDelete={canDelete}
          onAdd={() => { setEditingSchedule(null); setShowScheduleModal(true); }}
          onEdit={(s) => { setEditingSchedule(s); setShowScheduleModal(true); }}
          onDelete={(s) => setConfirmDelete({ open: true, type: 'schedule', id: s.id })}
        />
      )}

      {activeTab === 'ledger' && (
        <LedgerPanel
          expenses={expenses}
          categories={categories}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(e) => { setEditingExpense(e); setShowExpenseModal(true); }}
          onDelete={(e) => setConfirmDelete({ open: true, type: 'expense', id: e.id })}
        />
      )}

      {activeTab === 'categories' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Categories ({categories.length})</h3>
            {canEdit && (
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Kind</th>
                  <th className="px-4 py-3 text-right">Default Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${KIND_BADGE[c.kind] || KIND_BADGE.other}`}>
                        {c.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatTk(c.default_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => { setShowExpenseModal(false); setEditingExpense(null); setPresetCategoryId(null); }}
          onSuccess={() => { setShowExpenseModal(false); setEditingExpense(null); setPresetCategoryId(null); loadAll(); }}
          categories={categories}
          schedules={schedules}
          initial={editingExpense || (presetCategoryId ? { category: presetCategoryId } : null)}
          onAddCategory={() => setShowCategoryModal(true)}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          onClose={() => { setShowScheduleModal(false); setEditingSchedule(null); }}
          onSuccess={() => { setShowScheduleModal(false); setEditingSchedule(null); loadAll(); }}
          categories={categories}
          initial={editingSchedule}
          onAddCategory={() => setShowCategoryModal(true)}
        />
      )}

      {showCategoryModal && (
        <AddCategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSuccess={() => { setShowCategoryModal(false); loadAll(); }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title={`Delete ${confirmDelete.type}?`}
        message={`This will permanently remove this ${confirmDelete.type}. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete({ open: false, type: null, id: null })}
      />
    </div>
  );
};

export default ExpensesPage;
