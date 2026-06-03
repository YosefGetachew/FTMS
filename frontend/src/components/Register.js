import { useEffect, useState } from 'react';
import API from '../services/api';
import './Login.css';

function Register({ setActiveAuthPage }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    organizationType: '',
    organizationName: '',
    sector: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const [sectors, setSectors] = useState([]);
  const [affiliateInstitutions, setAffiliateInstitutions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegistrationLists();
  }, []);

  const fetchRegistrationLists = async () => {
    try {
      setLoadingLists(true);

      const [sectorResponse, affiliateResponse] = await Promise.all([
        API.get('/state-ministers'),
        API.get('/affiliate-institutions'),
      ]);

      const sectorList = [
        ...new Set(
          (sectorResponse.data || [])
            .map((item) => item.sector)
            .filter(Boolean)
        ),
      ];

      setSectors(sectorList);
      setAffiliateInstitutions(affiliateResponse.data || []);
    } catch (error) {
      console.error(error);
      setError('Failed to load organization lists from settings.');
    } finally {
      setLoadingLists(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'organizationType') {
      setFormData({
        ...formData,
        organizationType: value,
        organizationName: value === 'MoA' ? 'Ministry of Agriculture' : '',
        sector: '',
        department: '',
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.position ||
      !formData.organizationType ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Please fill all required fields.');
      return;
    }

    if (formData.organizationType === 'MoA' && !formData.sector) {
      setError('Please select your sector.');
      return;
    }

    if (
      formData.organizationType === 'Affiliate Institute' &&
      !formData.organizationName
    ) {
      setError('Please select your affiliate institute.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    try {
      setLoading(true);

      await API.post('/register', {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        organizationType: formData.organizationType,
        organizationName:
          formData.organizationType === 'MoA'
            ? 'Ministry of Agriculture'
            : formData.organizationName,
        sector:
          formData.organizationType === 'MoA'
            ? formData.sector
            : null,
        department: formData.department,
        password: formData.password,
      });

      setMessage(
        'Your account request has been submitted successfully. You will be able to login after admin approval.'
      );

      setFormData({
        fullName: '',
        email: '',
        phone: '',
        position: '',
        organizationType: '',
        organizationName: '',
        sector: '',
        department: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          'Registration failed. Please try again.'
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
          <h2>Create Traveler Account</h2>
          <p>
            Register to submit and track official foreign travel requests.
            Your account will be reviewed and activated by the system admin.
          </p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card register-card" onSubmit={handleSubmit}>
          <div className="login-card-header">
            <img
              src="/ministry-logo.png"
              alt="Ministry Logo"
              className="login-card-logo"
            />

            <h2>Traveler Registration</h2>
            <p>Submit your account request</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          {message && <div className="login-success">{message}</div>}

          {loadingLists && (
            <div className="login-info">
              Loading organization lists...
            </div>
          )}

          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Phone *</label>
            <input
              type="text"
              name="phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Position *</label>
            <input
              type="text"
              name="position"
              placeholder="Enter position"
              value={formData.position}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Organization *</label>
            <select
              name="organizationType"
              value={formData.organizationType}
              onChange={handleChange}
              className="ministry-select"
            >
              <option value="">Select organization type</option>
              <option value="MoA">MoA</option>
              <option value="Affiliate Institute">
                Affiliate Institute
              </option>
            </select>
          </div>

          {formData.organizationType === 'MoA' && (
            <div className="form-group">
              <label>Sector *</label>
              <select
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                className="ministry-select"
              >
                <option value="">Select sector</option>

                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.organizationType === 'Affiliate Institute' && (
            <div className="form-group">
              <label>Affiliate Institute *</label>
              <select
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                className="ministry-select"
              >
                <option value="">Select affiliate institute</option>

                {affiliateInstitutions.map((org) => (
                  <option
                    key={org.id}
                    value={org.organization_name}
                  >
                    {org.organization_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              name="department"
              placeholder="Enter department"
              value={formData.department}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Registration'}
          </button>

          <div className="register-link">
            <p>Already have an account?</p>
            <button
              type="button"
              onClick={() => setActiveAuthPage('login')}
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;