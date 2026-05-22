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
        return <DashboardStats />;

      case 'travel-request':
        return <RequestForm />;

      case 'submitted-requests':
        return <RequestTable />;

      case 'reports':
        return <Reports />;

      case 'settings':
        return <Settings />;

      case 'user-management':
        return <UserManagement />;

      case 'notifications':
        return <Notifications />;

      default:
        return <DashboardStats />;


      case 'reset-password':
        return <ResetPassword />;
    }
  };

  return (
    <div className="layout">

      <Sidebar
        setActivePage={setActivePage}
      />

      <div className="main-content">

        <Topbar
          handleLogout={handleLogout}
        />

        {renderPage()}

      </div>

    </div>
  );
}

export default App;