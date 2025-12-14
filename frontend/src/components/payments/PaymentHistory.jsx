import { X, DollarSign, Calendar, CreditCard, User, FileText, CheckCircle } from 'lucide-react';

const PaymentHistory = ({ payment, onClose }) => {
  if (!payment) return null;

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="w-5 h-5" />;
      case 'bank_transfer':
        return <CreditCard className="w-5 h-5" />;
      case 'online':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Payment Details</h2>
              <p className="text-green-100 text-sm">Transaction Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Section */}
          <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
            <p className="text-sm text-green-600 mb-1">Amount Paid</p>
            <p className="text-4xl font-bold text-green-600">৳{Number(payment.amount_paid).toLocaleString()}</p>
            {payment.discount_amount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Discount Applied: <span className="text-green-600 font-medium">৳{payment.discount_amount}</span>
              </p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Student Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Student</p>
              </div>
              <p className="font-semibold text-gray-900">{payment.student_name || 'N/A'}</p>
              <p className="text-sm text-gray-500">{payment.student_id || 'N/A'}</p>
            </div>

            {/* Payment Date */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Date</p>
              </div>
              <p className="font-semibold text-gray-900">{formatDate(payment.payment_date)}</p>
            </div>

            {/* Payment Method */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getPaymentMethodIcon(payment.payment_method)}
                <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Method</p>
              </div>
              <p className="font-semibold text-gray-900 capitalize">
                {payment.payment_method?.replace('_', ' ') || 'N/A'}
              </p>
            </div>

            {/* Fee Type */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Fee Type</p>
              </div>
              <p className="font-semibold text-gray-900 capitalize">
                {payment.fee_type?.replace('_', ' ') || 'General Payment'}
              </p>
            </div>
          </div>

          {/* Transaction ID */}
          {payment.transaction_id && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Transaction ID</p>
              <p className="font-mono text-sm text-blue-800">{payment.transaction_id}</p>
            </div>
          )}

          {/* Remarks */}
          {payment.remarks && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 uppercase tracking-wide mb-1">Remarks</p>
              <p className="text-sm text-yellow-800">{payment.remarks}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Created: {formatDate(payment.created_at)}</span>
              <span>Updated: {formatDate(payment.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
