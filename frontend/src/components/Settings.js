import { useEffect, useState } from 'react';
import API from '../services/api';

function Settings() {
  const sectorApproverRoles = [
  { value: 'state_minister', label: 'State Minister' },
  { value: 'office_head', label: 'Office Head' },
  {
    value: 'chief_executive_officer',
    label: 'Chief Executive Officer',
  },
  {
    value: 'minister',
    label: 'Minister',
  },
];

  const [affiliateInstitutions, setAffiliateInstitutions] = useState([]);
  const [sectorApprovers, setSectorApprovers] = useState([]);

  const ministers = sectorApprovers.filter((user) => user.role === 'minister');
  const stateMinisters = sectorApprovers.filter((user) => user.role === 'state_minister');
  const administration = sectorApprovers.filter((user) =>user.role === 'office_head' ||user.role === 'chief_executive_officer');

  const [organizationName, setOrganizationName] = useState('');
  const [generalDirectorName, setGeneralDirectorName] = useState('');
  const [organizationEmail, setOrganizationEmail] = useState('');
  const [organizationPhone, setOrganizationPhone] = useState('');

  const [sector, setSector] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [approverPassword, setApproverPassword] = useState('');
  const [approverRole, setApproverRole] = useState('state_minister');

  const [editingOrganization, setEditingOrganization] = useState(null);
  const [editingApprover, setEditingApprover] = useState(null);

  useEffect(() => {
    fetchAffiliateInstitutions();
    fetchSectorApprovers();
  }, []);

  const formatRole = (role) => {
    const found = sectorApproverRoles.find((item) => item.value === role);
    return found ? found.label : role || '-';
  };

  const fetchAffiliateInstitutions = async () => {
    try {
      const response = await API.get('/affiliate-institutions');
      setAffiliateInstitutions(response.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load organizations');
    }
  };

  const fetchSectorApprovers = async () => {
    try {
      const response = await API.get('/state-ministers');
      setSectorApprovers(response.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load sector approvers');
    }
  };

  const addOrganization = async () => {
    if (!organizationName.trim()) {
      alert('Organization name is required');
      return;
    }

    try {
      await API.post('/affiliate-institutions', {
        organizationName,
        generalDirectorName,
        email: organizationEmail,
        phone: organizationPhone,
      });

      setOrganizationName('');
      setGeneralDirectorName('');
      setOrganizationEmail('');
      setOrganizationPhone('');

      fetchAffiliateInstitutions();
    } catch (error) {
      console.error(error);
      alert('Failed to add organization');
    }
  };

  const updateOrganization = async () => {
    if (!editingOrganization?.organization_name?.trim()) {
      alert('Organization name is required');
      return;
    }

    try {
      await API.put(`/affiliate-institutions/${editingOrganization.id}`, {
        organizationName: editingOrganization.organization_name,
        generalDirectorName: editingOrganization.general_director_name,
        email: editingOrganization.email,
        phone: editingOrganization.phone,
      });

      setEditingOrganization(null);
      fetchAffiliateInstitutions();
    } catch (error) {
      console.error(error);
      alert('Failed to update organization');
    }
  };

  const deleteOrganization = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this organization?'
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/affiliate-institutions/${id}`);
      fetchAffiliateInstitutions();
    } catch (error) {
      console.error(error);
      alert('Failed to delete organization');
    }
  };

  const addSectorApprover = async () => {
    if (
      !sector.trim() ||
      !approverName.trim() ||
      !approverEmail.trim() ||
      !approverPassword.trim() ||
      !approverRole
    ) {
      alert('All sector approver fields are required');
      return;
    }

    try {
      await API.post('/state-ministers', {
        sector,
        fullName: approverName,
        email: approverEmail,
        password: approverPassword,
        role: approverRole,
      });

      setSector('');
      setApproverName('');
      setApproverEmail('');
      setApproverPassword('');
      setApproverRole('state_minister');

      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to add sector approver');
    }
  };

  const updateSectorApprover = async () => {
    if (
      !editingApprover?.sector?.trim() ||
      !editingApprover?.full_name?.trim() ||
      !editingApprover?.email?.trim() ||
      !editingApprover?.role
    ) {
      alert('Sector, full name, email, and role are required');
      return;
    }

    try {
      await API.put(`/state-ministers/${editingApprover.id}`, {
        sector: editingApprover.sector,
        fullName: editingApprover.full_name,
        email: editingApprover.email,
        role: editingApprover.role,
      });

      setEditingApprover(null);
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to update sector approver');
    }
  };

  const deleteSectorApprover = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this sector approver?'
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/state-ministers/${id}`);
      fetchSectorApprovers();
    } catch (error) {
      console.error(error);
      alert('Failed to delete sector approver');
    }
  };
const renderApproverTable = (title, data) => (
  <div 
  className="settings-container" 
  style={{ 
    marginTop: '35px',
    paddingTop: '10px',
    paddingBottom: '10px',
    }}>
    <h3
    style={{ 
      marginBottom: '10px',
    margintop: '0px',}}
    >{title}</h3>

    <div 
    className="report-table-container"
    style={{margintop: '0px',
      
    }}>
      <table>
        <thead>
          <tr>
            <th>Sector</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="5">No records found</td>
            </tr>
          ) : (
            data.map((approver) => (
              <tr key={approver.id}>
                <td>{approver.sector || '-'}</td>
                <td>{approver.full_name || '-'}</td>
                <td>{approver.email || '-'}</td>
                <td>{formatRole(approver.role)}</td>
                <td>
                  <button
                    className="edit-btn"
                    onClick={() => setEditingApprover(approver)}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      deleteSectorApprover(approver.id)
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
  return (
    <div className="page-container">
      <h2>Settings</h2>

      <div className="settings-container">
        <h3>Affiliate Institutions</h3>

        <div className="settings-group">
          <label>Organization Name</label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        </div>

        <div className="settings-group">
          <label>General Director Name</label>
          <input
            type="text"
            value={generalDirectorName}
            onChange={(e) => setGeneralDirectorName(e.target.value)}
          />
        </div>

        <div className="settings-group">
          <label>Email</label>
          <input
            type="email"
            value={organizationEmail}
            onChange={(e) => setOrganizationEmail(e.target.value)}
          />
        </div>

        <div className="settings-group">
          <label>Phone Number</label>
          <input
            type="text"
            value={organizationPhone}
            onChange={(e) => setOrganizationPhone(e.target.value)}
          />
        </div>

        <button className="save-settings-btn" onClick={addOrganization}>
          Add Organization
        </button>
      </div>

      <div className="settings-container" style={{ marginTop: '35px' }}>
        <h3>Organization List</h3>

        <div className="report-table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>General Director</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {affiliateInstitutions.length === 0 ? (
                <tr>
                  <td colSpan="5">No organizations found</td>
                </tr>
              ) : (
                affiliateInstitutions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.organization_name || '-'}</td>
                    <td>{item.general_director_name || '-'}</td>
                    <td>{item.email || '-'}</td>
                    <td>{item.phone || '-'}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => setEditingOrganization(item)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => deleteOrganization(item.id)}
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

      <div className="settings-container" style={{ marginTop: '35px' }}>
        <h3>Add Sector Approver</h3>

        <div className="settings-group">
          <label>Sector</label>
          <input
            type="text"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </div>

        <div className="settings-group">
          <label>Approver Full Name</label>
          <input
            type="text"
            value={approverName}
            onChange={(e) => setApproverName(e.target.value)}
          />
        </div>

        <div className="settings-group">
          <label>Email</label>
          <input
            type="email"
            value={approverEmail}
            onChange={(e) => setApproverEmail(e.target.value)}
          />
        </div>

        <div className="settings-group">
          <label>Temporary Password</label>
          <input
            type="password"
            value={approverPassword}
            onChange={(e) => setApproverPassword(e.target.value)}
          />
        </div>

        <div className="settings-group">
          <label>Role</label>
          <select
            value={approverRole}
            onChange={(e) => setApproverRole(e.target.value)}
          >
            {sectorApproverRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <button className="save-settings-btn" onClick={addSectorApprover}>
          Add Sector Approver
        </button>
      </div>

      {renderApproverTable('Minister', ministers)}

{renderApproverTable('State Ministers', stateMinisters)}

{renderApproverTable(
  'Administration (CEO & Office Head)',
  administration
)}

      {editingOrganization && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Organization</h3>

            <div className="settings-group">
              <label>Organization Name</label>
              <input
                type="text"
                className="ministry-input"
                value={editingOrganization.organization_name || ''}
                onChange={(e) =>
                  setEditingOrganization({
                    ...editingOrganization,
                    organization_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>General Director Name</label>
              <input
                type="text"
                className="ministry-input"
                value={editingOrganization.general_director_name || ''}
                onChange={(e) =>
                  setEditingOrganization({
                    ...editingOrganization,
                    general_director_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>Email</label>
              <input
                type="email"
                className="ministry-input"
                value={editingOrganization.email || ''}
                onChange={(e) =>
                  setEditingOrganization({
                    ...editingOrganization,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>Phone</label>
              <input
                type="text"
                className="ministry-input"
                value={editingOrganization.phone || ''}
                onChange={(e) =>
                  setEditingOrganization({
                    ...editingOrganization,
                    phone: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button className="approve-btn" onClick={updateOrganization}>
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingOrganization(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingApprover && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Sector Approver</h3>

            <div className="settings-group">
              <label>Sector</label>
              <input
                type="text"
                className="ministry-input"
                value={editingApprover.sector || ''}
                onChange={(e) =>
                  setEditingApprover({
                    ...editingApprover,
                    sector: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>Approver Full Name</label>
              <input
                type="text"
                className="ministry-input"
                value={editingApprover.full_name || ''}
                onChange={(e) =>
                  setEditingApprover({
                    ...editingApprover,
                    full_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>Email</label>
              <input
                type="email"
                className="ministry-input"
                value={editingApprover.email || ''}
                onChange={(e) =>
                  setEditingApprover({
                    ...editingApprover,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="settings-group">
              <label>Role</label>
              <select
                className="ministry-input"
                value={editingApprover.role || 'state_minister'}
                onChange={(e) =>
                  setEditingApprover({
                    ...editingApprover,
                    role: e.target.value,
                  })
                }
              >
                {sectorApproverRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="approve-btn" onClick={updateSectorApprover}>
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingApprover(null)}
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

export default Settings;