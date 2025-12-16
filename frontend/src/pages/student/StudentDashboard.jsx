import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Book, DollarSign, Calendar, 
  TrendingUp, Award, FileText, Clock 
} from 'lucide-react';
import api from '../../services/api';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState(null);
  const [results, setResults] = useState([]);
  const [payments, setPayments] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubjects: 0,
    averageGrade: 'N/A',
    totalPaid: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch student profile
      const studentResponse = await api.get('/accounts/students/', {
        params: { user: user?.id }
      });
      const students = studentResponse.data.results || studentResponse.data;
      const studentProfile = students.find(s => s.user?.id === user?.id) || students[0];
      setStudentData(studentProfile);

      if (studentProfile) {
        // Fetch results
        const resultsResponse = await api.get(`/academics/results/?student=${studentProfile.id}`);
        const studentResults = resultsResponse.data.results || resultsResponse.data;
        setResults(studentResults.slice(0, 5)); // Latest 5 results

        // Fetch payments
        const paymentsResponse = await api.get(`/payments/payments/?student=${studentProfile.id}`);
        const studentPayments = paymentsResponse.data.results || paymentsResponse.data;
        setPayments(studentPayments.slice(0, 5)); // Latest 5 payments

        // Fetch upcoming exams based on course/semester
        if (studentProfile.course && studentProfile.semester) {
          const examsResponse = await api.get('/academics/exams/', {
            params: { course: studentProfile.course, semester: studentProfile.semester }
          });
          const allExams = examsResponse.data.results || examsResponse.data;
          const upcoming = allExams.filter(exam => new Date(exam.exam_date) > new Date());
          setUpcomingExams(upcoming.slice(0, 3)); // Next 3 exams
        }

        // Calculate stats
        calculateStats(studentResults, studentPayments);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results, payments) => {
    // Calculate average grade
    const grades = results.map(r => {
      const percentage = (r.marks_obtained / r.subject?.total_marks) * 100;
      if (percentage >= 80) return 4.0;
      if (percentage >= 70) return 3.5;
      if (percentage >= 60) return 3.0;
      if (percentage >= 50) return 2.5;
      if (percentage >= 40) return 2.0;
      return 1.0;
    });
    const avgGrade = grades.length > 0 
      ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)
      : 'N/A';

    // Calculate payments
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

    setStats({
      totalSubjects: results.length,
      averageGrade: avgGrade,
      totalPaid: totalPaid.toFixed(2),
      pendingPayments: 0 // This would need fee structure data
    });
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
        <h1 className="text-3xl font-bold text-gray-800">Welcome back, {studentData?.user?.first_name}!</h1>
        <p className="text-gray-600 mt-2">Here's your academic overview</p>
      </div>

      {/* Student Profile Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
            {studentData?.photo ? (
              <img 
                src={studentData.photo} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-blue-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{studentData?.user?.first_name} {studentData?.user?.last_name}</h2>
            <p className="text-blue-100 mt-1">Student ID: {studentData?.student_id}</p>
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center">
                <Book className="w-4 h-4 mr-2" />
                <span>
                  {studentData?.course} - {studentData?.intake} Intake
                  {studentData?.semester ? ` • Sem ${studentData.semester}` : ''}
                  {studentData?.major_name ? ` • ${studentData.major_name}` : ''}
                </span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Admitted: {new Date(studentData?.admission_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalSubjects}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Book className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average GPA</p>
              <p className="text-2xl font-bold text-gray-800">{stats.averageGrade}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-gray-800">৳{stats.totalPaid}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Upcoming Exams</p>
              <p className="text-2xl font-bold text-gray-800">{upcomingExams.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Results and Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Award className="w-5 h-5 mr-2 text-blue-600" />
              Recent Results
            </h3>
            <a href="/student/results" className="text-sm text-blue-600 hover:text-blue-700">
              View All →
            </a>
          </div>
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No results available yet</p>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{result.subject?.name}</p>
                    <p className="text-sm text-gray-500">{result.exam?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{result.marks_obtained}/{result.subject?.total_marks}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      result.grade === 'A+' || result.grade === 'A' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {result.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Upcoming Exams
            </h3>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming exams scheduled</p>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{exam.name}</p>
                    <p className="text-sm text-gray-500">{exam.exam_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600">
                      {new Date(exam.exam_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Recent Payments
          </h3>
          <a href="/student/payments" className="text-sm text-blue-600 hover:text-blue-700">
            View All →
          </a>
        </div>
        {payments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No payment records available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Method</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-800">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      {payment.fee_structure?.fee_type || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">
                      ৳{payment.amount_paid}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {payment.payment_method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/student/results"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <FileText className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">My Results</h3>
          <p className="text-gray-600 text-sm">View all your exam results and download report cards</p>
        </a>

        <a
          href="/student/payments"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <DollarSign className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">My Payments</h3>
          <p className="text-gray-600 text-sm">Check payment history and pending dues</p>
        </a>

        <a
          href="/student/profile"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <User className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">My Profile</h3>
          <p className="text-gray-600 text-sm">View and update your personal information</p>
        </a>
      </div>
    </div>
  );
};

export default StudentDashboard;

