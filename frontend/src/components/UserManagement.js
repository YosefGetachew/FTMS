import {
  useEffect,
  useState
} from 'react';

import API from '../services/api';

function UserManagement() {

  const [users, setUsers] =
    useState([]);

  const [formData, setFormData] =
    useState({
      fullName: '',
      email: '',
      password: '',
      role: 'data_entry',
    });

  useEffect(() => {

    fetchUsers();

  }, []);

  const fetchUsers = async () => {

    try {

      const response =
        await API.get('/users');

      setUsers(response.data);

    } catch (error) {

      console.error(error);
    }
  };

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = async () => {

    try {

      await API.post(
        '/users',
        formData
      );

      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'data_entry',
      });

      fetchUsers();

    } catch (error) {

      console.error(error);
    }
  };

  const handleResetPassword =
  async (id) => {

    const newPassword =
      prompt(
        'Enter new password'
      );

    if (!newPassword) return;

    try {

      await API.put(
        `/users/${id}/reset-password`,
        {
          newPassword
        }
      );

      alert(
        'Password reset successfully'
      );

    } catch (error) {

      console.error(error);

      alert(
        'Password reset failed'
      );
    }
  };


  const handleDelete = async (id) => {

    try {

      await API.delete(
        `/users/${id}`
      );

      fetchUsers();

    } catch (error) {

      console.error(error);
    }
  };

  return (

    <div className="page-container">

      <h2>
        User Management
      </h2>

      <div className="settings-container">

        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
        >

          <option value="admin">
            Admin
          </option>

          <option value="approver">
            Approver
          </option>

          <option value="data_entry">
            Data Entry
          </option>

          <option value="viewer">
            Viewer
          </option>

        </select>

        <button
          className="save-settings-btn"
          onClick={handleSubmit}
        >
          Add User
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

            {users.map((user) => (

              <tr key={user.id}>

                <td>
                  {user.full_name}
                </td>

                <td>
                  {user.email}
                </td>

                <td>
                  {user.role}
                </td>

                <td>
<button
  className="approve-btn"
  onClick={() =>
    handleResetPassword(
      user.id
    )
  }
>
  Reset Password
</button>
                  <button
                    className="delete-btn"
                    onClick={() =>
                      handleDelete(
                        user.id
                      )
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default UserManagement;