import {
  useEffect,
  useState
} from 'react';

import API from '../services/api';

function Settings() {

  const [organizations, setOrganizations] =
    useState([]);

  const [
    organizationName,
    setOrganizationName
  ] = useState('');

  const [editingId, setEditingId] =
    useState(null);

  const [stateMinisters, setStateMinisters] =
    useState([]);

  const [
    stateMinisterName,
    setStateMinisterName
  ] = useState('');

  const [
    stateMinisterEmail,
    setStateMinisterEmail
  ] = useState('');

  const [
    stateMinisterPassword,
    setStateMinisterPassword
  ] = useState('');

  useEffect(() => {

    fetchOrganizations();

    fetchStateMinisters();

  }, []);

  const fetchOrganizations = async () => {

    try {

      const response =
        await API.get(
          '/affiliate-institutions'
        );

      setOrganizations(response.data);

    } catch (error) {

      console.error(error);
    }
  };

  const fetchStateMinisters = async () => {

    try {

      const response =
        await API.get('/state-ministers');

      setStateMinisters(response.data);

    } catch (error) {

      console.error(error);
    }
  };

  const handleSubmit = async () => {

    try {

      if (editingId) {

        await API.put(
          `/affiliate-institutions/${editingId}`,
          { organizationName }
        );

        setEditingId(null);

      } else {

        await API.post(
          '/affiliate-institutions',
          { organizationName }
        );
      }

      setOrganizationName('');

      fetchOrganizations();

    } catch (error) {

      console.error(error);
    }
  };

  const handleEdit = (org) => {

    setEditingId(org.id);

    setOrganizationName(
      org.organization_name
    );
  };

  const handleDelete = async (id) => {

    try {

      await API.delete(
        `/affiliate-institutions/${id}`
      );

      fetchOrganizations();

    } catch (error) {

      console.error(error);
    }
  };
  const [sector, setSector] =
  useState('');

  const addStateMinister = async () => {

    try {

      await API.post(
        '/state-ministers',
        {
          sector,
          fullName: stateMinisterName,
          email: stateMinisterEmail,
          password: stateMinisterPassword,
        }
      );

      setStateMinisterName('');
      setStateMinisterEmail('');
      setStateMinisterPassword('');

      fetchStateMinisters();

    } catch (error) {

      console.error(error);
    }
  };

  const deleteStateMinister = async (id) => {

    try {

      await API.delete(
        `/state-ministers/${id}`
      );

      fetchStateMinisters();

    } catch (error) {

      console.error(error);
    }
  };

  return (

    <div className="page-container">

      <h2>
        Settings
      </h2>

      <div className="settings-container">

        <h3>
          Affiliate Institutions
        </h3>

        <div className="settings-group">

          <label>
            Organization Name
          </label>

          <input
            type="text"
            value={organizationName}
            onChange={(e) =>
              setOrganizationName(
                e.target.value
              )
            }
          />

        </div>

        <button
          className="save-settings-btn"
          onClick={handleSubmit}
        >
          {editingId
            ? 'Update Organization'
            : 'Add Organization'}
        </button>

      </div>

      <div className="report-table-container">

        <h3>
          Organization List
        </h3>

        <table>

          <thead>

            <tr>
              <th>Name</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {organizations.map((org) => (

              <tr key={org.id}>

                <td>
                  {org.organization_name}
                </td>

                <td>

                  <button
                    className="approve-btn"
                    onClick={() =>
                      handleEdit(org)
                    }
                  >
                    Edit
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      handleDelete(org.id)
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

      <div className="settings-container">

        <h3>
          Add Sectors & State Ministers
        </h3>
        

        <div className="settings-group">

          <label>
            Sector
          </label>

          <input
            type="text"
            value={sector}
            onChange={(e) =>
              setSector(
                e.target.value
              )
            }
          />

        </div>

        <div className="settings-group">

          <label>
            State Minister Full Name
          </label>

          <input
            type="text"
            value={stateMinisterName}
            onChange={(e) =>
              setStateMinisterName(
                e.target.value
              )
            }
          />

        </div>

        <div className="settings-group">

          <label>
            Email
          </label>

          <input
            type="email"
            value={stateMinisterEmail}
            onChange={(e) =>
              setStateMinisterEmail(
                e.target.value
              )
            }
          />

        </div>

        <div className="settings-group">

          <label>
            Temporary Password
          </label>

          <input
            type="password"
            value={stateMinisterPassword}
            onChange={(e) =>
              setStateMinisterPassword(
                e.target.value
              )
            }
          />

        </div>

        <button
          className="save-settings-btn"
          onClick={addStateMinister}
        >
          Add State Minister
        </button>

      </div>

      <div className="report-table-container">

        <h3>
          State Minister List
        </h3>

        <table>

          <thead>

            <tr>
              <th>Sector</th>
              <th>Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {stateMinisters.map((minister) => (

              <tr key={minister.id}>
                <td>
                  {minister.sector}
                </td>

                <td>
                  {minister.full_name}
                </td>

                <td>
                  {minister.email}
                </td>

                <td>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      deleteStateMinister(
                        minister.id
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

export default Settings;