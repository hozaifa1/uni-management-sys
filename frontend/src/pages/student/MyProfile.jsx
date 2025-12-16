import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Book, Calendar, MapPin, Phone, Mail, IdCard } from 'lucide-react';
import api from '../../services/api';

const MyProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      setLoading(true);
      try {
        const studentResponse = await api.get('/accounts/students/', {
          params: { user: user?.id }
        });
        const students = studentResponse.data.results || studentResponse.data;
        const studentProfile = students.find(s => s.user?.id === user?.id) || students[0];
        setStudentData(studentProfile);
      } catch (error) {
        console.error('Error fetching student profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Profile Not Found</h2>
        <p className="text-gray-600 mt-2">Your student profile could not be loaded.</p>
      </div>
    );
  }

  const courseLine = `${studentData.course || 'N/A'} - ${studentData.intake || 'N/A'} Intake` +
    (studentData.semester ? ` • Sem ${studentData.semester}` : '') +
    (studentData.major_name ? ` • ${studentData.major_name}` : '');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-purple-100">{courseLine}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <IdCard className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Basic</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div><span className="font-medium">Name:</span> {studentData.full_name || `${studentData.user?.first_name || ''} ${studentData.user?.last_name || ''}`.trim() || 'N/A'}</div>
            <div><span className="font-medium">Student ID:</span> {studentData.student_id || 'N/A'}</div>
            <div><span className="font-medium">College ID:</span> {studentData.user?.username || 'N/A'}</div>
            <div><span className="font-medium">Session:</span> {studentData.session || 'N/A'}</div>
            <div><span className="font-medium">Admission Date:</span> {studentData.admission_date ? new Date(studentData.admission_date).toLocaleDateString() : 'N/A'}</div>
            <div><span className="font-medium">Date of Birth:</span> {studentData.date_of_birth ? new Date(studentData.date_of_birth).toLocaleDateString() : 'N/A'}</div>
            <div><span className="font-medium">Blood Group:</span> {studentData.blood_group || 'N/A'}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Book className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Academic</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div><span className="font-medium">Course:</span> {studentData.course || 'N/A'}</div>
            <div><span className="font-medium">Intake:</span> {studentData.intake || 'N/A'}</div>
            <div><span className="font-medium">Semester:</span> {studentData.semester || 'N/A'}</div>
            <div><span className="font-medium">Major:</span> {studentData.major_name || 'N/A'}</div>
            <div><span className="font-medium">Registration No:</span> {studentData.registration_number || 'N/A'}</div>
            <div><span className="font-medium">NU ID:</span> {studentData.national_university_id || 'N/A'}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Contact</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{studentData.user?.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{studentData.user?.phone_number || 'N/A'}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="break-words">{studentData.present_address || studentData.user?.address || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Session: {studentData.session || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
