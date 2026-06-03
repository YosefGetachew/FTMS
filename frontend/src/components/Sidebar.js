import { useEffect, useState } from 'react';
import './Sidebar.css';
import logo from '../assets/ministry-logo.png';
import API from '../services/api';

function Sidebar({ setActivePage }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [submittedRequestCount, setSubmittedRequestCount] = useState(0);

  const [openSections, setOpenSections] = useState({
    main: true,
    admin: true,
    account: true,
  });

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isProtocol = role === 'protocol';
  const isTraveler = role === 'traveler';
  const isMinister = role === 'minister';

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        if (isAdmin) {
          const pendingUsersResponse = await API.get('/users/pending');
          setPendingUserCount(pendingUsersResponse.data?.length || 0);
        }

        const requestsResponse = await API.get(
          `/requests?role=${user.role}&email=${user.email}&id=${user.id}`
        );

        const requests = requestsResponse.data || [];

        const activeSubmittedRequests = requests.filter((request) => {
          const isPending =
            request.final_status === 'pending' &&
            request.current_stage !== 'completed';

          const isAmendedForTraveler =
            isTraveler && request.final_status === 'amended';

          return isPending || isAmendedForTraveler;
        });

        setSubmittedRequestCount(activeSubmittedRequests.length);
      } catch (error) {
        console.error('Failed to fetch sidebar counts:', error);
        setPendingUserCount(0);
        setSubmittedRequestCount(0);
      }
    };

    fetchCounts();

    const interval = setInterval(fetchCounts, 30000);

    return () => clearInterval(interval);
  }, [isAdmin, isTraveler, user.role, user.email, user.id]);

  const goToPage = (page) => {
    setActiveMenu(page);
    setActivePage(page);
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      show: !isTraveler,
    },
    {
      id: 'travel-request',
      label: 'Travel Request',
      icon: '✈️',
      show: !isMinister,
    },
    {
      id: 'submitted-requests',
      label: 'Submitted Requests',
      icon: '📄',
      badge: submittedRequestCount > 0 ? submittedRequestCount : null,
      show: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      show: !isMinister,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📈',
      show: !isTraveler,
    },
  ];

  const adminItems = [
    {
      id: 'pending-users',
      label: 'Pending Users',
      icon: '🕒',
      badge: pendingUserCount > 0 ? pendingUserCount : null,
      show: isAdmin,
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: '👥',
      show: isAdmin,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      show: isAdmin,
    },
    {
      id: 'audit-trail',
      label: 'Audit Trail',
      icon: '🧾',
      show: isAdmin || isProtocol,
    },
  ];

  const accountItems = [
    {
      id: 'reset-password',
      label: 'Reset Password',
      icon: '🔐',
      show: !isMinister,
    },
  ];

  const renderMenuButton = (item) => {
    if (!item.show) return null;

    return (
      <button
        key={item.id}
        type="button"
        className={`sidebar-menu-btn ${
          activeMenu === item.id ? 'active' : ''
        }`}
        onClick={() => goToPage(item.id)}
      >
        <span className="sidebar-active-line"></span>

        <span className="sidebar-menu-icon">
          {item.icon}
        </span>

        <span className="sidebar-menu-label">
          {item.label}
        </span>

        {item.badge && (
          <span className="sidebar-menu-badge">
            {item.badge}
          </span>
        )}

        <span className="sidebar-arrow">›</span>
      </button>
    );
  };

  const renderSection = (sectionKey, title, items) => {
    const visibleItems = items.filter((item) => item.show);

    if (visibleItems.length === 0) return null;

    return (
      <div className="sidebar-section">
        <button
          type="button"
          className="sidebar-section-toggle"
          onClick={() => toggleSection(sectionKey)}
        >
          <span>{title}</span>

          <span
            className={`section-chevron ${
              openSections[sectionKey] ? 'open' : ''
            }`}
          >
            ▾
          </span>
        </button>

        <div
          className={`sidebar-section-content ${
            openSections[sectionKey] ? 'open' : 'closed'
          }`}
        >
          {visibleItems.map(renderMenuButton)}
        </div>
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-glow"></div>

      <div className="sidebar-header">
        <div className="sidebar-logo-box">
          <img
            src={logo}
            alt="Ministry Logo"
            className="sidebar-logo"
          />
        </div>

        <div className="sidebar-title-group">
          <h2>MOA</h2>
          <p>Foreign Travel Management System</p>
        </div>
      </div>

      <div className="sidebar-user-card">
        <div className="sidebar-user-avatar">
          {(user?.fullName || user?.email || 'U')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="sidebar-user-info">
          <h4>{user?.fullName || 'FTMS User'}</h4>
          <p>{role ? role.replaceAll('_', ' ') : 'User'}</p>
        </div>
      </div>

      <nav className="sidebar-menu">
        {renderSection('main', 'Main Menu', menuItems)}
        {renderSection('admin', 'Administration', adminItems)}
        {renderSection('account', 'Account', accountItems)}
      </nav>

      <div className="sidebar-footer">
        <p>Ministry of Agriculture</p>
        <small>FTMS v1.0</small>
      </div>
    </aside>
  );
}

export default Sidebar;