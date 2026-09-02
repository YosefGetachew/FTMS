import { useEffect, useMemo, useState } from 'react';
import './Sidebar.css';
import logo from '../assets/ministry-logo.png';
import API from '../services/api';

const formatRole = (value) => {
  if (!value) return 'User';

  const labels = {
    director_general: 'Director General',
    pm_office: 'PM Office',
  };

  if (labels[value]) return labels[value];

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const compactCount = (value) => {
  if (!value) return '0';
  if (value > 99) return '99+';
  return String(value);
};

const isTravelerSubmittedRequestVisible = (request, userEmail) => {
  const sameTraveler =
    String(request.email || '').trim().toLowerCase() ===
    String(userEmail || '').trim().toLowerCase();
  const isOpen =
    request.final_status === 'pending' || request.final_status === 'amended';

  return sameTraveler && isOpen && request.current_stage !== 'completed';
};

const roleGuidance = {
  admin: 'System administration and workflow control',
  super_admin: 'Full system administration and oversight',
  traveler: 'Submit requests and follow your travel status',
  expert: 'Submit requests through your lead executive office',
  lead_executive_officer: 'Review requests from assigned experts',
  lead_executive: 'Review requests from assigned experts',
  state_minister: 'Decide requests from assigned sector offices',
  chief_executive_officer: 'Decide CEO structure requests',
  ceo: 'Decide CEO structure requests',
  director_general: 'Review requests from your affiliate institute',
  office_head: 'Coordinate clearance and final office review',
  protocol: 'Process protocol clearance tasks',
  pm_office: 'Review requests submitted by Protocol to the PM Office',
  minister: 'Final approval authority',
};

function Sidebar({ setActivePage }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const role = user?.role || '';
  const userEmail = user?.email || '';
  const userId = user?.id || '';

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isProtocol = role === 'protocol';
  const isTraveler = role === 'traveler';
  const isMinister = role === 'minister';
  const isPmOffice = role === 'pm_office';
  const formattedRole = formatRole(role);
  const canViewReports = ['office_head', 'minister'].includes(role);

  const [activeMenu, setActiveMenu] = useState(
    isAdmin ? 'pending-users' : canViewReports ? 'reports' : isTraveler ? 'submitted-requests' : 'dashboard'
  );

  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [submittedRequestCount, setSubmittedRequestCount] = useState(0);

  const [openSections, setOpenSections] = useState({
    overview: true,
    travel: true,
    insights: true,
    people: true,
    governance: true,
    account: true,
  });

  const allowedReportRoles = useMemo(
    () => [
      'office_head',
      'minister',
    ],
    []
  );

  const userContext = useMemo(
    () => [
      {
        label: 'Role',
        value: formattedRole,
      },
      {
        label: 'Structure',
        value: user?.sector || 'Not assigned',
      },
      {
        label: 'Lead Executive Office',
        value: user?.department || 'Not assigned',
      },
    ],
    [formattedRole, user?.sector, user?.department]
  );

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
          if (isTraveler) {
            return isTravelerSubmittedRequestVisible(request, userEmail);
          }

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

  const overviewItems = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        description: 'Analytics and approval overview',
        icon: 'DS',
        show: !isTraveler && !isAdmin,
      },
    ],
    [isTraveler, isAdmin]
  );

  const travelItems = useMemo(
    () => [
      {
        id: 'travel-request',
        label: 'New Travel Request',
        description: 'Prepare and submit travel',
        icon: 'NT',
        show: !isMinister && !isPmOffice && !isAdmin,
      },
      {
        id: 'submitted-requests',
        label: isTraveler ? 'Submitted Requests' : 'Requested Travel',
        description: isTraveler
          ? 'Track your submitted and amended requests'
          : isPmOffice
          ? 'Review requests submitted to the PM Office'
          : 'Requested travel that needs your action or decision',
        icon: 'RQ',
        badge: submittedRequestCount > 0 ? submittedRequestCount : null,
        badgeLabel: 'active request',
        countLabel: isTraveler ? 'Needs attention' : 'Needs decision',
        show: true,
      },
      {
        id: 'travel-status',
        label: 'Travel Status',
        description: 'Diagram view of request progress',
        icon: '',
        iconClass: 'workflow-icon',
        show: !isPmOffice && !isAdmin,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'System messages and updates',
        icon: 'MS',
        show: !isMinister && !isPmOffice && !isAdmin,
      },
    ],
    [isMinister, isPmOffice, isTraveler, isAdmin, submittedRequestCount]
  );

  const insightItems = useMemo(
    () => [
      {
        id: 'reports',
        label: 'Reports',
        description: 'Performance and travel analytics',
        icon: 'RP',
        show: allowedReportRoles.includes(role),
      },
    ],
    [
      role,
      allowedReportRoles,
    ]
  );

  const peopleItems = useMemo(
    () => [
      {
        id: 'pending-users',
        label: 'Pending Users',
        description: 'Approve account requests',
        icon: 'PU',
        badge: pendingUserCount > 0 ? pendingUserCount : null,
        badgeLabel: 'waiting user',
        countLabel: 'Awaiting approval',
        show: isAdmin,
      },
      {
        id: 'user-management',
        label: 'User Management',
        description: 'Officers and user accounts',
        icon: 'UM',
        show: isAdmin,
      },
    ],
    [pendingUserCount, isAdmin]
  );

  const governanceItems = useMemo(
    () => [
      {
        id: 'settings',
        label: 'Organization Settings',
        description: 'Structures, offices, approvers',
        icon: 'OS',
        show: isAdmin,
      },
      {
        id: 'audit-trail',
        label: 'Audit Trail',
        description: 'Accountability records',
        icon: 'AT',
        show: isAdmin,
      },
    ],
    [isAdmin]
  );

  const accountItems = useMemo(
    () => [
      {
        id: 'reset-password',
        label: 'Reset Password',
        description: 'Secure account password',
        icon: 'PW',
        show: !isMinister && !isPmOffice && !isProtocol,
      },
    ],
    [isMinister, isPmOffice, isProtocol]
  );

  const allVisibleItems = useMemo(
    () =>
      [
        ...overviewItems,
        ...travelItems,
        ...insightItems,
        ...peopleItems,
        ...governanceItems,
        ...accountItems,
      ].filter((item) => item.show),
    [
      overviewItems,
      travelItems,
      insightItems,
      peopleItems,
      governanceItems,
      accountItems,
    ]
  );

  const activeItem = allVisibleItems.find((item) => item.id === activeMenu);

  const workSummary = useMemo(
    () => [
      {
        label: isTraveler ? 'Open Requests' : 'Active Queue',
        value: compactCount(submittedRequestCount),
        helper: isTraveler ? 'Submitted or amended' : 'Pending or assigned',
        show: !isAdmin,
      },
      {
        label: 'Pending Users',
        value: compactCount(pendingUserCount),
        helper: 'Registration approvals',
        show: isAdmin,
      },
    ].filter((item) => item.show),
    [submittedRequestCount, pendingUserCount, isAdmin, isTraveler]
  );

  const renderMenuButton = (item) => {
    if (!item.show) return null;

    return (
      <button
        key={item.id}
        type="button"
        className={`sidebar-menu-btn ${activeMenu === item.id ? 'active' : ''}`}
        onClick={() => goToPage(item.id)}
        aria-label={`${item.label}. ${item.description || ''}`}
      >
        <span className="sidebar-active-line"></span>

        <span className={`sidebar-menu-icon ${item.iconClass || ''}`}>
          {item.icon}
        </span>

        <span className="sidebar-menu-text">
          <span className="sidebar-menu-label">{item.label}</span>
          {item.description && (
            <span className="sidebar-menu-description">
              {item.description}
            </span>
          )}
        </span>

        {item.badge && (
          <span
            className="sidebar-menu-badge"
            title={`${item.badge} ${item.badgeLabel || 'pending'}`}
          >
            {item.badge}
          </span>
        )}

        <span className="sidebar-arrow" aria-hidden="true">&gt;</span>
      </button>
    );
  };

  const renderSection = (sectionKey, title, subtitle, items) => {
    const visibleItems = items.filter((item) => item.show);

    if (visibleItems.length === 0) return null;

    return (
      <div className="sidebar-section" key={sectionKey}>
        <button
          type="button"
          className="sidebar-section-toggle"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="sidebar-section-title">
            <span>{title}</span>
            <small>{subtitle}</small>
          </span>

          <span className="sidebar-section-count">
            {visibleItems.length}
          </span>

          <span
            className={`section-chevron ${openSections[sectionKey] ? 'open' : ''}`}
            aria-hidden="true"
          >
            v
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
      <div className="sidebar-header">
        <div className="sidebar-logo-box">
          <img
            src={logo}
            alt="Ministry Logo"
            className="sidebar-logo"
          />
        </div>

        <div className="sidebar-title-group">
          <h2>FTMS</h2>
          <p>Foreign Travel Management System</p>
        </div>
      </div>

      <div className="sidebar-user-card">
        <div className="sidebar-user-avatar">
          {(user?.fullName || userEmail || 'U')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="sidebar-user-info">
          <h4>{user?.fullName || 'FTMS User'}</h4>
          <p>{formattedRole}</p>
          {userEmail && <small title={userEmail}>{userEmail}</small>}
        </div>
      </div>

      <div className="sidebar-profile-panel">
        <div className="sidebar-profile-heading">Access Context</div>
        {userContext.map((item) => (
          <div className="sidebar-profile-row" key={item.label}>
            <span>{item.label}</span>
            <strong title={item.value}>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="sidebar-role-note">
        <strong>Your responsibility</strong>
        <span>
          {roleGuidance[role] || 'Use the menu to access your available tasks'}
        </span>
      </div>

      {workSummary.length > 0 && (
        <div className="sidebar-summary-grid">
          {workSummary.map((item) => (
            <div className="sidebar-summary-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.helper}</small>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-current-page">
        <span>Current Workspace</span>
        <strong>{activeItem?.label || 'Dashboard'}</strong>
        <small>{activeItem?.description || 'System overview'}</small>
      </div>

      <nav className="sidebar-menu" aria-label="Main navigation">
        {renderSection('overview', 'Overview', 'Dashboard and operating picture', overviewItems)}
        {renderSection('travel', 'Travel Work', 'Requests, status, and messages', travelItems)}
        {renderSection('insights', 'Analytics', 'Reports and forecasting', insightItems)}
        {renderSection('people', 'People Administration', 'User approvals and access', peopleItems)}
        {renderSection('governance', 'System Governance', 'Organization setup and audit', governanceItems)}
        {renderSection('account', 'Account Security', 'Password and personal access', accountItems)}
      </nav>

      <div className="sidebar-footer">
        <p>Ministry of Agriculture</p>
        <small>Secure travel approval workspace</small>
      </div>
    </aside>
  );
}

export default Sidebar;
