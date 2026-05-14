import { useEffect, useState } from 'react';
import API from '../services/api';

function RequestTable() {

  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [requests, setRequests] =
    useState([]);

  const [search, setSearch] =
    useState('');

  const [
    editingRequest,
    setEditingRequest,
  ] = useState(null);

  const [
  deletingRequest,
  setDeletingRequest
] = useState(null);

  useEffect(() => {

    fetchRequests();

  }, []);

  const fetchRequests = async () => {

    try {

      const response =
        await API.get('/requests');

      setRequests(response.data);

    } catch (error) {

      console.error(error);
    }
  };

  const deleteRequest = async () => {

  try {

    await API.delete(

      `/requests/${deletingRequest.id}`
    );

    alert(
      'Request deleted successfully'
    );

    setDeletingRequest(null);

    fetchRequests();

  } catch (error) {

    console.error(error);

    alert(
      'Failed to delete request'
    );
  }
};

  const updateStatus = async (
    id,
    status
  ) => {

    try {

      await API.put(
        `/requests/${id}/status`,
        { status }
      );

      fetchRequests();

    } catch (error) {

      console.error(error);
    }
  };

  const editRequest = (request) => {

    setEditingRequest(request);
  };

  const updateRequest = async () => {

  try {

    const formData =
      new FormData();

    Object.keys(
      editingRequest
    ).forEach((key) => {

      if (
        editingRequest[key] !== null &&
        editingRequest[key] !== undefined
      ) {

        formData.append(
          key,
          editingRequest[key]
        );
      }
    });

    if (
  editingRequest.new_passport_file
)

if (
  editingRequest.new_invitation_letter
)

if (
  editingRequest.new_tor_file
)
     {

      formData.append(
        'invitation_letter',
        editingRequest.new_invitation_letter
      );
    }

    if (
      editingRequest.new_tor_file
    ) {

      formData.append(
        'tor_file',
        editingRequest.new_tor_file
      );
    }

    await API.put(

      `/requests/${editingRequest.id}`,

      formData,

      {
        headers: {

          'Content-Type':
            'multipart/form-data',
        },
      }
    );

    alert(
      'Request Updated Successfully'
    );

    setEditingRequest(null);

    fetchRequests();

  } catch (error) {

    console.error(error);
  }
};

  const filteredRequests =
    requests.filter((request) =>
      request.full_name
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  return (

    <div className="table-container">

      <div className="table-header">

        <h2>
          Submitted Requests
        </h2>

        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>

      <table>

        <thead>

          <tr>

            <th>Name</th>
            <th>Department</th>
            <th>Country</th>
            <th>Status</th>
            <th>Actions</th>

          </tr>

        </thead>

        <tbody>

          {filteredRequests.map(
            (request) => (

              <tr key={request.id}>

                <td>
                  {request.full_name}
                </td>

                <td>
                  {request.department}
                </td>

                <td>
                  {request.country}
                </td>

                <td>

                  <span
                    className={`status-badge ${request.status?.toLowerCase()}`}
                  >
                    {request.status}
                  </span>

                </td>

                <td>

                  {(user?.role === 'admin' ||
                    user?.role === 'approver') && (

                    <>

                      <button
                        className="approve-btn"
                        onClick={() =>
                          updateStatus(
                            request.id,
                            'Approved'
                          )
                        }
                      >
                        Approve
                      </button>

                      <button
                        className="reject-btn"
                        onClick={() =>
                          updateStatus(
                            request.id,
                            'Rejected'
                          )
                        }
                      >
                        Reject
                      </button>

                    </>

                  )}

                  <button
                    className="edit-btn"
                    onClick={() =>
                      editRequest(request)
                    }
                  >
                    Edit
                  </button>

                  <button
                    className="pdf-btn"
                    onClick={() =>
                      window.open(
                        `http://localhost:5000/api/generate-pdf/${request.id}`,
                        '_blank'
                      )
                    }
                  >
                    PDF
                  </button>

                  <button
  className="delete-btn"
  onClick={() =>
    setDeletingRequest(request)
  }
>
  Delete
</button>

                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

      {editingRequest && (

        <div className="modal-overlay">

          <div className="edit-modal">

            <h2>
              Edit Travel Request
            </h2>

            <div className="form-group">

  <label>
    Full Name
  </label>

  <input
    type="text"
    value={
      editingRequest.full_name || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        full_name:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Position
  </label>

  <input
    type="text"
    value={
      editingRequest.position || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        position:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Department
  </label>

  <input
    type="text"
    value={
      editingRequest.department || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        department:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Destination Country
  </label>

  <input
    type="text"
    value={
      editingRequest.country || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        country:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Start Date
  </label>

  <input
    type="date"
    value={
      editingRequest.start_date || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        start_date:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    End Date
  </label>

  <input
    type="date"
    value={
      editingRequest.end_date || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        end_date:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Purpose
  </label>

  <input
    type="text"
    value={
      editingRequest.purpose || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        purpose:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Sponsor
  </label>

  <input
    type="text"
    value={
      editingRequest.sponsor || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        sponsor:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Passport Number
  </label>

  <input
    type="text"
    value={
      editingRequest.passport_number || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        passport_number:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Email
  </label>

  <input
    type="email"
    value={
      editingRequest.email || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        email:
          e.target.value,
      })
    }
  />

</div>

<div className="form-group">

  <label>
    Phone Number
  </label>

  <input
    type="text"
    value={
      editingRequest.phone || ''
    }
    onChange={(e) =>
      setEditingRequest({

        ...editingRequest,

        phone:
          e.target.value,
      })
    }
  />

</div>
<div className="attachments-section">

  <h3>
    Attachments
  </h3>

  {/* Passport */}

  <div className="attachment-item">

    <span>
      Passport File
    </span>

    <div className="attachment-actions">

      {editingRequest.passport_file && (

        <a
          href={`http://localhost:5000/uploads/${editingRequest.passport_file}`}
          target="_blank"
          rel="noreferrer"
          className="view-btn"
        >
          View
        </a>

      )}

      <input
        type="file"
        onChange={(e) =>
          setEditingRequest({

            ...editingRequest,

            passport_file:
              e.target.files[0],
          })
        }
      />

    </div>

  </div>

  {/* Invitation Letter */}

  <div className="attachment-item">

    <span>
      Invitation Letter
    </span>

    <div className="attachment-actions">

      {editingRequest.invitation_letter && (

        <a
          href={`http://localhost:5000/uploads/${editingRequest.invitation_letter}`}
          target="_blank"
          rel="noreferrer"
          className="view-btn"
        >
          View
        </a>

      )}

      <input
        type="file"
        onChange={(e) =>
          setEditingRequest({

            ...editingRequest,

            invitation_letter:
              e.target.files[0],
          })
        }
      />

    </div>

  </div>

  {/* TOR */}

  <div className="attachment-item">

    <span>
      TOR File
    </span>

    <div className="attachment-actions">

      {editingRequest.tor_file && (

        <a
          href={`http://localhost:5000/uploads/${editingRequest.tor_file}`}
          target="_blank"
          rel="noreferrer"
          className="view-btn"
        >
          View
        </a>

      )}

      <input
        type="file"
        onChange={(e) =>
          setEditingRequest({

            ...editingRequest,

            tor_file:
              e.target.files[0],
          })
        }
      />

    </div>

  </div>

</div>
            <div className="modal-actions">

              <button
                className="approve-btn"
                onClick={updateRequest}
              >
                Save
              </button>

              <button
                className="reject-btn"
                onClick={() =>
                  setEditingRequest(null)
                }
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}
{deletingRequest && (

  <div className="modal-overlay">

    <div className="delete-modal">

      <h2>
        Confirm Delete
      </h2>

      <p>

        Are you sure you want to delete
        <strong>
          {' '}
          {deletingRequest.full_name}
        </strong>

        's travel request to

        <strong>
          {' '}
          {deletingRequest.country}
        </strong>

        ?

      </p>

      <div className="modal-actions">

        <button
          className="delete-btn"
          onClick={deleteRequest}
        >
          Yes, Delete
        </button>

        <button
          className="approve-btn"
          onClick={() =>
            setDeletingRequest(null)
          }
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

export default RequestTable;