import { useState, useCallback } from 'react';
import { api } from './services/api';
import { LandingPage } from './pages/Landing';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import './styles.css';

type View = 'landing' | 'login' | 'dashboard';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command View', icon: '⊞' },
  { id: 'incidents', label: 'Incidents', icon: '⚠' },
  { id: 'units', label: 'Units & Resources', icon: '◈' },
  { id: 'analytics', label: 'Analytics', icon: '▦' },
  { id: 'ai', label: 'AI Assistant', icon: '◆' },
];

export default function App() {
  const [authenticated, setAuthenticated] = useState(api.isAuthenticated());
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<View>(api.isAuthenticated() ? 'dashboard' : 'landing');
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogin = useCallback(async (username: string, password: string) => {
    const data = await api.login(username, password);
    setUser(data.user);
    setAuthenticated(true);
    setView('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setAuthenticated(false);
    setUser(null);
    setView('landing');
  }, []);

  const handleNavClick = (id: string) => {
    setCurrentPage(id);
    setSidebarOpen(false);
  };

  if (view === 'landing' && !authenticated) {
    return <LandingPage onNavigateToLogin={() => setView('login')} />;
  }

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} onBack={() => setView('landing')} />;
  }

  return (
    <div className="app">
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
        <span className="mobile-topbar-title">FRA</span>
        <span className="mobile-topbar-page">{NAV_ITEMS.find(n => n.id === currentPage)?.label}</span>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>FRA</h1>
          <p>First Responder Analytics</p>
        </div>
        <ul className="nav-links">
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <li key={id}>
              <button
                className={`nav-btn ${currentPage === id ? 'active' : ''}`}
                onClick={() => handleNavClick(id)}
              >
                <span className="nav-icon">{icon}</span>
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.username || 'User'}</span>
            <span className="role-badge">{user?.role || 'analyst'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>
      <main className="main-content">
        <Dashboard page={currentPage} />
      </main>
    </div>
  );
}
