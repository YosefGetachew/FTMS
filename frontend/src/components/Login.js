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
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError('');
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
              <p>Protocol updates Foreign Affairs status</p>
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
            <p>Please sign in to continue to FTMS</p>
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

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="register-link">
            <p>Do not have an account?</p>
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
