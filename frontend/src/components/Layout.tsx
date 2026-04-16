import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-sage-50">
      <nav className="border-b border-sage-200 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4">
          {/* Top bar */}
          <div className="flex h-14 items-center justify-between">
            <span className="text-lg font-bold text-teal-800">WellTrack</span>

            {/* Desktop nav */}
            <div className="hidden items-center gap-1 sm:flex">
              {navLinks.map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
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

            {/* Desktop user + sign out */}
            <div className="hidden items-center gap-3 sm:flex">
              {user && (
                <span className="text-sm text-sage-600">
                  {user.display_name || user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-md border border-sage-300 px-3 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
              >
                Sign out
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-11 w-11 items-center justify-center rounded-md text-sage-700 transition hover:bg-sage-100 sm:hidden"
            >
              {menuOpen ? (
                /* X icon */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div className="border-t border-sage-100 pb-3 pt-2 sm:hidden">
              {navLinks.map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-sage-700 hover:bg-sage-100 hover:text-sage-800'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="mt-2 border-t border-sage-100 pt-2">
                {user && (
                  <p className="px-3 py-1 text-xs text-sage-500">
                    {user.display_name || user.email}
                  </p>
                )}
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="block w-full rounded-md px-3 py-3 text-left text-sm font-medium text-sage-700 transition hover:bg-sage-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
