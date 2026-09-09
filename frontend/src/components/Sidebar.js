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

const normalizeText = (value) => String(value || '').toLowerCase();

const REMINDER_DECISION_STAGES = [
  'lead_executive_review',
  'project_coordinator_review',
  'state_minister_review',
  'ceo_review',
  'office_head_review',
  'office_head_final',
  'minister_review',
  'pm_office_followup',
  'foreign_affairs_followup',
];

const isSavedDraftRequest = (request) =>
  normalizeText(request?.final_status) === 'pending' &&
  normalizeText(request?.current_stage) === 'expert_preparation' &&
  normalizeText(request?.status).includes('draft');

const stageMatches = (request, stages) => {
  const currentStage = normalizeText(request?.current_stage);
  const status = normalizeText(request?.status);

  return stages.some((stage) => currentStage === stage || status === stage);
};

const isOwnEditableDraft = (request, userEmail) => {
  const sameTraveler =
    String(request.email || '').trim().toLowerCase() ===
    String(userEmail || '').trim().toLowerCase();
  const isOpen =
    request.final_status === 'pending' || request.final_status === 'amended';
  const noApproverAction =
    request.has_workflow_action === false ||
    request.has_workflow_action === 'false' ||
    request.has_workflow_action === 0 ||
    request.has_workflow_action === '0';

  return sameTraveler && isOpen && noApproverAction;
};

const canSendDecisionReminder = (request, role) =>
  role === 'protocol' &&
  !isSavedDraftRequest(request) &&
  normalizeText(request?.final_status) === 'pending' &&
  REMINDER_DECISION_STAGES.includes(normalizeText(request?.current_stage));

const canDecideRequest = (request, role) => {
  if (isSavedDraftRequest(request)) return false;
  if (['admin', 'super_admin'].includes(role)) return true;

  const workflowType = request.workflow_type;

  if (
    ['lead_executive_officer', 'lead_executive'].includes(role) &&
    stageMatches(request, ['lead_executive_review', 'lead_executive'])
  ) {
    return true;
  }

  if (
    role === 'project_coordinator' &&
    request.traveler_category === 'project' &&
    stageMatches(request, ['project_coordinator_review', 'project_coordinator'])
  ) {
    return true;
  }

  if (
    role === 'director_general' &&
    request.traveler_category === 'affiliate_institution' &&
    stageMatches(request, ['office_head_review', 'director_general'])
  ) {
    return true;
  }

  if (
    role === 'state_minister' &&
    workflowType === 'sector_structure' &&
    stageMatches(request, ['state_minister', 'state_minister_review'])
  ) {
    return true;
  }

  if (
    ['chief_executive_officer', 'ceo'].includes(role) &&
    workflowType === 'ceo_structure' &&
    stageMatches(request, ['ceo_review', 'chief_executive_officer', 'ceo'])
  ) {
    return true;
  }

  if (
    role === 'office_head' &&
    stageMatches(request, ['office_head_review', 'office_head', 'office_head_final'])
  ) {
    return true;
  }

  if (
    role === 'protocol' &&
    stageMatches(request, ['protocol_clearance', 'protocol', 'pm_office_submission'])
  ) {
    return true;
  }

  if (
    role === 'pm_office' &&
    stageMatches(request, ['pm_office_followup', 'foreign_affairs_followup'])
  ) {
    return true;
  }

  if (role === 'minister' && stageMatches(request, ['minister_review', 'minister'])) {
    return true;
  }

  return false;
};

const isSubmittedRequestVisible = (request, { role, userEmail, isTraveler }) => {
  const finalStatus = normalizeText(request.final_status);
  const currentStage = normalizeText(request.current_stage);
  const isPending =
    !['approved', 'rejected'].includes(finalStatus) &&
    currentStage !== 'completed';

  const isAmendedForTraveler =
    isTraveler &&
    currentStage === 'expert_preparation' &&
    finalStatus === 'amended';
  const isEditableOwnerDraft = isOwnEditableDraft(request, userEmail);

  if (isAmendedForTraveler || isEditableOwnerDraft) return true;
  if (!isPending) return false;
  if (isTraveler) return true;
  if (canSendDecisionReminder(request, role)) return true;

  return canDecideRequest(request, role);
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
  const canViewReports = isAdmin || ['office_head', 'minister'].includes(role);

  const [activeMenu, setActiveMenu] = useState(
    isAdmin ? 'dashboard' : canViewReports ? 'reports' : isTraveler ? 'submitted-requests' : 'dashboard'
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
      'admin',
      'super_admin',
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

        const activeSubmittedRequests = requests.filter((request) =>
          isSubmittedRequestVisible(request, { role, userEmail, isTraveler })
        );

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
        description: 'Today overview',
        icon: 'DS',
        show: !isTraveler,
      },
    ],
    [isTraveler]
  );

  const travelItems = useMemo(
    () => [
      {
        id: 'travel-request',
        label: 'New Request',
        description: 'Create travel request',
        icon: 'NT',
        show: !isMinister && !isPmOffice,
      },
      {
        id: 'submitted-requests',
        label: isTraveler ? 'My Requests' : 'Active Requested Travel',
        description: isTraveler
          ? 'Submitted, draft, and returned travel'
          : isPmOffice
          ? 'Requests submitted to PM Office'
          : 'Travel that needs a decision',
        icon: 'RQ',
        badge: submittedRequestCount > 0 ? submittedRequestCount : null,
        badgeLabel: 'active request',
        countLabel: isTraveler ? 'Needs attention' : 'Needs decision',
        show: true,
      },
      {
        id: 'travel-status',
        label: 'Travel Status',
        description: 'Follow approval progress',
        icon: '',
        iconClass: 'workflow-icon',
        show: !isPmOffice,
      },
      {
        id: 'notifications',
        label: 'Messages',
        description: 'System updates',
        icon: 'MS',
        show: !isMinister && !isPmOffice,
      },
    ],
    [isMinister, isPmOffice, isTraveler, submittedRequestCount]
  );

  const insightItems = useMemo(
    () => [
      {
        id: 'reports',
        label: 'Reports',
        description: 'Travel analytics',
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
        description: 'Approve new accounts',
        icon: 'PU',
        badge: pendingUserCount > 0 ? pendingUserCount : null,
        badgeLabel: 'waiting user',
        countLabel: 'Awaiting approval',
        show: isAdmin,
      },
      {
        id: 'user-management',
        label: 'Users',
        description: 'Manage accounts',
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
        label: 'Organization Setup',
        description: 'Structures and approvers',
        icon: 'OS',
        show: isAdmin,
      },
      {
        id: 'audit-trail',
        label: 'Audit Trail',
        description: 'Decision history',
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
        description: 'Change your password',
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
        show: true,
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
        <div className="sidebar-profile-heading">Your Access</div>
        {userContext.map((item) => (
          <div className="sidebar-profile-row" key={item.label}>
            <span>{item.label}</span>
            <strong title={item.value}>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="sidebar-role-note">
        <strong>Your Role</strong>
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
        <span>Current Page</span>
        <strong>{activeItem?.label || 'Dashboard'}</strong>
        <small>{activeItem?.description || 'System overview'}</small>
      </div>

      <nav className="sidebar-menu" aria-label="Main navigation">
        {renderSection('overview', 'Overview', 'Main dashboard', overviewItems)}
        {renderSection('travel', 'Travel', 'Create and review requests', travelItems)}
        {renderSection('insights', 'Reports', 'Travel summaries', insightItems)}
        {renderSection('people', 'Admin', 'Users and approvals', peopleItems)}
        {renderSection('governance', 'Setup', 'Organization and audit', governanceItems)}
        {renderSection('account', 'Account', 'Password', accountItems)}
      </nav>

      <div className="sidebar-footer">
        <p>Ministry of Agriculture</p>
        <small>Secure travel approval workspace</small>
      </div>
    </aside>
  );
}

export default Sidebar;
