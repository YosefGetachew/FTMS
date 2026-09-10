import { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import './Login.css';

function Login({ setIsLoggedIn, setActiveAuthPage }) {
  const resetToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('resetToken') || '';
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetForm, setResetForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const sessionNotice = sessionStorage.getItem('ftmsSessionNotice');

    if (sessionNotice) {
      setMessage(sessionNotice);
      sessionStorage.removeItem('ftmsSessionNotice');
    }
  }, []);

  useEffect(() => {
    if (!resetToken) return;

    const validateResetToken = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await API.get('/password-reset/validate', {
          params: { token: resetToken },
        });
        setResetEmail(response.data?.email || '');
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.error ||
            'This password reset link is invalid or has expired.'
        );
      } finally {
        setLoading(false);
      }
    };

    validateResetToken();
  }, [resetToken]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError('');
    setMessage('');
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await API.post('/password-reset-request', {
        email: forgotEmail.trim(),
      });

      setMessage(
        response.data?.message ||
          'If an active FTMS account exists for this email, a password reset link has been sent.'
      );
      setForgotEmail('');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          'Unable to send password reset link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (!resetForm.newPassword || !resetForm.confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await API.post('/password-reset/confirm', {
        token: resetToken,
        newPassword: resetForm.newPassword,
      });

      setMessage(response.data?.message || 'Password reset successfully.');
      setResetForm({ newPassword: '', confirmPassword: '' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          'Unable to reset password. Please request a new reset link.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);

      const response = await API.post('/login', {
        email: formData.email.trim(),
        password: formData.password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setIsLoggedIn(response.data.token);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="ministry-brand">
          <img
            src="/ministry-logo.png"
            alt="Ministry Logo"
            className="ministry-logo"
          />

          <div>
            <h1>Ministry of Agriculture</h1>
            <p>Foreign Travel Management System</p>
          </div>
        </div>

        <div className="system-intro">
          <span className="auth-kicker">Secure workflow access</span>
          <h2>Foreign Travel Request Automation</h2>
          <p>
            Submit, review, approve, and track official foreign travel requests
            through the Ministry approval hierarchy.
          </p>
        </div>

        <div className="ministry-structure">
          <h3>Approval Structure</h3>

          <div className="structure-list">
            <div className="structure-item">
              <span>1</span>
              <p>Traveler prepares and submits the request</p>
            </div>

            <div className="structure-item">
              <span>2</span>
              <p>Lead Executive Office reviews the request</p>
            </div>

            <div className="structure-item">
              <span>3</span>
              <p>State Minister, CEO, or Office Head gives structure approval</p>
            </div>

            <div className="structure-item">
              <span>4</span>
              <p>Protocol Office clears documents</p>
            </div>

            <div className="structure-item">
              <span>5</span>
              <p>Head of the Minister's Office reviews</p>
            </div>

            <div className="structure-item">
              <span>6</span>
              <p>Minister gives approval</p>
            </div>

            <div className="structure-item">
              <span>7</span>
              <p>Protocol submits approved travelers to the PM Office</p>
            </div>

            <div className="structure-item">
              <span>8</span>
              <p>PM Office updates the final response</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form
          className="login-card"
          onSubmit={
            resetToken
              ? handleResetSubmit
              : forgotMode
              ? handleForgotSubmit
              : handleSubmit
          }
        >
          <div className="login-card-header">
            <img
              src="/ministry-logo.png"
              alt="Ministry Logo"
              className="login-card-logo"
            />

            <h2>
              {resetToken
                ? 'Set New Password'
                : forgotMode
                ? 'Reset Password'
                : 'Welcome Back'}
            </h2>
            <p>
              {resetToken
                ? resetEmail || 'Verify your reset link and choose a new password'
                : forgotMode
                ? 'Enter your email to receive a secure reset link'
                : 'Please sign in to continue to FTMS'}
            </p>
          </div>

          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-success">{message}</div>}

          {resetToken ? (
            <>
              <div className="form-group">
                <label>New Password</label>
                <div className="password-field">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    name="newPassword"
                    placeholder="Enter new password"
                    value={resetForm.newPassword}
                    onChange={(e) =>
                      setResetForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((current) => !current)}
                  >
                    {showResetPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={resetForm.confirmPassword}
                  onChange={(e) =>
                    setResetForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  autoComplete="new-password"
                />
              </div>
            </>
          ) : forgotMode ? (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="forgotEmail"
                placeholder="Enter your registered email"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  setError('');
                  setMessage('');
                }}
                autoComplete="email"
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="forgot-password-link"
                onClick={() => {
                  setForgotMode(true);
                  setError('');
                  setMessage('');
                  setForgotEmail(formData.email);
                }}
              >
                Forgot password?
              </button>
            </>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading
              ? resetToken
                ? 'Resetting...'
                : forgotMode
                ? 'Sending...'
                : 'Logging in...'
              : resetToken
              ? 'Reset Password'
              : forgotMode
              ? 'Send Reset Link'
              : 'Login'}
          </button>

          {!resetToken && forgotMode ? (
            <div className="register-link">
              <p>Remembered your password?</p>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError('');
                  setMessage('');
                }}
              >
                Back to Login
              </button>
            </div>
          ) : !resetToken ? (
            <div className="register-link">
              <p>Do not have an account?</p>
              <button
                type="button"
                onClick={() => setActiveAuthPage('register')}
              >
                Create Traveler Account
              </button>
            </div>
          ) : (
            <div className="register-link">
              <p>After resetting your password, return to login.</p>
              <button type="button" onClick={() => window.location.assign('/')}>
                Back to Login
              </button>
            </div>
          )}

          <div className="login-footer">
            <p>Ministry of Agriculture</p>
            <small>Foreign Travel Management System</small>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
