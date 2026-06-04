import { useEffect, useMemo, useState } from 'react';
import './Sidebar.css';
import logo from '../assets/ministry-logo.png';
import API from '../services/api';

/* ============================================================
   SIDEBAR COMPONENT
   Controls FTMS navigation based on logged-in user role.
============================================================ */

function Sidebar({ setActivePage }) {
  /* ============================================================
     LOGGED-IN USER
  ============================================================ */

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const role = user?.role || '';
  const userEmail = user?.email || '';
  const userId = user?.id || '';

  /* ============================================================
     ROLE FLAGS
  ============================================================ */

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isProtocol = role === 'protocol';
  const isTraveler = role === 'traveler';
  const isMinister = role === 'minister';

  /* ============================================================
     LOCAL STATES
  ============================================================ */

  const [activeMenu, setActiveMenu] = useState(
    isTraveler ? 'submitted-requests' : 'dashboard'
  );

  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [submittedRequestCount, setSubmittedRequestCount] = useState(0);

  const [openSections, setOpenSections] = useState({
    main: true,
    admin: true,
    account: true,
  });

  /* ============================================================
     REPORT ACCESS ROLES
     Travelers do not see Reports.
  ============================================================ */

  const allowedReportRoles = useMemo(
    () => [
      'admin',
      'super_admin',
      // 'protocol',
      // 'state_minister',
      // 'chief_executive_officer',
      'office_head',
      'minister',
    ],
    []
  );

  /* ============================================================
     SIDEBAR COUNTS
     - Pending Users count is visible only to Admin/Super Admin.
     - Submitted Requests count shows active pending/amended requests.
     - Counts refresh every 30 seconds.
  ============================================================ */

  useEffect(() => {
    const fetchSidebarCounts = async () => {
      if (!role) return;

      try {
        if (isAdmin) {
          const pendingUsersResponse = await API.get('/users/pending');
          setPendingUserCount(pendingUsersResponse.data?.length || 0);
        } else {
          setPendingUserCount(0);
        }

        const requestsResponse = await API.get(
          `/requests?role=${role}&email=${userEmail}&id=${userId}`
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

    fetchSidebarCounts();

    const interval = setInterval(fetchSidebarCounts, 30000);

    return () => clearInterval(interval);
  }, [role, userEmail, userId, isAdmin, isTraveler]);

  /* ============================================================
     NAVIGATION HANDLERS
  ============================================================ */

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

  /* ============================================================
     MAIN MENU ITEMS
  ============================================================ */

  const menuItems = useMemo(
    () => [
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
        badge:
          submittedRequestCount > 0
            ? submittedRequestCount
            : null,
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
        show: allowedReportRoles.includes(role),
      },
    ],
    [
      isTraveler,
      isMinister,
      submittedRequestCount,
      role,
      allowedReportRoles,
    ]
  );

  /* ============================================================
     ADMINISTRATION MENU ITEMS
     Only Admin/Super Admin see Pending Users, User Management,
     and Settings. Protocol can also see Audit Trail.
  ============================================================ */

  const adminItems = useMemo(
    () => [
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
    ],
    [pendingUserCount, isAdmin, isProtocol]
  );

  /* ============================================================
     ACCOUNT MENU ITEMS
  ============================================================ */

  const accountItems = useMemo(
    () => [
      {
        id: 'reset-password',
        label: 'Reset Password',
        icon: '🔐',
        show: !isMinister,
      },
    ],
    [isMinister]
  );

  /* ============================================================
     RENDER SINGLE MENU BUTTON
  ============================================================ */

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

        <span className="sidebar-menu-icon">{item.icon}</span>

        <span className="sidebar-menu-label">{item.label}</span>

        {item.badge && (
          <span className="sidebar-menu-badge">
            {item.badge}
          </span>
        )}

        <span className="sidebar-arrow">›</span>
      </button>
    );
  };

  /* ============================================================
     RENDER COLLAPSIBLE MENU SECTION
  ============================================================ */

  const renderSection = (sectionKey, title, items) => {
    const visibleItems = items.filter((item) => item.show);

    if (visibleItems.length === 0) return null;

    return (
      <div className="sidebar-section" key={sectionKey}>
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

  /* ============================================================
     COMPONENT UI
  ============================================================ */

  return (
    <aside className="sidebar">
      <div className="sidebar-glow"></div>

      {/* Sidebar Header */}
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

      {/* Logged-in User Card */}
      <div className="sidebar-user-card">
        <div className="sidebar-user-avatar">
          {(user?.fullName || userEmail || 'U')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="sidebar-user-info">
          <h4>{user?.fullName || 'FTMS User'}</h4>
          <p>{role ? role.replaceAll('_', ' ') : 'User'}</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        {renderSection('main', 'Main Menu', menuItems)}
        {renderSection('admin', 'Administration', adminItems)}
        {renderSection('account', 'Account', accountItems)}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <p>Ministry of Agriculture</p>
        <small>FTMS v1.0</small>
      </div>
    </aside>
  );
}

export default Sidebar;