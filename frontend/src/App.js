import './App.css';
import { useEffect, useState } from 'react';

import Login from './components/Login';
import Register from './components/Register';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ResetPassword from './components/ResetPassword';
import RequestForm from './components/RequestForm';
import RequestTable from './components/RequestTable';
import DashboardStats from './components/DashboardStats';
import Reports from './components/Reports';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import Notifications from './components/Notifications';
import AuditTrail from './components/AuditTrail';
import PendingUsers from './components/PendingUsers';
import TravelStatus from './components/TravelStatus';
import ErrorBoundary from './components/ErrorBoundary';
import './global-polish.css';

const pageTitles = {
  dashboard: 'Dashboard',
  'travel-request': 'New Travel Request',
  'submitted-requests': 'Submitted Requests',
  'travel-status': 'Travel Status',
  reports: 'Reports',
  'audit-trail': 'Audit Trail',
  settings: 'Organization Settings',
  'user-management': 'User Management',
  'pending-users': 'Pending Users',
  notifications: 'Notifications',
  'reset-password': 'Reset Password',
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (_error) {
    return {};
  }
};

const adminRoles = ['admin', 'super_admin'];
const reportRoles = ['office_head', 'minister'];
const protocolRestrictedPages = ['audit-trail', 'reset-password'];

const getInitialPage = () => {
  const storedUser = getStoredUser();

  if (reportRoles.includes(storedUser?.role)) {
    return 'reports';
  }

  if (adminRoles.includes(storedUser?.role)) {
    return 'pending-users';
  }

  if (storedUser?.role === 'traveler') {
    return 'submitted-requests';
  }

  return 'dashboard';
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token'));

  const [activePage, setActivePage] = useState(getInitialPage);
  const [isMobileWorkspace, setIsMobileWorkspace] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [user] = useState(getStoredUser);

  const [activeAuthPage, setActiveAuthPage] = useState('login');
  const isAdminUser = adminRoles.includes(user?.role);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');

    const syncMobileState = () => {
      setIsMobileWorkspace(query.matches);
      if (!query.matches) {
        setMobileWorkspaceOpen(false);
      }
    };

    syncMobileState();
    query.addEventListener('change', syncMobileState);

    return () => query.removeEventListener('change', syncMobileState);
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      'mobile-workspace-locked',
      isMobileWorkspace && mobileWorkspaceOpen
    );

    return () => document.body.classList.remove('mobile-workspace-locked');
  }, [isMobileWorkspace, mobileWorkspaceOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const openPage = (page) => {
    setActivePage(page);

    if (isMobileWorkspace) {
      setMobileWorkspaceOpen(true);
    }
  };

  const renderSafePage = () => (
    <ErrorBoundary resetKey={activePage} onRecover={() => setActivePage('dashboard')}>
      {renderPage()}
    </ErrorBoundary>
  );

  const mobileNavItems = (isAdminUser
    ? [
        {
          id: 'pending-users',
          label: 'Pending',
          icon: 'PU',
          show: true,
        },
        {
          id: 'submitted-requests',
          label: 'Requests',
          icon: 'RQ',
          show: true,
        },
        {
          id: 'user-management',
          label: 'Users',
          icon: 'UM',
          show: true,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: 'OS',
          show: true,
        },
        {
          id: 'audit-trail',
          label: 'Audit',
          icon: 'AT',
          show: true,
        },
        {
          id: 'reset-password',
          label: 'Password',
          icon: 'PW',
          show: true,
        },
      ]
    : [
    {
      id: 'dashboard',
      label: 'Home',
      icon: 'DS',
      show: true,
    },
    {
      id: 'travel-request',
      label: 'New',
      icon: 'NT',
      show: user?.role !== 'minister' && user?.role !== 'pm_office',
    },
    {
      id: 'submitted-requests',
      label: 'Requests',
      icon: 'RQ',
      show: true,
    },
    {
      id: 'travel-status',
      label: 'Status',
      icon: 'ST',
      show: true,
    },
    {
      id: reportRoles.includes(user?.role)
        ? 'reports'
        : 'notifications',
      label: reportRoles.includes(user?.role)
        ? 'Reports'
        : 'Alerts',
      icon: reportRoles.includes(user?.role)
        ? 'RP'
        : 'MS',
      show: true,
    },
  ]).filter((item) => item.show);

  if (!isLoggedIn) {
    if (activeAuthPage === 'register') {
      return (
        <Register setActiveAuthPage={setActiveAuthPage} />
      );
    }

    return (
      <Login
        setIsLoggedIn={setIsLoggedIn}
        setActiveAuthPage={setActiveAuthPage}
      />
    );
  }

  const renderPage = () => {
    if (user?.role === 'protocol' && protocolRestrictedPages.includes(activePage)) {
      return <RequestTable />;
    }

    switch (activePage) {
      case 'dashboard':
        return <DashboardStats setActivePage={openPage} />;

      case 'travel-request':
        return <RequestForm />;

      case 'submitted-requests':
        return <RequestTable />;

      case 'travel-status':
        return <TravelStatus />;

      case 'reports':
        return <Reports />;

      case 'audit-trail':
        return <AuditTrail />;

      case 'settings':
        return <Settings />;

      case 'user-management':
        return <UserManagement />;
        
     case 'pending-users':
  return <PendingUsers />;


      case 'notifications':
        return <Notifications />;

      case 'reset-password':
        return <ResetPassword />;

      default:
        return <DashboardStats setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="layout">
      <Sidebar setActivePage={openPage} />

      <div className={`main-content ${isMobileWorkspace ? 'mobile-main-content' : ''}`}>
        <Topbar handleLogout={handleLogout} />
        {isMobileWorkspace ? (
          <div className="mobile-workspace-home">
            <span>Mobile Workspace</span>
            <h1>FTMS</h1>
            <p>Use the bottom navigation for the main daily actions.</p>

            <div className="mobile-home-actions">
              {mobileNavItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openPage(item.id)}
                >
                  <strong>{item.icon}</strong>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          renderSafePage()
        )}
      </div>

      {isMobileWorkspace && (
        <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
          {mobileNavItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activePage === item.id ? 'active' : ''}
              onClick={() => openPage(item.id)}
            >
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      )}

      {isMobileWorkspace && mobileWorkspaceOpen && (
        <div className="mobile-workspace-overlay" role="dialog" aria-modal="true">
          <div className="mobile-workspace-shell">
            <div className="mobile-workspace-header">
              <div>
                <span>FTMS</span>
                <strong>{pageTitles[activePage] || 'Workspace'}</strong>
              </div>

              <button
                type="button"
                className="mobile-workspace-close"
                onClick={() => setMobileWorkspaceOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mobile-workspace-body">
              {renderSafePage()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
