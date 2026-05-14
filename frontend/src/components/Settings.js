import {
  useEffect,
  useState
} from 'react';

import API from '../services/api';

function Settings() {

  const [organizations, setOrganizations] =
    useState([]);

  const [organizationName,
    setOrganizationName] =
    useState('');

  const [editingId,
    setEditingId] =
    useState(null);

  useEffect(() => {

    fetchOrganizations();

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

  return (

    <div className="page-container">

      <h2>
        Affiliate Institutions
      </h2>

      <div className="settings-container">

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

    </div>
  );
}

export default Settings;