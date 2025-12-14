import { useState, useEffect } from 'react';
import { Download, Eye, FileText, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ReportCardViewer = () => {
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchExams();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/accounts/students/');
      setStudents(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    }
  };

  const fetchExams = async () => {
    try {
      const response = await api.get('/academics/exams/');
      setExams(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError('Failed to load exams');
    }
  };

  const handlePreview = () => {
    if (!selectedStudent || !selectedExam) {
      setError('Please select both student and exam');
      return;
    }

    const url = `${import.meta.env.VITE_API_URL}/academics/results/generate_report_card/?student_id=${selectedStudent}&exam_id=${selectedExam}`;
    window.open(url, '_blank');
  };

  const handleDownload = async () => {
    if (!selectedStudent || !selectedExam) {
      setError('Please select both student and exam');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(
        `/academics/results/generate_report_card/?student_id=${selectedStudent}&exam_id=${selectedExam}`,
        {
          responseType: 'blob'
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_card_${selectedStudent}_${selectedExam}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Report card downloaded successfully!');
    } catch (error) {
      console.error('Error downloading report card:', error);
      const errorMsg = 'Failed to download report card. Please ensure the student has results for this exam.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedStudent || !selectedExam) {
      setError('Please select both student and exam');
      return;
    }

    const url = `${import.meta.env.VITE_API_URL}/academics/results/generate_report_card/?student_id=${selectedStudent}&exam_id=${selectedExam}`;
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <FileText className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Report Card Viewer</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Student
          </label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a student...</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.student_id} - {student.user?.first_name} {student.user?.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Exam Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Exam
          </label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose an exam...</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} - {new Date(exam.exam_date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handlePreview}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Eye className="w-5 h-5 mr-2" />
          Preview
        </button>

        <button
          onClick={handleDownload}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5 mr-2" />
          {loading ? 'Downloading...' : 'Download'}
        </button>

        <button
          onClick={handlePrint}
          disabled={!selectedStudent || !selectedExam || loading}
          className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Select a student and an exam to view, download, or print their report card.
          The report card will include all subject-wise marks, grades, and overall performance for the selected exam.
        </p>
      </div>
    </div>
  );
};

export default ReportCardViewer;

