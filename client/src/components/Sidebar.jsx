import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentLinks = [
  { to: '/student/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/student/courses', label: 'My Courses', icon: '📚' },
  { to: '/student/course-registration', label: 'Register Courses', icon: '📝' },
  { to: '/student/assignments', label: 'Assignments', icon: '📋' },
  { to: '/student/grades', label: 'Grades & Feedback', icon: '⭐' },
  { to: '/student/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/student/profile', label: 'Profile', icon: '👤' },
];

const lecturerLinks = [
  { to: '/lecturer/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/lecturer/courses', label: 'My Courses', icon: '📚' },
  { to: '/lecturer/assignments', label: 'Assignments', icon: '📋' },
  { to: '/lecturer/users', label: 'Users Management', icon: '👥' },
  { to: '/lecturer/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/lecturer/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const links = user?.role === 'student' ? studentLinks : lecturerLinks;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role === 'lecturer' ? 'Admin' : user?.role}</p>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
