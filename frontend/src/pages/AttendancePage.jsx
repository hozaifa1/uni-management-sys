import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  Users, 
  Search,
  Check,
  X,
  Save,
  History,
  ChevronRight,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

const AttendancePage = () => {
  const [activeTab, setActiveTab] = useState('log');
  
  // Log Attendance State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [courses, setCourses] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [roster, setRoster] = useState([]);
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  
  // History State
  const [historySessions, setHistorySessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [editingSession, setEditingSession] = useState(false);
  const [editDate, setEditDate] = useState('');
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch history when tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/academics/attendance/hierarchy/');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      showToast('Failed to load courses', 'error');
    }
  };

  const handleCourseChange = async (course) => {
    setSelectedCourse(course);
    setSelectedIntake('');
    setSelectedSemester('');
    setSelectedSubject('');
    setIntakes([]);
    setSemesters([]);
    setSubjects([]);
    setRoster([]);

    if (course) {
      try {
        const response = await api.get(`/academics/attendance/hierarchy/?course=${course}`);
        setIntakes(response.data.intakes || []);
      } catch (error) {
        console.error('Error fetching intakes:', error);
      }
    }
  };

  const handleIntakeChange = async (intake) => {
    setSelectedIntake(intake);
    setSelectedSemester('');
    setSelectedSubject('');
    setSemesters([]);
    setSubjects([]);
    setRoster([]);

    if (intake) {
      try {
        const response = await api.get(`/academics/attendance/hierarchy/?course=${selectedCourse}&intake=${intake}`);
        setSemesters(response.data.semesters || []);
      } catch (error) {
        console.error('Error fetching semesters:', error);
      }
    }
  };

  const handleSemesterChange = async (semester) => {
    setSelectedSemester(semester);
    setSelectedSubject('');
    setSubjects([]);
    setRoster([]);

    if (semester) {
      try {
        const response = await api.get(`/academics/attendance/hierarchy/?course=${selectedCourse}&intake=${selectedIntake}&semester=${semester}`);
        setSubjects(response.data.subjects || []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    }
  };

  const loadRoster = async () => {
    if (!selectedCourse || !selectedIntake || !selectedSemester || !selectedSubject) {
      showToast('Please select all filters', 'error');
      return;
    }

    setLoadingRoster(true);
    try {
      const response = await api.get('/academics/attendance/roster/', {
        params: {
          course: selectedCourse,
          intake: selectedIntake,
          semester: selectedSemester,
          subject: selectedSubject,
          date: selectedDate
        }
      });
      setRoster(response.data.roster || []);
      setHasExistingAttendance(response.data.has_existing_attendance);
      
      if (response.data.has_existing_attendance) {
        showToast('Attendance already exists for this date. You can edit it.', 'info');
      }
    } catch (error) {
      console.error('Error loading roster:', error);
      showToast('Failed to load student roster', 'error');
    } finally {
      setLoadingRoster(false);
    }
  };

  const toggleStudentStatus = (studentId) => {
    setRoster(roster.map(student => 
      student.id === studentId 
        ? { ...student, status: student.status === 'present' ? 'absent' : 'present' }
        : student
    ));
  };

  const markAllPresent = () => {
    setRoster(roster.map(student => ({ ...student, status: 'present' })));
  };

  const markAllAbsent = () => {
    setRoster(roster.map(student => ({ ...student, status: 'absent' })));
  };

  const saveAttendance = async () => {
    if (roster.length === 0) {
      showToast('No students to save attendance for', 'error');
      return;
    }

    setSavingAttendance(true);
    try {
      const attendanceData = roster.map(student => ({
        student_id: student.id,
        status: student.status
      }));

      await api.post('/academics/attendance/bulk_submit/', {
        course: selectedCourse,
        intake: selectedIntake,
        semester: selectedSemester,
        subject_id: parseInt(selectedSubject),
        date: selectedDate,
        attendance: attendanceData
      });

      showToast('Attendance saved successfully!', 'success');
      setHasExistingAttendance(true);
    } catch (error) {
      console.error('Error saving attendance:', error);
      showToast('Failed to save attendance', 'error');
    } finally {
      setSavingAttendance(false);
    }
  };

  // History Functions
  const fetchHistory = async (limit = 10) => {
    setLoadingHistory(true);
    try {
      const response = await api.get('/academics/attendance/history/', {
        params: { limit }
      });
      setHistorySessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast('Failed to load attendance history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const viewSessionDetails = async (session) => {
    setSelectedSession(session);
    try {
      const response = await api.get('/academics/attendance/session_details/', {
        params: {
          course: session.course,
          intake: session.intake,
          semester: session.semester,
          subject: session.subject_id,
          date: session.date
        }
      });
      setSessionDetails(response.data);
      setEditDate(session.date);
    } catch (error) {
      console.error('Error fetching session details:', error);
      showToast('Failed to load session details', 'error');
    }
  };

  const updateAttendanceStatus = async (attendanceId, newStatus) => {
    try {
      await api.patch(`/academics/attendance/${attendanceId}/update_status/`, {
        status: newStatus
      });
      
      // Update local state
      setSessionDetails(prev => ({
        ...prev,
        records: prev.records.map(r => 
          r.id === attendanceId ? { ...r, status: newStatus } : r
        ),
        present_count: prev.records.filter(r => 
          r.id === attendanceId ? newStatus === 'present' : r.status === 'present'
        ).length,
        absent_count: prev.records.filter(r => 
          r.id === attendanceId ? newStatus === 'absent' : r.status === 'absent'
        ).length
      }));
      
      showToast('Status updated successfully', 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const updateSessionDate = async () => {
    if (!editDate || editDate === selectedSession.date) {
      setEditingSession(false);
      return;
    }

    try {
      await api.patch('/academics/attendance/update_session_date/', {
        course: selectedSession.course,
        intake: selectedSession.intake,
        semester: selectedSession.semester,
        subject_id: selectedSession.subject_id,
        old_date: selectedSession.date,
        new_date: editDate
      });

      showToast('Date updated successfully', 'success');
      setEditingSession(false);
      fetchHistory();
      setSelectedSession(prev => ({ ...prev, date: editDate }));
      setSessionDetails(prev => ({ ...prev, date: editDate }));
    } catch (error) {
      console.error('Error updating date:', error);
      showToast(error.response?.data?.error || 'Failed to update date', 'error');
    }
  };

  const deleteSession = async () => {
    if (!window.confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete('/academics/attendance/delete_session/', {
        params: {
          course: selectedSession.course,
          intake: selectedSession.intake,
          semester: selectedSession.semester,
          subject: selectedSession.subject_id,
          date: selectedSession.date
        }
      });

      showToast('Attendance record deleted successfully', 'success');
      setSelectedSession(null);
      setSessionDetails(null);
      fetchHistory();
    } catch (error) {
      console.error('Error deleting session:', error);
      showToast('Failed to delete attendance record', 'error');
    }
  };

  const presentCount = roster.filter(s => s.status === 'present').length;
  const absentCount = roster.filter(s => s.status === 'absent').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
           <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-xl">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Attendance Management</h1>
            <p className="text-purple-100">Track and manage student attendance</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('log')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'log'
                ? 'text-purple-600 bg-purple-50 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Log Attendance
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'text-purple-600 bg-purple-50 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History className="w-5 h-5" />
              Attendance History
            </div>
          </button>
        </div>

        {/* Log Attendance Tab */}
        {activeTab === 'log' && (
          <div className="p-6 space-y-6">
            {/* Control Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intake</label>
                <select
                  value={selectedIntake}
                  onChange={(e) => handleIntakeChange(e.target.value)}
                  disabled={!selectedCourse}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Intake</option>
                  {intakes.map(intake => (
                    <option key={intake} value={intake}>{intake} Intake</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  disabled={!selectedIntake}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Semester</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>{sem} Semester</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedSemester}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadRoster}
                  disabled={loadingRoster || !selectedSubject}
                  className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingRoster ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Load Class
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Existing Attendance Warning */}
            {hasExistingAttendance && roster.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-amber-800 text-sm">
                  Attendance already exists for this date. Changes will update the existing records.
                </p>
              </div>
            )}

            {/* Student List */}
            {roster.length > 0 && (
              <div className="space-y-4">
                {/* Summary & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-500" />
                      <span className="text-sm text-gray-600">Total: <strong>{roster.length}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Present: <strong className="text-green-600">{presentCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Absent: <strong className="text-red-600">{absentCount}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllPresent}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                    >
                      Mark All Present
                    </button>
                    <button
                      onClick={markAllAbsent}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                    >
                      Mark All Absent
                    </button>
                  </div>
                </div>

                {/* Student Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {roster.map(student => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudentStatus(student.id)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                        student.status === 'present'
                          ? 'border-green-500 bg-green-50 shadow-green-100'
                          : 'border-red-500 bg-red-50 shadow-red-100'
                      } shadow-md`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          student.status === 'present' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {student.status === 'present' ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            <X className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.student_id}</p>
                        </div>
                      </div>
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'present'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {student.status === 'present' ? 'Present' : 'Absent'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={saveAttendance}
                    disabled={savingAttendance}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingAttendance ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {hasExistingAttendance ? 'Update Attendance' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {roster.length === 0 && !loadingRoster && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Loaded</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Select a date, course, intake, semester, and subject, then click "Load Class" to view students.
                </p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            {selectedSession && sessionDetails ? (
              // Session Details View
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setSelectedSession(null); setSessionDetails(null); }}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                    Back to History
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingSession(!editingSession)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Date
                    </button>
                    <button
                      onClick={deleteSession}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Session Info */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Course</p>
                      <p className="font-semibold text-gray-900">{sessionDetails.course}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Intake</p>
                      <p className="font-semibold text-gray-900">{sessionDetails.intake} Intake</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Semester</p>
                      <p className="font-semibold text-gray-900">{sessionDetails.semester} Semester</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Subject</p>
                      <p className="font-semibold text-gray-900">{sessionDetails.subject?.name}</p>
                    </div>
                  </div>
                  
                  {editingSession ? (
                    <div className="mt-4 flex items-center gap-4">
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Change Date</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={updateSessionDate}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSession(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-semibold text-gray-900">{new Date(sessionDetails.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{sessionDetails.total_students}</p>
                    <p className="text-sm text-blue-700">Total Students</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{sessionDetails.present_count}</p>
                    <p className="text-sm text-green-700">Present</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{sessionDetails.absent_count}</p>
                    <p className="text-sm text-red-700">Absent</p>
                  </div>
                </div>

                {/* Student List */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Student Attendance</h3>
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sessionDetails.records.map(record => (
                          <tr key={record.id} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900">{record.student_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{record.student_name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                record.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.status === 'present' ? 'Present' : 'Absent'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => updateAttendanceStatus(record.id, record.status === 'present' ? 'absent' : 'present')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                  record.status === 'present'
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                Mark {record.status === 'present' ? 'Absent' : 'Present'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              // History List View
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Recent Attendance Sessions</h3>
                  <button
                    onClick={() => fetchHistory(50)}
                    className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Load More
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                ) : historySessions.length > 0 ? (
                  <div className="space-y-3">
                    {historySessions.map((session, index) => (
                      <div
                        key={`${session.date}-${session.subject_id}-${index}`}
                        onClick={() => viewSessionDetails(session)}
                        className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 cursor-pointer transition-all border border-gray-200 hover:border-purple-300 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {session.course} - {session.intake} Intake - {session.subject_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                {' • '}{session.semester} Semester
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-green-600 font-medium">{session.present_count} Present</span>
                                <span className="text-sm text-red-600 font-medium">{session.absent_count} Absent</span>
                              </div>
                              <p className="text-xs text-gray-400">Total: {session.total_students}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance History</h3>
                    <p className="text-gray-500">
                      Start logging attendance to see history here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
