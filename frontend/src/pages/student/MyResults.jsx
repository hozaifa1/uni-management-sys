import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Download, Eye, Filter, TrendingUp, 
  Award, BarChart3, FileText 
} from 'lucide-react';
import api from '../../services/api';

const MyResults = () => {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState(null);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState('');
  const [stats, setStats] = useState({
    totalExams: 0,
    averagePercentage: 0,
    highestGrade: 'N/A',
    totalSubjects: 0
  });

  useEffect(() => {
    fetchStudentResults();
  }, [selectedExam]);

  const getSubjectTotal = (result) =>
    result.subject_total_marks ??
    result.subject?.total_marks ??
    0;

  const fetchStudentResults = async () => {
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
        // Fetch all results
        let url = `/academics/results/?student=${studentProfile.id}`;
        if (selectedExam) {
          url += `&exam=${selectedExam}`;
        }
        
        const resultsResponse = await api.get(url);
        const studentResults = resultsResponse.data.results || resultsResponse.data;
        setResults(studentResults);

        // Fetch exams for filter based on course/semester
        if (studentProfile.course && studentProfile.semester) {
          const examsResponse = await api.get('/academics/exams/', {
            params: { course: studentProfile.course, semester: studentProfile.semester }
          });
          setExams(examsResponse.data.results || examsResponse.data);
        }

        // Calculate stats
        calculateStats(studentResults);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results) => {
    if (results.length === 0) {
      setStats({ totalExams: 0, averagePercentage: 0, highestGrade: 'N/A', totalSubjects: 0 });
      return;
    }

    // Get unique exams
    const uniqueExams = [...new Set(results.map(r => r.exam ?? r.exam_id))];
    
    // Calculate average percentage
    const percentages = results.map((r) => {
      const total = getSubjectTotal(r);
      return total ? (r.marks_obtained / total) * 100 : 0;
    });
    const avgPercentage = percentages.reduce((a, b) => a + b, 0) / percentages.length;

    // Find highest grade
    const grades = ['A+', 'A', 'A-', 'B', 'C', 'D', 'F'];
    const resultGrades = results.map(r => r.grade);
    const highestGrade = grades.find(grade => resultGrades.includes(grade)) || 'N/A';

    setStats({
      totalExams: uniqueExams.length,
      averagePercentage: avgPercentage.toFixed(2),
      highestGrade: highestGrade,
      totalSubjects: results.length
    });
  };

  const handleDownloadReportCard = async (examId) => {
    if (!studentData || !examId) return;
    
    try {
      const response = await api.get('/academics/results/generate_report_card/', {
        params: { student_id: studentData.id, exam_id: examId },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_card_${studentData?.student_id || studentData?.id}_${examId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report card:', error);
    }
  };

  // Group results by exam
  const groupedResults = results.reduce((acc, result) => {
    const examId = result.exam ?? result.exam_id;
    if (!acc[examId]) {
      acc[examId] = {
        exam: {
          id: examId,
          name: result.exam_name || result.exam?.name,
          exam_date: result.exam_date || result.exam?.exam_date,
          exam_type: result.exam_type || result.exam?.exam_type,
        },
        results: []
      };
    }
    acc[examId].results.push(result);
    return acc;
  }, {});

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
        <h1 className="text-3xl font-bold text-gray-800">My Results</h1>
        <p className="text-gray-600 mt-2">View your exam performance and download report cards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Exams</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalExams}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg. Percentage</p>
              <p className="text-2xl font-bold text-gray-800">{stats.averagePercentage}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Highest Grade</p>
              <p className="text-2xl font-bold text-gray-800">{stats.highestGrade}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalSubjects}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} - {new Date(exam.exam_date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results by Exam */}
      {results.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Results Available</h3>
          <p className="text-gray-600">Your exam results will appear here once they are published.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedResults).map(({ exam, results }) => {
            // Calculate exam-wise stats
            const totalMarks = results.reduce((sum, r) => sum + getSubjectTotal(r), 0);
            const obtainedMarks = results.reduce((sum, r) => sum + parseFloat(r.marks_obtained || 0), 0);
            const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;

            return (
              <div key={exam?.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Exam Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{exam?.name}</h3>
                      <p className="text-blue-100 mt-1">
                        {exam?.exam_date ? new Date(exam.exam_date).toLocaleDateString() : '-'} • {exam?.exam_type || '-'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadReportCard(exam?.id)}
                      className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report Card
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-blue-100 text-sm">Total Marks</p>
                      <p className="text-2xl font-bold">{obtainedMarks}/{totalMarks}</p>
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm">Percentage</p>
                      <p className="text-2xl font-bold">{percentage}%</p>
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm">Status</p>
                      <p className="text-2xl font-bold">{percentage >= 40 ? 'PASS' : 'FAIL'}</p>
                    </div>
                  </div>
                </div>

                {/* Results Table */}
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Subject</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Code</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Total Marks</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Obtained</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Percentage</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result) => {
                          const subjectTotal = getSubjectTotal(result);
                          const subjectPercentage = subjectTotal
                            ? ((result.marks_obtained / subjectTotal) * 100).toFixed(2)
                            : 0;

                          return (
                            <tr key={result.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm font-medium text-gray-800">
                                {result.subject_name || result.subject?.name}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {result.subject_code || result.subject?.code}
                              </td>
                              <td className="py-3 px-4 text-sm text-center text-gray-800">
                                {subjectTotal}
                              </td>
                              <td className="py-3 px-4 text-sm text-center font-medium text-gray-800">
                                {result.marks_obtained}
                              </td>
                              <td className="py-3 px-4 text-sm text-center text-gray-800">
                                {subjectPercentage}%
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  result.grade === 'A+' || result.grade === 'A'
                                    ? 'bg-green-100 text-green-800'
                                    : result.grade === 'B' || result.grade === 'A-'
                                    ? 'bg-blue-100 text-blue-800'
                                    : result.grade === 'C' || result.grade === 'D'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {result.grade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {results[0]?.remarks && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Remarks:</strong> {results[0].remarks}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyResults;

