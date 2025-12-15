import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import ResultsPage from './pages/ResultsPage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import StudentDashboard from './pages/student/StudentDashboard';
import MyResults from './pages/student/MyResults';
import MyPayments from './pages/student/MyPayments';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import { useAuth } from './context/AuthContext';

const DefaultRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role || user?.user?.role;

  if (userRole === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (userRole === 'TEACHER') {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AdminRedirect = () => {
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const backendBaseUrl = apiUrl.replace(/\/api\/?$/, '');
    const targetUrl = `${backendBaseUrl}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(targetUrl);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin/*" element={<AdminRedirect />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                <DashboardLayout>
                  <StudentsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Teachers Page</h2>
                    <p className="text-gray-600 mt-2">Coming soon...</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout>
                  <PaymentsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Expenses Page</h2>
                    <p className="text-gray-600 mt-2">Coming soon...</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                <DashboardLayout>
                  <ResultsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                <DashboardLayout>
                  <ReportsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Student Portal Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DashboardLayout>
                  <StudentDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/results"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DashboardLayout>
                  <MyResults />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/payments"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DashboardLayout>
                  <MyPayments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Teacher Portal */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <DashboardLayout>
                  <TeacherDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Legacy student routes - redirect to new paths */}
          <Route path="/my-results" element={<Navigate to="/student/results" replace />} />
          <Route path="/my-payments" element={<Navigate to="/student/payments" replace />} />

          {/* Default redirect */}
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
