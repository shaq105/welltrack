import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/history', label: 'History', exact: false },
  { to: '/trends', label: 'Trends', exact: false },
  { to: '/settings', label: 'Settings', exact: false },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-sage-50">
      <nav className="border-b border-sage-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-teal-800">WellTrack</span>
            <div className="flex gap-1">
              {navLinks.map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-sage-600 hover:bg-sage-100 hover:text-sage-800'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-sage-600">
                {user.display_name || user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-md border border-sage-300 px-3 py-1.5 text-sm text-sage-700 transition hover:bg-sage-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
