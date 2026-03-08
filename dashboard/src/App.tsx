import { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import './styles.css';

export default function App() {
  const [authenticated, setAuthenticated] = useState(api.isAuthenticated());
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  const handleLogin = useCallback(async (username: string, password: string) => {
    const data = await api.login(username, password);
    setUser(data.user);
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setAuthenticated(false);
    setUser(null);
  }, []);

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>FRA</h1>
          <p>First Responder Analytics</p>
        </div>
        <ul className="nav-links">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
            { id: 'incidents', label: 'Incidents', icon: '⚠' },
            { id: 'units', label: 'Units', icon: '🔲' },
            { id: 'analytics', label: 'Analytics', icon: '📊' },
            { id: 'ai', label: 'AI Assistant', icon: '◆' },
          ].map(({ id, label, icon }) => (
            <li key={id}>
              <button
                className={`nav-btn ${currentPage === id ? 'active' : ''}`}
                onClick={() => setCurrentPage(id)}
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
