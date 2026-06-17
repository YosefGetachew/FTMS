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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token'));

  const [activePage, setActivePage] = useState('dashboard');
  const [isMobileWorkspace, setIsMobileWorkspace] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);

  const [activeAuthPage, setActiveAuthPage] = useState('login');

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
            <h1>FTMS Workspace</h1>
            <p>Select a menu item to open it in a mobile-friendly workspace.</p>
          </div>
        ) : (
          renderPage()
        )}
      </div>

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
              {renderPage()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
