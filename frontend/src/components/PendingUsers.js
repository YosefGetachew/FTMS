import { useEffect, useState } from 'react';
import API from '../services/api';
import './PendingUsers.css';

function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);

      const response = await API.get('/users/pending');

      setPendingUsers(response.data || []);
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          'Failed to load pending users'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const approveUser = async (id) => {
    try {
      setLoadingId(id);

      await API.put(`/users/${id}/approve`);

      alert('User account approved successfully.');

      setPendingUsers((prev) =>
        prev.filter((user) => user.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          'Failed to approve user'
      );
    } finally {
      setLoadingId(null);
    }
  };

  const rejectUser = async (id) => {
    const confirmReject = window.confirm(
      'Are you sure you want to reject this account request?'
    );

    if (!confirmReject) return;

    try {
      setLoadingId(id);

      await API.put(`/users/${id}/reject`);

      alert('User account rejected.');

      setPendingUsers((prev) =>
        prev.filter((user) => user.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          'Failed to reject user'
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="pending-users-page">
      <div className="pending-users-header">
        <div>
          <h2>Pending User Accounts</h2>
          <p>
            Review and activate newly registered traveler accounts.
          </p>
        </div>

        <button
          className="pending-refresh-btn"
          onClick={fetchPendingUsers}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="pending-users-card">
        <div className="pending-users-table-wrapper">
          <table className="pending-users-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Organization</th>
                <th>Sector / Institute</th>
                <th>Position</th>
                <th>Sector</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="pending-empty">
                    Loading pending users...
                  </td>
                </tr>
              ) : pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="pending-empty">
                    <strong>No pending accounts</strong>
                    There are no traveler accounts waiting for approval.
                  </td>
                </tr>
              ) : (
                pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="user-name-cell">
                      {user.full_name || '-'}
                    </td>

                    <td className="user-email-cell">
                      {user.email || '-'}
                    </td>

                    <td>{user.phone || '-'}</td>
                    <td>{user.organization_type || '-'}</td>
<td>
  {user.organization_type === 'MoA'
    ? user.sector || '-'
    : user.organization_name || '-'}
</td>
                    <td>{user.position || '-'}</td>
                    <td>{user.sector || '-'}</td>
                    <td>{user.department || '-'}</td>

                    <td>
                      <span className="pending-status-badge">
                        Pending
                      </span>
                    </td>

                    <td>
                      <div className="pending-actions">
                        <button
                          className="pending-approve-btn"
                          disabled={loadingId === user.id}
                          onClick={() => approveUser(user.id)}
                        >
                          {loadingId === user.id
                            ? 'Processing...'
                            : 'Approve'}
                        </button>

                        <button
                          className="pending-reject-btn"
                          disabled={loadingId === user.id}
                          onClick={() => rejectUser(user.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PendingUsers;