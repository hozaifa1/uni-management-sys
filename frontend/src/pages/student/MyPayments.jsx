import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DollarSign, CreditCard,
  FileText, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../../services/api';

const FEE_TYPE_LABELS = {
  'semester_fee': 'Semester Fee',
  'tuition_fee': 'Tuition Fee',
  'admission_fee': 'Admission Fee',
  'exam_fee': 'Exam Fee',
  'lab_fee': 'Lab Fee',
  'library_fee': 'Library Fee',
  'fine': 'Fine',
};

const FEE_TYPE_COLORS = {
  'semester_fee': 'blue',
  'tuition_fee': 'purple',
  'admission_fee': 'green',
  'exam_fee': 'orange',
  'lab_fee': 'cyan',
  'library_fee': 'pink',
  'fine': 'red',
};

const MyPayments = () => {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [stats, setStats] = useState({
    totalPaid: 0,
    paymentsCount: 0,
  });

  useEffect(() => {
    fetchPaymentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);

      // Fetch student profile
      const studentResponse = await api.get('/accounts/students/', {
        params: { user: user?.id },
      });
      const students = studentResponse.data.results || studentResponse.data;
      const studentProfile = students.find((s) => s.user?.id === user?.id) || students[0];
      setStudentData(studentProfile);

      if (studentProfile) {
        const paymentsResponse = await api.get(`/payments/payments/?student=${studentProfile.id}`);
        const studentPayments = paymentsResponse.data.results || paymentsResponse.data;
        setPayments(studentPayments);
        calculateStats(studentPayments);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentList) => {
    const totalPaid = paymentList.reduce(
      (sum, p) => sum + parseFloat(p.amount_paid || 0),
      0,
    );
    setStats({
      totalPaid: Math.round(totalPaid),
      paymentsCount: paymentList.length,
    });
  };

  // Group payments by fee type
  const paymentsByType = useMemo(() => {
    const grouped = {};
    payments.forEach((payment) => {
      const feeType = payment.fee_type || 'other';
      if (!grouped[feeType]) {
        grouped[feeType] = {
          payments: [],
          totalAmount: 0,
          count: 0,
        };
      }
      grouped[feeType].payments.push(payment);
      grouped[feeType].totalAmount += parseFloat(payment.amount_paid || 0);
      grouped[feeType].count += 1;
    });
    return grouped;
  }, [payments]);

  const toggleFeeType = (feeType) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [feeType]: !prev[feeType],
    }));
  };

  const getColorClasses = (color) => {
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: 'text-purple-600' },
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: 'text-orange-600' },
      cyan: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', icon: 'text-cyan-600' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', icon: 'text-pink-600' },
      red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-600' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: 'text-gray-600' },
    };
    return colorMap[color] || colorMap.gray;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Payments</h1>
        <p className="text-gray-600 mt-2">
          Your recorded payment history
          {studentData?.student_id && (
            <span className="block text-sm text-gray-500 mt-1">
              Student ID: {studentData.student_id}
            </span>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">
                ৳{Number(stats.totalPaid).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Payments Made</p>
              <p className="text-2xl font-bold text-gray-800">{stats.paymentsCount}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment History - Grouped by Fee Type */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Payment History by Type
          </h3>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Payments Yet</h3>
            <p className="text-gray-600">
              Your payment history will appear here once payments are recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(paymentsByType).map(([feeType, data]) => {
              const color = FEE_TYPE_COLORS[feeType] || 'gray';
              const colorClasses = getColorClasses(color);
              const isExpanded = expandedTypes[feeType] ?? true;

              return (
                <div key={feeType} className={`border ${colorClasses.border} rounded-lg overflow-hidden`}>
                  <button
                    onClick={() => toggleFeeType(feeType)}
                    className={`w-full flex items-center justify-between p-4 ${colorClasses.bg} hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-white rounded-full ${colorClasses.icon}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className={`font-semibold ${colorClasses.text}`}>
                          {FEE_TYPE_LABELS[feeType] ||
                            feeType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {data.count} payment{data.count !== 1 ? 's' : ''} •
                          Total: ৳{data.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${colorClasses.text} bg-white`}>
                        ৳{data.totalAmount.toLocaleString()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className={`w-5 h-5 ${colorClasses.icon}`} />
                      ) : (
                        <ChevronDown className={`w-5 h-5 ${colorClasses.icon}`} />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-white space-y-3">
                      {data.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <div className="p-2 bg-green-100 rounded-full">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Transaction ID: {payment.transaction_id || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-12">
                                <div>
                                  <p className="text-xs text-gray-500">Amount Paid</p>
                                  <p className="text-sm font-semibold text-gray-800">
                                    ৳{Number(payment.amount_paid).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Payment Date</p>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Payment Method</p>
                                  <p className="text-sm font-semibold text-gray-800 capitalize">
                                    {payment.payment_method?.replace('_', ' ')}
                                  </p>
                                </div>
                                {payment.discount_amount > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500">Discount</p>
                                    <p className="text-sm font-semibold text-green-600">
                                      ৳{payment.discount_amount}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {payment.remarks && (
                                <div className="ml-12 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                  <p className="text-xs text-blue-800">{payment.remarks}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium mb-1">Payment Information</p>
            <p className="text-sm text-blue-700">
              For any payment-related queries, please contact the accounts department.
              Keep your transaction receipts for future reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPayments;
