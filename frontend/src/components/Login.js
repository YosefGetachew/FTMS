import { useState } from 'react';
import API from '../services/api';
import './Login.css';

function Login({ setIsLoggedIn, setActiveAuthPage }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);

      const response = await API.post('/login', formData);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      window.location.href = '/dashboard';
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
          <h2>Official Travel Request Automation</h2>
          <p>
            A digital platform for submitting, reviewing, approving, and
            tracking official foreign travel requests within the Ministry.
          </p>
        </div>

        <div className="ministry-structure">
          <h3>Approval Structure</h3>

          <div className="structure-list">
            <div className="structure-item">
              <span>1</span>
              <p>Traveler submits travel request</p>
            </div>

            <div className="structure-item">
              <span>2</span>
              <p>State Minister reviews and approves</p>
            </div>

            <div className="structure-item">
              <span>3</span>
              <p>Protocol Office clears documents</p>
            </div>

            <div className="structure-item">
              <span>4</span>
              <p>Office Head reviews and approves</p>
            </div>

            <div className="structure-item">
              <span>5</span>
              <p>Minister decides when forwarded</p>
            </div>

            <div className="structure-item">
              <span>6</span>
              <p>Protocol follows foreign affairs response</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-header">
            <img
              src="/ministry-logo.png"
              alt="Ministry Logo"
              className="login-card-logo"
            />

            <h2>Welcome Back</h2>
            <p>Please login to continue to FTMS</p>
          </div>

          {error && <div className="login-error">{error}</div>}

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
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
<div className="register-link">
  <p>Don’t have an account?</p>
  <button
    type="button"
    onClick={() => setActiveAuthPage('register')}
  >
    Create Traveler Account
  </button>
</div>
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