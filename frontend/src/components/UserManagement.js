import { useEffect, useState } from 'react';
import API from '../services/api';

function UserManagement() {
  const initialFormData = {
    fullName: '',
    email: '',
    password: '',
    role: 'admin',
  };

  const officerRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'protocol', label: 'Protocol' },
    { value: 'state_minister', label: 'State Minister' },
    { value: 'office_head', label: 'Office Head' },
    { value: 'minister', label: 'Minister' },
    {
      value: 'chief_executive_officer',
      label: 'Chief Executive Officer',
    },
  ];

  const officerRoleValues = officerRoles.map((role) => role.value);

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await API.get('/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load users');
    }
  };

  const travelers = users.filter((user) => user.role === 'traveler');

  const ministers = users.filter((user) => user.role === 'minister');

  const stateMinisters = users.filter(
    (user) => user.role === 'state_minister'
  );

  const administration = users.filter(
    (user) =>
      user.role === 'chief_executive_officer' ||
      user.role === 'office_head'
  );

  const otherOfficers = users.filter(
    (user) =>
      user.role === 'admin' ||
      user.role === 'protocol'
  );

  const formatRole = (role) => {
    const foundRole = officerRoles.find(
      (item) => item.value === role
    );

    if (foundRole) return foundRole.label;

    if (role === 'traveler') return 'Traveler';

    return role || '-';
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowEditModal(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.role
    ) {
      alert('Please complete required fields');
      return false;
    }

    if (!editingId && !formData.password.trim()) {
      alert('Password is required for new officer');
      return false;
    }

    if (!officerRoleValues.includes(formData.role)) {
      alert('Only officer roles can be created here');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (editingId) {
        await API.put(`/users/${editingId}`, {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          role: formData.role,
        });

        alert('Officer updated successfully');
      } else {
        await API.post('/users', {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        });

        alert('Officer added successfully');
      }

      resetForm();
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);

    setFormData({
      fullName: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'admin',
    });

    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleResetPassword = async (id) => {
    const newPassword = prompt('Enter new password');

    if (!newPassword) return;

    try {
      await API.put(`/users/${id}/reset-password`, {
        newPassword,
      });

      alert('Password reset successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to reset password');
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this user?'
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/users/${id}`);

      alert('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert('Failed to delete user');
    }
  };

  const renderUserTable = (items, emptyMessage) => (
    <div className="report-table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="4">{emptyMessage}</td>
            </tr>
          ) : (
            items.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name || '-'}</td>
                <td>{user.email || '-'}</td>
                <td>{formatRole(user.role)}</td>

                <td>
                  {officerRoleValues.includes(user.role) && (
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                  )}

                  <button
                    className="approve-btn"
                    onClick={() => handleResetPassword(user.id)}
                  >
                    Reset Password
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderUserSection = (title, items, emptyMessage) => (
    <div className="settings-container" style={{ marginTop: '20px' }}>
      <h3>
        {title} ({items.length})
      </h3>

      {renderUserTable(items, emptyMessage)}
    </div>
  );

  return (
    <div className="page-container">
      <h2>User Management</h2>

      <div className="settings-container">
        <h3>Add Officer</h3>

        <div className="settings-group">
          <label>Full Name *</label>

          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="settings-group">
          <label>Email *</label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="settings-group">
          <label>Temporary Password *</label>

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <div className="settings-group">
          <label>Role *</label>

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            {officerRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="save-settings-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Add Officer'}
        </button>
      </div>

      
      {renderUserSection(
        'Minister',
        ministers,
        'No minister found'
      )}

      {renderUserSection(
        'State Ministers',
        stateMinisters,
        'No state ministers found'
      )}

      {renderUserSection(
        'Administration (CEO & Office Head)',
        administration,
        'No administration users found'
      )}

      {renderUserSection(
        'System Officers (Admin & Protocol)',
        otherOfficers,
        'No system officers found'
      )}
      
      {renderUserSection(
        'Travelers',
        travelers,
        'No travelers found'
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Officer</h3>

            <div className="settings-group">
              <label>Full Name</label>

              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="settings-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="settings-group">
              <label>Role</label>

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                {officerRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                className="save-settings-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Update Officer'}
              </button>

              <button
                className="delete-btn"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;