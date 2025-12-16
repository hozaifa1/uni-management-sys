import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Users,
  GraduationCap,
  DollarSign,
  Receipt,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  LogOut,
  Sparkles
} from 'lucide-react';

const LandingPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.role || user?.user?.role || 'STUDENT';

  const moduleConfigs = {
    ADMIN: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        description: 'Overview of system statistics and quick insights',
        gradient: 'from-blue-500 to-blue-600',
        iconBg: 'bg-blue-400'
      },
      {
        name: 'Students',
        href: '/students',
        icon: Users,
        description: 'Manage student records and profiles',
        gradient: 'from-emerald-500 to-emerald-600',
        iconBg: 'bg-emerald-400'
      },
      {
        name: 'Teachers',
        href: '/teachers',
        icon: GraduationCap,
        description: 'Manage teacher information and assignments',
        gradient: 'from-violet-500 to-violet-600',
        iconBg: 'bg-violet-400'
      },
      {
        name: 'Attendance',
        href: '/attendance',
        icon: ClipboardCheck,
        description: 'Track and manage daily attendance',
        gradient: 'from-purple-500 to-purple-600',
        iconBg: 'bg-purple-400'
      },
      {
        name: 'Payments',
        href: '/payments',
        icon: DollarSign,
        description: 'Process and track fee payments',
        gradient: 'from-green-500 to-green-600',
        iconBg: 'bg-green-400'
      },
      {
        name: 'Expenses',
        href: '/expenses',
        icon: Receipt,
        description: 'Manage institutional expenses',
        gradient: 'from-orange-500 to-orange-600',
        iconBg: 'bg-orange-400'
      },
      {
        name: 'Results',
        href: '/results',
        icon: BookOpen,
        description: 'Manage exam results and grades',
        gradient: 'from-rose-500 to-rose-600',
        iconBg: 'bg-rose-400'
      },
      {
        name: 'Reports',
        href: '/reports',
        icon: BarChart3,
        description: 'Generate and view reports',
        gradient: 'from-cyan-500 to-cyan-600',
        iconBg: 'bg-cyan-400'
      }
    ],
    TEACHER: [
      {
        name: 'Dashboard',
        href: '/teacher/dashboard',
        icon: Home,
        description: 'Your teaching overview and schedule',
        gradient: 'from-blue-500 to-blue-600',
        iconBg: 'bg-blue-400'
      },
      {
        name: 'Students',
        href: '/students',
        icon: Users,
        description: 'View and manage your students',
        gradient: 'from-emerald-500 to-emerald-600',
        iconBg: 'bg-emerald-400'
      },
      {
        name: 'Attendance',
        href: '/attendance',
        icon: ClipboardCheck,
        description: 'Take and manage class attendance',
        gradient: 'from-purple-500 to-purple-600',
        iconBg: 'bg-purple-400'
      },
      {
        name: 'Results',
        href: '/results',
        icon: BookOpen,
        description: 'Enter and manage exam results',
        gradient: 'from-rose-500 to-rose-600',
        iconBg: 'bg-rose-400'
      }
    ],
    STUDENT: [
      {
        name: 'Dashboard',
        href: '/student/dashboard',
        icon: Home,
        description: 'Your academic overview',
        gradient: 'from-blue-500 to-blue-600',
        iconBg: 'bg-blue-400'
      },
      {
        name: 'My Results',
        href: '/student/results',
        icon: BookOpen,
        description: 'View your exam results and grades',
        gradient: 'from-rose-500 to-rose-600',
        iconBg: 'bg-rose-400'
      },
      {
        name: 'My Payments',
        href: '/student/payments',
        icon: DollarSign,
        description: 'View payment history and dues',
        gradient: 'from-green-500 to-green-600',
        iconBg: 'bg-green-400'
      },
      {
        name: 'My Attendance',
        href: '/student/attendance',
        icon: ClipboardCheck,
        description: 'Track your attendance records',
        gradient: 'from-purple-500 to-purple-600',
        iconBg: 'bg-purple-400'
      }
    ]
  };

  const modules = moduleConfigs[userRole] || moduleConfigs.STUDENT;

  const handleModuleClick = (href) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative px-6 py-16 sm:px-12 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <GraduationCap className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">IGMIS LMS</h1>
                    <p className="text-blue-100">Learning Management System</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Sparkles className="w-5 h-5" />
                  <span>Welcome back, <strong>{user?.first_name || user?.username || 'User'}</strong>!</span>
                </div>
                <p className="mt-2 text-blue-100 max-w-md">
                  Access all your modules and features from the cards below. 
                  {userRole === 'ADMIN' && ' Manage your institution efficiently.'}
                  {userRole === 'TEACHER' && ' Track your classes and student progress.'}
                  {userRole === 'STUDENT' && ' Stay on top of your academics.'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="text-sm text-blue-100">Logged in as</p>
                  <p className="font-semibold text-white capitalize">{userRole.toLowerCase()}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl transition-all border border-white/20"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="rgb(248 250 252)"/>
          </svg>
        </div>
      </div>

      {/* Module Cards Section */}
      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12 lg:px-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Quick Access</h2>
          <p className="text-gray-600">Select a module to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modules.map((module, index) => (
            <div
              key={module.name}
              onClick={() => handleModuleClick(module.href)}
              className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-transparent transform hover:-translate-y-1"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              
              {/* Content */}
              <div className="relative p-6">
                <div className={`w-14 h-14 ${module.iconBg} group-hover:bg-white/20 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300`}>
                  <module.icon className="w-7 h-7 text-white group-hover:text-white transition-colors duration-300" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">
                  {module.name}
                </h3>
                
                <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors duration-300">
                  {module.description}
                </p>

                {/* Arrow Icon */}
                <div className="mt-4 flex items-center text-gray-400 group-hover:text-white transition-colors duration-300">
                  <span className="text-sm font-medium">Open Module</span>
                  <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} IGMIS LMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
