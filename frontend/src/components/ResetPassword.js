import { useMemo, useState } from 'react';
import API from '../services/api';
import './ResetPassword.css';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (_error) {
    return {};
  }
};

function ResetPassword() {
  const user = useMemo(() => getCurrentUser(), []);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const passwordChecks = useMemo(
    () => [
      {
        label: 'At least 8 characters',
        valid: formData.newPassword.length >= 8,
      },
      {
        label: 'Contains a letter',
        valid: /[A-Za-z]/.test(formData.newPassword),
      },
      {
        label: 'Contains a number',
        valid: /\d/.test(formData.newPassword),
      },
      {
        label: 'Confirmation matches',
        valid:
          formData.confirmPassword.length > 0 &&
          formData.newPassword === formData.confirmPassword,
      },
    ],
    [formData.newPassword, formData.confirmPassword]
  );

  const passwordReady = passwordChecks.every((item) => item.valid);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setNotice(null);
  };

  const toggleVisibility = (field) => {
    setVisibleFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      setNotice({
        type: 'error',
        message: 'Unable to identify the logged-in account. Please log in again.',
      });
      return;
    }

    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setNotice({
        type: 'error',
        message: 'Please complete all password fields.',
      });
      return;
    }

    if (!passwordReady) {
      setNotice({
        type: 'error',
        message: 'Please meet the password requirements before updating.',
      });
      return;
    }

    try {
      setLoading(true);
      setNotice(null);

      await API.put(`/users/${user.id}/change-password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setNotice({
        type: 'success',
        message: 'Password updated successfully.',
      });

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message:
          error?.response?.data?.error || 'Failed to update password.',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (name, label, autoComplete) => (
    <div className="reset-password-group">
      <label htmlFor={name}>{label}</label>

      <div className="reset-password-input-wrap">
        <input
          id={name}
          type={visibleFields[name] ? 'text' : 'password'}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          autoComplete={autoComplete}
        />

        <button
          type="button"
          onClick={() => toggleVisibility(name)}
          aria-label={`${visibleFields[name] ? 'Hide' : 'Show'} ${label}`}
        >
          {visibleFields[name] ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="reset-password-page">
      <div className="reset-password-header">
        <span>Account Security</span>
        <h2>Reset Password</h2>
        <p>
          Update your account password using your current password. Choose a
          password that is long enough and not used elsewhere.
        </p>
      </div>

      <div className="reset-password-layout">
        <form className="reset-password-card" onSubmit={handleSubmit}>
          <div className="reset-password-card-header">
            <div>
              <h3>Change Password</h3>
              <p>{user?.email || 'Current FTMS account'}</p>
            </div>
          </div>

          {notice && (
            <div className={`reset-password-notice ${notice.type}`}>
              {notice.message}
            </div>
          )}

          {renderPasswordField(
            'currentPassword',
            'Current Password',
            'current-password'
          )}

          {renderPasswordField('newPassword', 'New Password', 'new-password')}

          {renderPasswordField(
            'confirmPassword',
            'Confirm New Password',
            'new-password'
          )}

          <button
            className="reset-password-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div className="reset-password-guidance">
          <h3>Password Requirements</h3>

          <div className="reset-password-checklist">
            {passwordChecks.map((item) => (
              <div
                className={`reset-password-check ${item.valid ? 'valid' : ''}`}
                key={item.label}
              >
                <span>{item.valid ? 'OK' : '-'}</span>
                <p>{item.label}</p>
              </div>
            ))}
          </div>

          <div className="reset-password-note">
            <strong>Security note</strong>
            <p>
              After changing your password, keep it private and avoid reusing it
              on other systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
