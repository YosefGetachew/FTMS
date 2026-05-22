import {
  useEffect,
  useState,
} from 'react';

import API from '../services/api';

function UserManagement() {
  const initialFormData = {
    fullName: '',
    email: '',
    password: '',
    role: 'traveler',
  };

  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'traveler', label: 'Traveler' },
    { value: 'state_minister', label: 'State Minister' },
    { value: 'protocol', label: 'Protocol' },
    { value: 'office_head', label: 'Office Head' },
    { value: 'minister', label: 'Minister' },
  ];

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await API.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.role
    ) {
      alert('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);

      await API.post('/users', {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });

      alert('User added successfully');

      setFormData(initialFormData);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert('Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (id) => {
    const newPassword = prompt('Enter new password');

    if (!newPassword) return;

    try {
      await API.put(
        `/users/${id}/reset-password`,
        { newPassword }
      );

      alert('Password reset successfully');
    } catch (error) {
      console.error(error);
      alert('Password reset failed');
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

  const formatRole = (role) => {
    const foundRole =
      roles.find((item) => item.value === role);

    return foundRole ? foundRole.label : role;
  };

  return (
    <div className="page-container">

      <h2>User Management</h2>

      <div className="settings-container">

        <div className="settings-group">
          <label>
            Full Name <span className="required-star">*</span>
          </label>

          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="settings-group">
          <label>
            Email <span className="required-star">*</span>
          </label>

          <input
            type="email"
            name="email"
            placeholder="example@email.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="settings-group">
          <label>
            Temporary Password <span className="required-star">*</span>
          </label>

          <input
            type="password"
            name="password"
            placeholder="Temporary Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="settings-group">
          <label>
            Role <span className="required-star">*</span>
          </label>

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            {roles.map((role) => (
              <option
                key={role.value}
                value={role.value}
              >
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
          {loading ? 'Adding...' : 'Add User'}
        </button>

      </div>

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
            {users.length === 0 ? (
              <tr>
                <td colSpan="4">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{formatRole(user.role)}</td>

                  <td>
                    <button
                      className="approve-btn"
                      onClick={() =>
                        handleResetPassword(user.id)
                      }
                    >
                      Reset Password
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        handleDelete(user.id)
                      }
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

    </div>
  );
}

export default UserManagement;