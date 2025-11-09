import { useEffect, useState } from 'react';
import { Users, DollarSign, AlertCircle, GraduationCap, TrendingUp, Calendar } from 'lucide-react';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
        {trend && (
          <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </p>
        )}
      </div>
      <div className={`p-4 ${color} rounded-xl`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const [studentsRes, teachersRes, paymentsStatsRes, recentPaymentsRes] = await Promise.all([
        api.get('/accounts/students/'),
        api.get('/students/teachers/'),
        api.get('/payments/payments/statistics/'),
        api.get('/payments/payments/recent/'),
      ]);

      setStats({
        totalStudents: studentsRes.data.count || studentsRes.data.length || 0,
        totalTeachers: teachersRes.data.count || teachersRes.data.length || 0,
        totalRevenue: paymentsStatsRes.data.total_revenue || 0,
        pendingPayments: paymentsStatsRes.data.pending_payments || 0,
      });

      setRecentPayments(recentPaymentsRes.data.results || recentPaymentsRes.data || []);

      // Mock revenue data for chart (you can replace with actual API data)
      setRevenueData([
        { month: 'Jan', revenue: 45000 },
        { month: 'Feb', revenue: 52000 },
        { month: 'Mar', revenue: 48000 },
        { month: 'Apr', revenue: 61000 },
        { month: 'May', revenue: 55000 },
        { month: 'Jun', revenue: 67000 },
      ]);
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
          trend="+12% from last month"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={GraduationCap}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="Revenue This Month"
          value={`৳${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-gradient-to-br from-green-500 to-green-600"
          trend="+8% from last month"
        />
        <StatCard
          title="Pending Payments"
          value={stats.pendingPayments}
          icon={AlertCircle}
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
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

      {/* Upcoming Events/Exams */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Events
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-900">Midterm Exams</p>
            <p className="text-xs text-blue-600 mt-1">Starting in 5 days</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-sm font-medium text-purple-900">Parent-Teacher Meeting</p>
            <p className="text-xs text-purple-600 mt-1">Next Saturday</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm font-medium text-green-900">Results Publication</p>
            <p className="text-xs text-green-600 mt-1">In 2 weeks</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

