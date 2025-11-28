import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Users,
  GraduationCap,
  DollarSign,
  Receipt,
  BookOpen,
  BarChart3,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const userRole = user?.role || user?.user?.role || 'STUDENT';

  // Debug: Log user object to see what we're getting
  console.log('Sidebar - User object:', user);
  console.log('Sidebar - Detected role:', userRole);

  const navigation = {
    ADMIN: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Students', href: '/students', icon: Users },
      { name: 'Teachers', href: '/teachers', icon: GraduationCap },
      { name: 'Payments', href: '/payments', icon: DollarSign },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
      { name: 'Results', href: '/results', icon: BookOpen },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
    ],
    TEACHER: [
      { name: 'Dashboard', href: '/teacher/dashboard', icon: Home },
      { name: 'Students', href: '/students', icon: Users },
      { name: 'Results', href: '/results', icon: BookOpen },
    ],
    STUDENT: [
      { name: 'Dashboard', href: '/student/dashboard', icon: Home },
      { name: 'My Results', href: '/student/results', icon: BookOpen },
      { name: 'My Payments', href: '/student/payments', icon: DollarSign },
    ],
  };

  const navItems = navigation[userRole] || navigation.STUDENT;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-950/50">
            <GraduationCap className="w-8 h-8 mr-2" />
            <span className="text-xl font-bold">IGMIS LMS</span>
          </div>

          {/* User Info */}
          <div className="px-4 py-6 bg-blue-950/30 border-b border-blue-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg">
                {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.username || 'User'}
                </p>
                <p className="text-xs text-blue-300 capitalize">{userRole.toLowerCase()}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-blue-900 shadow-lg'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-blue-700">
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-blue-100 rounded-lg hover:bg-red-600 hover:text-white transition-all"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;

