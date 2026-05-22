import { useState } from 'react';

import API from '../services/api';

function ResetPassword() {

  const user =
    JSON.parse(
      localStorage.getItem('user') || '{}'
    );

  const [formData, setFormData] =
    useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

  const [loading, setLoading] =
    useState(false);

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = async () => {

    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {

      alert(
        'Please complete all fields'
      );

      return;
    }

    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {

      alert(
        'Passwords do not match'
      );

      return;
    }

    try {

      setLoading(true);

      await API.put(
        `/users/${user.id}/change-password`,
        {
          currentPassword:
            formData.currentPassword,

          newPassword:
            formData.newPassword,
        }
      );

      alert(
        'Password updated successfully'
      );

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

    } catch (error) {

      console.error(error);

      alert(
        error?.response?.data?.error ||
        'Failed to update password'
      );

    } finally {

      setLoading(false);
    }
  };

  return (

    <div className="page-container">

      <h2>
        Reset Password
      </h2>

      <div
        className="settings-container"
        style={{
          maxWidth: '500px',
        }}
      >

        <div className="settings-group">

          <label>
            Current Password
          </label>

          <input
            type="password"
            name="currentPassword"
            value={
              formData.currentPassword
            }
            onChange={handleChange}
          />

        </div>

        <div className="settings-group">

          <label>
            New Password
          </label>

          <input
            type="password"
            name="newPassword"
            value={
              formData.newPassword
            }
            onChange={handleChange}
          />

        </div>

        <div className="settings-group">

          <label>
            Confirm New Password
          </label>

          <input
            type="password"
            name="confirmPassword"
            value={
              formData.confirmPassword
            }
            onChange={handleChange}
          />

        </div>

        <button
          className="save-settings-btn"
          onClick={handleSubmit}
          disabled={loading}
        >

          {loading
            ? 'Updating...'
            : 'Update Password'}

        </button>

      </div>

    </div>
  );
}

export default ResetPassword;