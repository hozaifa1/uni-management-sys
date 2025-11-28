import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  ClipboardList,
  TrendingUp,
  FileText,
} from 'lucide-react';
import api from '../../services/api';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBatches: 0,
    upcomingExams: 0,
    averageScore: 'N/A',
  });
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    fetchTeacherData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);

      const [studentsRes, batchesRes, examsRes, resultsRes] = await Promise.all([
        api.get('/accounts/students/'),
        api.get('/students/batches/'),
        api.get('/academics/exams/'),
        api.get('/academics/results/'),
      ]);

      const students = studentsRes.data.results || studentsRes.data || [];
      const batches = batchesRes.data.results || batchesRes.data || [];
      const exams = examsRes.data.results || examsRes.data || [];
      const results = resultsRes.data.results || resultsRes.data || [];

      const totalStudents = studentsRes.data.count || students.length;
      const activeBatches = batches.filter((batch) => batch.is_active !== false).length;

      const upcoming = exams
        .filter((exam) => new Date(exam.exam_date) >= new Date())
        .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));

      const averageScore =
        results.length > 0
          ? (results.reduce((sum, result) => sum + Number(result.marks_obtained || 0), 0) / results.length).toFixed(1)
          : 'N/A';

      setStats({
        totalStudents,
        activeBatches,
        upcomingExams: upcoming.length,
        averageScore,
      });

      setUpcomingExams(upcoming.slice(0, 3));
      setRecentResults(results.slice(0, 6));
    } catch (error) {
      console.error('Error fetching teacher dashboard data:', error);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hello, {user?.first_name || user?.username}!</h1>
        <p className="text-gray-600 mt-1">
          Here is a quick snapshot of your students, batches, and assessment performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Students</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</h3>
            </div>
            <div className="p-4 bg-blue-500 rounded-xl">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Batches</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.activeBatches}</h3>
            </div>
            <div className="p-4 bg-purple-500 rounded-xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Exams</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.upcomingExams}</h3>
            </div>
            <div className="p-4 bg-green-500 rounded-xl">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Marks (All Results)</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {stats.averageScore === 'N/A' ? stats.averageScore : `${stats.averageScore}%`}
              </h3>
            </div>
            <div className="p-4 bg-orange-500 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Upcoming Exams
            </h2>
          </div>
          {upcomingExams.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No upcoming exams scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{exam.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {exam.exam_type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Exam'}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {new Date(exam.exam_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Recent Assessments
            </h2>
          </div>
          {recentResults.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No recent assessments recorded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentResults.map((result) => (
                <div key={result.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{result.subject?.name || 'Subject'}</h3>
                      <p className="text-xs text-gray-500">
                        {result.student?.user?.full_name || result.student?.user?.username || 'Student'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{result.marks_obtained}</p>
                      <p className="text-xs text-gray-500">
                        {result.exam?.name ? `Exam: ${result.exam.name}` : 'Assessment'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/students"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
        >
          <Users className="w-8 h-8 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Students</h3>
          <p className="text-sm text-gray-600">Review student lists, update profiles, and monitor enrollment.</p>
        </a>

        <a
          href="/results"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
        >
          <ClipboardList className="w-8 h-8 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Update Results</h3>
          <p className="text-sm text-gray-600">Record and review academic performance across your batches.</p>
        </a>

        <a
          href="/reports"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
        >
          <FileText className="w-8 h-8 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Download Reports</h3>
          <p className="text-sm text-gray-600">Generate report cards and exam analytics for your classes.</p>
        </a>
      </div>
    </div>
  );
};

export default TeacherDashboard;


