import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import './PendingUsers.css';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (_error) {
    return {};
  }
};

const asText = (value) => String(value || '').trim();
const asSearchText = (value) => asText(value).toLowerCase();

const isMoAAccount = (user) =>
  asSearchText(user.organization_type) === 'moa';

const isAffiliateAccount = (user) =>
  asSearchText(user.organization_type) === 'affiliate institute';

const hasMissingStructure = (user) =>
  isMoAAccount(user) && (!asText(user.sector) || !asText(user.department));

const formatOrganization = (user) => {
  if (isMoAAccount(user)) return 'Ministry of Agriculture';

  return asText(user.organization_name) || 'Affiliate Institute';
};

const formatStructure = (user) => {
  if (isMoAAccount(user)) {
    return {
      primary: asText(user.sector) || 'Structure not assigned',
      secondary: asText(user.department) || 'Lead executive office not assigned',
    };
  }

  return {
    primary: asText(user.department) || 'Department not assigned',
    secondary: asText(user.sector) || asText(user.organization_type) || 'Affiliate account',
  };
};

function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [notice, setNotice] = useState(null);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const canReviewPendingUsers =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const fetchPendingUsers = useCallback(async () => {
    if (!canReviewPendingUsers) return;

    try {
      setLoading(true);
      setNotice(null);

      const response = await API.get('/users/pending');

      setPendingUsers(response.data || []);
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message:
          error.response?.data?.error ||
          'Failed to load pending accounts. Please confirm that the API server is running.',
      });
    } finally {
      setLoading(false);
    }
  }, [canReviewPendingUsers]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const summaryCards = useMemo(
    () => [
      {
        label: 'Pending Accounts',
        value: pendingUsers.length,
        helper: 'Waiting for admin decision',
      },
      {
        label: 'MoA Accounts',
        value: pendingUsers.filter(isMoAAccount).length,
        helper: 'Sector and lead office users',
      },
      {
        label: 'Affiliate Accounts',
        value: pendingUsers.filter(isAffiliateAccount).length,
        helper: 'Institute users awaiting access',
      },
      {
        label: 'Missing Structure',
        value: pendingUsers.filter(hasMissingStructure).length,
        helper: 'Needs sector or lead office review',
      },
    ],
    [pendingUsers]
  );

  const filteredUsers = useMemo(() => {
    const search = asSearchText(searchTerm);

    return pendingUsers.filter((user) => {
      const matchesFilter =
        organizationFilter === 'all' ||
        (organizationFilter === 'moa' && isMoAAccount(user)) ||
        (organizationFilter === 'affiliate' && isAffiliateAccount(user)) ||
        (organizationFilter === 'missing_structure' && hasMissingStructure(user));

      if (!matchesFilter) return false;
      if (!search) return true;

      const haystack = [
        user.full_name,
        user.email,
        user.phone,
        user.position,
        user.organization_type,
        user.organization_name,
        user.sector,
        user.department,
      ]
        .map(asSearchText)
        .join(' ');

      return haystack.includes(search);
    });
  }, [pendingUsers, organizationFilter, searchTerm]);

  const approveUser = async (id) => {
    try {
      setLoadingId(id);
      setNotice(null);

      await API.put(`/users/${id}/approve`);

      setPendingUsers((prev) => prev.filter((user) => user.id !== id));
      setNotice({
        type: 'success',
        message: 'User account approved successfully.',
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: error.response?.data?.error || 'Failed to approve user.',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const rejectUser = async (id) => {
    const confirmReject = window.confirm(
      'Reject this account request? The user will not be able to sign in.'
    );

    if (!confirmReject) return;

    try {
      setLoadingId(id);
      setNotice(null);

      await API.put(`/users/${id}/reject`);

      setPendingUsers((prev) => prev.filter((user) => user.id !== id));
      setNotice({
        type: 'success',
        message: 'User account rejected.',
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message: error.response?.data?.error || 'Failed to reject user.',
      });
    } finally {
      setLoadingId(null);
    }
  };

  if (!canReviewPendingUsers) {
    return (
      <div className="pending-users-page">
        <div className="pending-access-card">
          <span>Restricted Area</span>
          <h2>Pending account review is limited to administrators.</h2>
          <p>
            Use the submitted requests page to review travel requests assigned to
            your role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-users-page">
      <div className="pending-users-header">
        <div>
          <span className="pending-page-kicker">Account Review</span>
          <h2>Pending User Accounts</h2>
          <p>
            Verify newly registered users before activating access to the travel
            management system.
          </p>
        </div>

        <button
          className="pending-refresh-btn"
          type="button"
          onClick={fetchPendingUsers}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="pending-summary-grid">
        {summaryCards.map((card) => (
          <div className="pending-summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
          </div>
        ))}
      </div>

      {notice && (
        <div className={`pending-notice ${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="pending-users-card">
        <div className="pending-controls">
          <label className="pending-search-field">
            <span>Search Accounts</span>
            <input
              type="search"
              placeholder="Search by name, email, phone, structure..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="pending-filter-field">
            <span>Filter</span>
            <select
              value={organizationFilter}
              onChange={(event) => setOrganizationFilter(event.target.value)}
            >
              <option value="all">All pending accounts</option>
              <option value="moa">MoA accounts</option>
              <option value="affiliate">Affiliate institute accounts</option>
              <option value="missing_structure">Missing structure</option>
            </select>
          </label>
        </div>

        <div className="pending-users-table-wrapper">
          <table className="pending-users-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Contact</th>
                <th>Organization</th>
                <th>Structure / Office</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="pending-empty">
                    Loading pending accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="pending-empty">
                    <strong>No accounts match this view</strong>
                    Adjust the search or filter to review other pending users.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const structure = formatStructure(user);

                  return (
                    <tr key={user.id}>
                      <td className="pending-applicant-cell">
                        <strong>{asText(user.full_name) || '-'}</strong>
                        <span>{asText(user.position) || 'Position not provided'}</span>
                      </td>

                      <td className="pending-contact-cell">
                        <strong>{asText(user.email) || '-'}</strong>
                        <span>{asText(user.phone) || 'Phone not provided'}</span>
                      </td>

                      <td className="pending-org-cell">
                        <strong>{formatOrganization(user)}</strong>
                        <span>{asText(user.organization_type) || 'Organization type not set'}</span>
                      </td>

                      <td className="pending-structure-cell">
                        <strong>{structure.primary}</strong>
                        <span>{structure.secondary}</span>
                      </td>

                      <td>
                        <span className="pending-status-badge">
                          Pending Approval
                        </span>
                      </td>

                      <td>
                        <div className="pending-actions">
                          <button
                            className="pending-approve-btn"
                            type="button"
                            disabled={loadingId === user.id}
                            onClick={() => approveUser(user.id)}
                          >
                            {loadingId === user.id ? 'Processing...' : 'Approve'}
                          </button>

                          <button
                            className="pending-reject-btn"
                            type="button"
                            disabled={loadingId === user.id}
                            onClick={() => rejectUser(user.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PendingUsers;
