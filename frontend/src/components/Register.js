import { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import './Login.css';

const existingAccountResetMessage =
  'This email is already registered in FTMS. Please use the secure password reset link instead of creating a new account.';

const getRegistrationErrorMessage = (err) => {
  const serverCode = err.response?.data?.code;
  const serverMessage = err.response?.data?.error || err.response?.data?.message;

  if (
    serverCode === 'ACCOUNT_ALREADY_EXISTS' ||
    /already registered/i.test(serverMessage || '')
  ) {
    return existingAccountResetMessage;
  }

  return serverMessage || 'Registration failed. Please try again.';
};

function Register({ setActiveAuthPage }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    organizationType: '',
    organizationName: '',
    moaAssignmentType: '',
    sectorId: '',
    sector: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const [moaSectors, setMoaSectors] = useState([]);
  const [executiveOffices, setExecutiveOffices] = useState([]);
  const [moaProjects, setMoaProjects] = useState([]);
  const [affiliateInstitutions, setAffiliateInstitutions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingExecutiveOffices, setLoadingExecutiveOffices] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordResetPrompt, setPasswordResetPrompt] = useState(null);
  const [sendingResetRequest, setSendingResetRequest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const workflowTypes = [
    { value: 'sector_structure', label: 'Sector' },
    { value: 'ceo_structure', label: 'CEO' },
    { value: 'minister_structure', label: 'Minister' },
    {
      value: 'office_head_structure',
      label: "Head of the Minister's Office",
    },
  ];

  const selectedStructure = useMemo(
    () =>
      moaSectors.find((item) => String(item.id) === String(formData.sectorId)),
    [formData.sectorId, moaSectors]
  );
  const isMoaAdvisor = formData.organizationType === 'MoA' && formData.moaAssignmentType === 'advisor';
  const isMoaProject = formData.organizationType === 'MoA' && formData.moaAssignmentType === 'project';
  const selectedProject = useMemo(
    () =>
      moaProjects.find(
        (project) => project.project_name === formData.department
      ),
    [formData.department, moaProjects]
  );

  const structuresByType = workflowTypes.map((type) => ({
    ...type,
    structures: moaSectors.filter((item) => item.workflow_type === type.value),
  }));

  const passwordScore = useMemo(() => {
    const password = formData.password;
    let score = 0;

    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return score;
  }, [formData.password]);

  const passwordStrengthLabel =
    passwordScore >= 5 ? 'Strong' : passwordScore >= 3 ? 'Medium' : 'Weak';

  useEffect(() => {
    fetchRegistrationLists();
  }, []);

  const fetchRegistrationLists = async () => {
    try {
      setLoadingLists(true);

      const [sectorResponse, affiliateResponse] = await Promise.all([
        API.get('/moa-sectors'),
        API.get('/affiliate-institutions'),
      ]);

      setMoaSectors(sectorResponse.data || []);
      setAffiliateInstitutions(affiliateResponse.data || []);

      try {
        const projectResponse = await API.get('/moa-projects');
        setMoaProjects(projectResponse.data || []);
      } catch (projectError) {
        console.error(projectError);
        setMoaProjects([]);
      }
    } catch (error) {
      console.error(error);
      setError('Failed to load organization lists from settings.');
    } finally {
      setLoadingLists(false);
    }
  };

  const fetchExecutiveOffices = async (sectorId) => {
    if (!sectorId) {
      setExecutiveOffices([]);
      return;
    }

    try {
      setLoadingExecutiveOffices(true);

      const response = await API.get(
        `/moa-executive-offices?sectorId=${sectorId}`
      );

      setExecutiveOffices(response.data || []);
    } catch (error) {
      console.error(error);
      setError('Failed to load Lead Executive Offices from settings.');
    } finally {
      setLoadingExecutiveOffices(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setError('');
    setMessage('');

    if (name === 'organizationType') {
      setFormData({
        ...formData,
        organizationType: value,
        organizationName: value === 'MoA' ? 'Ministry of Agriculture' : '',
        moaAssignmentType: '',
        sectorId: '',
        sector: '',
        department: '',
      });

      setExecutiveOffices([]);
      return;
    }

    if (name === 'sectorId') {
      const selectedSector = moaSectors.find(
        (item) => String(item.id) === String(value)
      );

      setFormData({
        ...formData,
        sectorId: value,
        sector: selectedSector?.name || '',
        department: '',
      });

      fetchExecutiveOffices(value);
      return;
    }

    if (name === 'moaAssignmentType') {
      setFormData({
        ...formData,
        moaAssignmentType: value,
        sectorId: value === 'project' ? '' : formData.sectorId,
        sector: value === 'project' ? '' : formData.sector,
        department: value === 'advisor' ? 'Advisor' : '',
      });
      return;
    }

    if (name === 'department' && isMoaProject) {
      const project = moaProjects.find((item) => item.project_name === value);

      setFormData({
        ...formData,
        department: value,
        sectorId: project?.parent_structure_id || '',
        sector: project?.parent_structure_name || '',
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.position.trim() ||
      !formData.organizationType ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Please fill all required fields.');
      return;
    }

    if (formData.organizationType === 'MoA' && !isMoaProject && !formData.sectorId) {
      setError('Please select your organization structure.');
      return;
    }

    if (formData.organizationType === 'MoA' && !formData.moaAssignmentType) {
      setError('Please select Staff or Advisor assignment.');
      return;
    }

    if (formData.organizationType === 'MoA' && !isMoaAdvisor && !formData.department) {
      setError(
        isMoaProject
          ? 'Please enter your Project / Coordinator Office.'
          : 'Please select your Lead Executive Office.'
      );
      return;
    }

    if (
      formData.organizationType === 'Affiliate Institute' &&
      !formData.organizationName
    ) {
      setError('Please select your affiliate institute.');
      return;
    }

    if (passwordScore < 3) {
      setError(
        'Password must be at least medium strength. Use 8 characters with letters and numbers.'
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    try {
      setLoading(true);

      await API.post('/register', {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        position: formData.position.trim(),
        organizationType: formData.organizationType,
        organizationName:
          formData.organizationType === 'MoA'
            ? 'Ministry of Agriculture'
            : formData.organizationName,
        sector: formData.organizationType === 'MoA' ? formData.sector : null,
        department:
          formData.organizationType === 'MoA'
            ? isMoaAdvisor
              ? 'Advisor'
              : formData.department
            : formData.department || null,
        password: formData.password,
      });

      setMessage(
        'Your account request has been submitted successfully. You can login after admin approval.'
      );

      setFormData({
        fullName: '',
        email: '',
        phone: '',
        position: '',
        organizationType: '',
        organizationName: '',
        moaAssignmentType: '',
        sectorId: '',
        sector: '',
        department: '',
        password: '',
        confirmPassword: '',
      });

      setExecutiveOffices([]);
    } catch (err) {
      console.error(err);
      const serverCode = err.response?.data?.code;
      const serverMessage = err.response?.data?.error || err.response?.data?.message;

      if (
        serverCode === 'ACCOUNT_ALREADY_EXISTS' ||
        /already registered/i.test(serverMessage || '')
      ) {
        setError('');
        setPasswordResetPrompt({
          email: formData.email.trim(),
          message: getRegistrationErrorMessage(err),
        });
      } else {
        setError(getRegistrationErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordResetRequest = async () => {
    if (!passwordResetPrompt?.email || sendingResetRequest) return;

    try {
      setSendingResetRequest(true);
      const response = await API.post('/password-reset-request', {
        email: passwordResetPrompt.email,
      });

      setMessage(
        response.data?.message ||
          'If an active FTMS account exists for this email, a password reset link has been sent.'
      );
      setPasswordResetPrompt(null);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          'Unable to send password reset link. Please try again.'
      );
      setPasswordResetPrompt(null);
    } finally {
      setSendingResetRequest(false);
    }
  };

  return (
    <div className="login-page register-page">
      {passwordResetPrompt && (
        <div className="auth-modal-overlay" role="dialog" aria-modal="true">
          <div className="auth-modal-card">
            <span className="auth-modal-kicker">Account already exists</span>
            <h2>Password reset required</h2>
            <p>{passwordResetPrompt.message}</p>
            <div className="auth-modal-email">{passwordResetPrompt.email}</div>
            <div className="auth-modal-actions">
              <button
                type="button"
                className="auth-modal-secondary"
                onClick={() => setPasswordResetPrompt(null)}
                disabled={sendingResetRequest}
              >
                Cancel
              </button>
              <button
                type="button"
                className="auth-modal-primary"
                onClick={sendPasswordResetRequest}
                disabled={sendingResetRequest}
              >
                {sendingResetRequest ? 'Sending...' : 'Send Password Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <span className="auth-kicker">Traveler account request</span>
          <h2>Create Traveler Account</h2>
          <p>
            Register with your official organization details. Your account will
            be reviewed before you can submit foreign travel requests.
          </p>
        </div>

        <div className="auth-note-panel">
          <h3>Registration follows settings</h3>
          <p>
            MoA travelers select their structure and Lead Executive Office from
            Organization Settings. Affiliate travelers select their registered
            institution.
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
              Loading organization lists from settings...
            </div>
          )}

          <div className="auth-form-section">
            <h3>Personal Information</h3>
            <div className="auth-form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  autoComplete="name"
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
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="09..., 9..., +251 9..."
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
                <small>Phone will be saved in +251 format.</small>
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
            </div>
          </div>

          <div className="auth-form-section">
            <h3>Organization Assignment</h3>

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
                <option value="Affiliate Institute">Affiliate Institute</option>
              </select>
            </div>

            {formData.organizationType === 'MoA' && (
              <>
                <div className="form-group">
                  <label>Select Your Structure *</label>
                  <select
                    name="moaAssignmentType"
                    value={formData.moaAssignmentType}
                    onChange={handleChange}
                    className="ministry-select"
                  >
                    <option value="">Select your structure</option>
                    <option value="project">Project Staff</option>
                    <option value="advisor">Advisor</option>
                    <option value="staff">Staff under Lead Executive</option>
                  </select>
                </div>

                <div className="auth-form-grid">
                  <div className="form-group">
                    {isMoaProject ? (
                      <>
                        <label>Project *</label>
                        <select
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          className="ministry-select"
                          disabled={loadingLists}
                        >
                          <option value="">
                            {loadingLists
                              ? 'Loading projects...'
                              : moaProjects.length === 0
                              ? 'No projects registered'
                              : 'Select project'}
                          </option>
                          {moaProjects.map((project) => (
                            <option key={project.id} value={project.project_name}>
                              {project.project_name}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label>Organization Structure *</label>
                        <select
                          name="sectorId"
                          value={formData.sectorId}
                          onChange={handleChange}
                          className="ministry-select"
                          disabled={loadingLists}
                        >
                          <option value="">
                            {loadingLists
                              ? 'Loading structures...'
                              : 'Select organization structure'}
                          </option>

                          {structuresByType.map(
                            (group) =>
                              group.structures.length > 0 && (
                                <optgroup key={group.value} label={group.label}>
                                  {group.structures.map((sector) => (
                                    <option key={sector.id} value={sector.id}>
                                      {sector.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )
                          )}
                        </select>
                      </>
                    )}
                  </div>

                  {isMoaAdvisor ? (
                    <div className="form-group">
                      <label>Advisor Routing</label>
                      <input
                        type="text"
                        value="Advisor"
                        disabled
                        readOnly
                      />
                      <small>
                        Advisor travel requests go directly to the selected structure owner.
                      </small>
                    </div>
                  ) : isMoaProject ? (
                    <div className="form-group">
                      <label>Parent Structure</label>
                      <input
                        type="text"
                        value={selectedProject?.parent_structure_name || 'Linked after project selection'}
                        disabled
                        readOnly
                      />
                      <small>
                        Project staff requests first go to the matching Project Coordinator.
                      </small>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Lead Executive Office *</label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="ministry-select"
                        disabled={!formData.sectorId || loadingExecutiveOffices}
                      >
                        <option value="">
                          {!formData.sectorId
                            ? 'Select structure first'
                            : loadingExecutiveOffices
                            ? 'Loading Lead Executive Offices...'
                            : 'Select Lead Executive Office'}
                        </option>

                        {executiveOffices.map((office) => (
                          <option key={office.id} value={office.name}>
                            {office.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedStructure && (
                  <div className="selected-structure-note">
                    <span>Selected structure</span>
                    <strong>{selectedStructure.name}</strong>
                    <p>
                      {
                        workflowTypes.find(
                          (type) =>
                            type.value === selectedStructure.workflow_type
                        )?.label
                      }{' '}
                      {isMoaAdvisor
                        ? 'advisor routing directly to the structure owner.'
                        : isMoaProject
                        ? 'project routing through the Project Coordinator.'
                        : 'workflow with Lead Executive Office assignment.'}
                    </p>
                  </div>
                )}

                {isMoaProject && selectedProject && (
                  <div className="selected-structure-note">
                    <span>Selected project</span>
                    <strong>{selectedProject.project_name}</strong>
                    <p>
                      Linked to {selectedProject.parent_structure_name} for
                      Project Coordinator routing.
                    </p>
                  </div>
                )}
              </>
            )}

            {formData.organizationType === 'Affiliate Institute' && (
              <div className="auth-form-grid">
                <div className="form-group">
                  <label>Affiliate Institute *</label>
                  <select
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="ministry-select"
                    disabled={loadingLists}
                  >
                    <option value="">
                      {loadingLists
                        ? 'Loading affiliate institutes...'
                        : 'Select affiliate institute'}
                    </option>

                    {affiliateInstitutions.map((org) => (
                      <option key={org.id} value={org.organization_name}>
                        {org.organization_name}
                      </option>
                    ))}
                  </select>
                </div>

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
              </div>
            )}
          </div>

          <div className="auth-form-section">
            <h3>Account Security</h3>
            <div className="auth-form-grid">
              <div className="form-group">
                <label>Password *</label>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {formData.password && (
                  <small className={`password-strength score-${passwordScore}`}>
                    Strength: {passwordStrengthLabel}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <div className="password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Registration'}
          </button>

          <div className="register-link">
            <p>Already have an account?</p>
            <button type="button" onClick={() => setActiveAuthPage('login')}>
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
