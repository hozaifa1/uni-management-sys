import { X, User } from 'lucide-react';

const StudentDetailModal = ({ student, onClose }) => {
  if (!student) return null;

  const fullName = student.user?.first_name && student.user?.last_name
    ? `${student.user.first_name} ${student.user.last_name}`
    : student.user?.username || 'N/A';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Student Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-semibold">
              {student.photo ? (
                <img
                  src={student.photo}
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{fullName?.[0] || 'S'}</span>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{fullName}</p>
              <p className="text-sm text-gray-600">{student.user?.email}</p>
              <p className="text-sm text-gray-600 mt-1">Phone: {student.user?.phone_number || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Academic</p>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Student ID:</span> {student.student_id}</p>
                <p><span className="font-medium">Batch:</span> {student.batch_name || 'N/A'}</p>
                <p><span className="font-medium">Course Code:</span> {student.course_code || 'N/A'}</p>
                <p><span className="font-medium">Session:</span> {student.session || 'N/A'}</p>
                <p><span className="font-medium">Semester:</span> {student.semester || 'N/A'}</p>
                <p><span className="font-medium">Admission Date:</span> {student.admission_date}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Personal & Guardian</p>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Date of Birth:</span> {student.date_of_birth}</p>
                <p><span className="font-medium">Blood Group:</span> {student.blood_group || 'N/A'}</p>
                <p><span className="font-medium">Guardian:</span> {student.guardian_name}</p>
                <p><span className="font-medium">Guardian Phone:</span> {student.guardian_phone}</p>
                <p><span className="font-medium">Guardian Income:</span> {student.guardian_yearly_income || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Present Address</p>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">House:</span> {student.present_house_no || 'N/A'}</p>
                <p><span className="font-medium">Road/Village:</span> {student.present_road_vill || 'N/A'}</p>
                <p><span className="font-medium">Police Station:</span> {student.present_police_station || 'N/A'}</p>
                <p><span className="font-medium">Post Office:</span> {student.present_post_office || 'N/A'}</p>
                <p><span className="font-medium">District:</span> {student.present_district || 'N/A'}</p>
                <p><span className="font-medium">Division:</span> {student.present_division || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Permanent Address</p>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">House:</span> {student.permanent_house_no || 'N/A'}</p>
                <p><span className="font-medium">Road/Village:</span> {student.permanent_road_vill || 'N/A'}</p>
                <p><span className="font-medium">Police Station:</span> {student.permanent_police_station || 'N/A'}</p>
                <p><span className="font-medium">Post Office:</span> {student.permanent_post_office || 'N/A'}</p>
                <p><span className="font-medium">District:</span> {student.permanent_district || 'N/A'}</p>
                <p><span className="font-medium">Division:</span> {student.permanent_division || 'N/A'}</p>
              </div>
            </div>
          </div>

          {student.other_info && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Other Information</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.other_info}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal;
