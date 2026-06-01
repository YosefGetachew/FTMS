import './App.css';
import { useState } from 'react';

import Login from './components/Login';
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

function App() {
  const [isLoggedIn, setIsLoggedIn] =
    useState(localStorage.getItem('token'));

  const [activePage, setActivePage] =
    useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  if (!isLoggedIn) {
    return (
      <Login setIsLoggedIn={setIsLoggedIn} />
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardStats setActivePage={setActivePage} />;

      case 'travel-request':
        return <RequestForm />;

      case 'submitted-requests':
        return <RequestTable />;

      case 'reports':
        return <Reports />;

      case 'audit-trail':
        return <AuditTrail />;  

      case 'settings':
        return <Settings />;

      case 'user-management':
        return <UserManagement />;

      case 'notifications':
        return <Notifications />;

      case 'reset-password':
        return <ResetPassword />;

      default:
        return <DashboardStats />;
    }
  };

  return (
    <div className="layout">
      <Sidebar setActivePage={setActivePage} />

      <div className="main-content">
        <Topbar handleLogout={handleLogout} />
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
