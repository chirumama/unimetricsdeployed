import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Settings, 
  LogOut,
  Menu,
  X,
  FileText,
  BarChart3,
  CalendarDays,
  CalendarClock,
  Wallet,
  BellRing,
  ClipboardList,
  MessageSquare,
  FileUp,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearStoredUser, getStoredUser } from '@/lib/auth';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();

  if (!user) {
    return null;
  }

  const getNavItems = (role: string) => {
    switch (role) {
      case 'admin':
        return [
          { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
          { name: 'Academic Year', href: '/admin/academic-year', icon: CalendarDays },
          { name: 'Faculty Management', href: '/admin/faculty-management', icon: GraduationCap },
          { name: 'Timetable & Events', href: '/admin/timetable', icon: CalendarClock },
          { name: 'Faculty Attendance', href: '/admin/faculty-attendance', icon: ClipboardList },
          { name: 'Finance & Salary', href: '/admin/finance', icon: Wallet },
          { name: 'Results & Marks', href: '/admin/results', icon: BarChart3 },
          { name: 'Notices', href: '/admin/notices', icon: BellRing },
          { name: 'System Logs', href: '/admin/logs', icon: FileText },
        ];
      case 'faculty':
        return [
          { name: 'Dashboard', href: '/faculty', icon: LayoutDashboard },
          { name: 'Student Management', href: '/faculty/students', icon: Users },
          { name: 'Attendance', href: '/faculty/attendance', icon: CheckSquare },
          { name: 'Notices', href: '/faculty/notices', icon: BellRing },
          { name: 'Marks & Assignments', href: '/faculty/marks', icon: FileText },
          { name: 'Study Materials', href: '/faculty/materials', icon: FileUp },
          { name: 'Doubts & Feedback', href: '/faculty/doubts', icon: MessageSquare },
          { name: 'My Timetable', href: '/faculty/timetable', icon: CalendarClock },
        ];
      case 'student':
        return [
          { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
          { name: 'My Timetable', href: '/student/timetable', icon: CalendarClock },
          { name: 'My Subjects & Notes', href: '/student/subjects', icon: BookOpen },
          { name: 'Attendance', href: '/student/attendance', icon: CheckSquare },
          { name: 'Doubts & Feedback', href: '/student/doubts', icon: MessageSquare },
          { name: 'Results', href: '/student/results', icon: BarChart3 },
          { name: 'Notifications', href: '/student/notifications', icon: BellRing },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(user.role);

  const handleLogout = () => {
    clearStoredUser();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white transform transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
            <span className="ml-3 text-xl font-bold text-gray-900">UniMetrics</span>
            <button 
              className="ml-auto md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                      isActive 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-indigo-700" : "text-gray-400 group-hover:text-gray-500"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:block">
                Academic Year 2025-2026
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
