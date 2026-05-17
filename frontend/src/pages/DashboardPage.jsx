import { useEffect, useState } from 'react';
import { Users, DollarSign, GraduationCap, TrendingUp, TrendingDown, Calendar, Wallet } from 'lucide-react';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon: IconComponent, color, trend }) => {
  const trendNum = typeof trend === 'number' ? trend : null;
  const isUp = trendNum !== null && trendNum >= 0;
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
          {trendNum !== null && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {`${isUp ? '+' : ''}${trendNum}% from last month`}
            </p>
          )}
        </div>
        <div className={`p-4 ${color} rounded-xl`}>
          {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
        </div>
      </div>
    </div>
  );
};

const formatExamDate = (dateStr) => {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 14) return `In ${diffDays} days`;
  if (diffDays >= 14 && diffDays < 60) return `In ${Math.round(diffDays / 7)} weeks`;
  return target.toLocaleDateString();
};

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    revenueThisMonth: 0,
    expensesThisMonth: 0,
    revenueTrend: null,
    expenseTrend: null,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [studentsRes, teachersRes, paymentsStatsRes, recentPaymentsRes, upcomingExamsRes] = await Promise.all([
        api.get('/accounts/students/'),
        api.get('/students/teachers/'),
        api.get('/payments/payments/statistics/'),
        api.get('/payments/payments/recent/'),
        api.get('/academics/exams/upcoming/?limit=5').catch(() => ({ data: [] })),
      ]);

      const ps = paymentsStatsRes.data || {};

      setStats({
        totalStudents: studentsRes.data.count || studentsRes.data.length || 0,
        totalTeachers: teachersRes.data.count || teachersRes.data.length || 0,
        revenueThisMonth: Number(ps.revenue_this_month || 0),
        expensesThisMonth: Number(ps.expenses_this_month || 0),
        revenueTrend: ps.revenue_trend_pct ?? null,
        expenseTrend: ps.expense_trend_pct ?? null,
      });

      setRecentPayments(recentPaymentsRes.data.results || recentPaymentsRes.data || []);

      const breakdown = (ps.monthly_breakdown || []).slice(-6).map((m) => ({
        month: (m.month || '').split(' ')[0].slice(0, 3),
        revenue: Number(m.revenue || 0),
      }));
      setRevenueData(breakdown);

      setUpcomingExams(upcomingExamsRes.data.results || upcomingExamsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={GraduationCap}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="Revenue This Month"
          value={`৳${stats.revenueThisMonth.toLocaleString()}`}
          icon={DollarSign}
          color="bg-gradient-to-br from-green-500 to-green-600"
          trend={stats.revenueTrend}
        />
        <StatCard
          title="Expenses This Month"
          value={`৳${stats.expensesThisMonth.toLocaleString()}`}
          icon={Wallet}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          trend={stats.expenseTrend}
        />
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h2>
          {revenueData.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => `৳${Number(v).toLocaleString()}`} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No revenue data yet
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {recentPayments.length > 0 ? (
              recentPayments.slice(0, 5).map((payment, index) => (
                <div key={payment.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {payment.student_name || `Student #${payment.student}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    +৳{payment.amount_paid?.toLocaleString() || 0}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No recent payments</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Exams */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Exams
        </h2>
        {upcomingExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-900">
                  {exam.subject_name || exam.name}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {exam.exam_type_display} · {exam.course} {exam.semester}
                </p>
                <p className="text-xs text-blue-600 mt-1">{formatExamDate(exam.exam_date)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p>No upcoming exams scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
