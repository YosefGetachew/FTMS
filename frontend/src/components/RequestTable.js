import { useEffect, useState } from 'react';
import API from '../services/api';

function RequestTable() {
  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
  try {
    const response = await API.get(
      `/requests?role=${user.role}&email=${user.email}&id=${user.id}`
    );

    setRequests(response.data);
  } catch (error) {
    console.error(error);
  }
};

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/requests/${id}/status`, {
        status,
        role: user.role,
      });

      fetchRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to update request status');
    }
  };

const isProtocol =
  user?.role === 'protocol';

const isTraveler =
  user?.role === 'traveler';

const canApprove =
  [
    'state_minister',
    'protocol',
    'office_head',
    'minister',
    'admin',
  ].includes(user?.role);

const canReject =
  [
    'state_minister',
    'office_head',
    'minister',
    'admin',
  ].includes(user?.role);

const canAmend =
  user?.role === 'protocol';

const canDelete =
  user?.role === 'admin';
  

  const filteredRequests = requests.filter((request) => {
    const keyword = search.toLowerCase();

    return (
      request.full_name?.toLowerCase().includes(keyword) ||
      request.department?.toLowerCase().includes(keyword) ||
      request.country?.toLowerCase().includes(keyword) ||
      request.status?.toLowerCase().includes(keyword) ||
      request.current_stage?.toLowerCase().includes(keyword)
    );
  });

  const formatStage = (stage) => {
    const stages = {
      state_minister: 'State Minister',
      protocol: 'Protocol',
      office_head: 'Office Head',
      minister: 'Minister',
      completed: 'Completed',
    };

    return stages[stage] || stage;
  };

  const deleteRequest = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this request?'
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/requests/${id}`);
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to delete request');
    }
  };
const amendRequest = async (id) => {

  const comment =
    prompt(
      'Enter amendment comment'
    );

  if (!comment) return;

  try {

    await API.put(
      `/requests/${id}/status`,
      {
        status: 'Amended',
        role: user.role,
        comment,
      }
    );

    fetchRequests();

  } catch (error) {

    console.error(error);

    alert(
      'Failed to request amendment'
    );
  }
};

const resubmitRequest =
  async (id) => {

    try {

      await API.put(
        `/requests/${id}/resubmit`
      );

      alert(
        'Request resubmitted successfully'
      );

      fetchRequests();

    } catch (error) {

      console.error(error);

      alert(
        'Failed to resubmit request'
      );
    }
};
  return (
    <div className="table-container">

      <div className="table-header">
        <h2>Submitted Requests</h2>

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
            <th>Purpose</th>
            <th>Trip Date</th>
            <th>Status</th>
            <th>Current Stage</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredRequests.length === 0 ? (
            <tr>
              <td colSpan="8">
                No requests found
              </td>
            </tr>
          ) : (
            filteredRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.full_name}</td>
                <td style={{
                  maxWidth: '50px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.15',
                  }}
                >{request.department}</td>
<td style={{
                  maxWidth: '80px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.15',
                  }}
                >{request.country}</td>

                <td style={{
                  maxWidth: '80px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.15',
                  }}
                >{request.country}</td>
                <td
                style={{
                  maxWidth: '220px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.15',
                  }}>{request.purpose}</td>

<td style={{
                  maxWidth: '220px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.15',
                  }}>

  <div>

    {new Date(
      request.start_date
    ).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: '2-digit',
        year: '2-digit',
      }
    )}

  </div>

  <div
    style={{
      fontSize: '12px',
      color: '#64748b',
      marginTop: '4px',
      marginBottom: '4px',
    }}
  >
    to
  </div>

  <div>

    {new Date(
      request.end_date
    ).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: '2-digit',
        year: '2-digit',
      }
    )}

  </div>

  <div
    style={{
      marginTop: '6px',
      color: '#2563eb',
      fontWeight: '600',
      fontSize: '12px',
    }}
  >

    {Math.ceil(
      (
        new Date(request.end_date) -
        new Date(request.start_date)
      ) /
      (1000 * 60 * 60 * 24)
    ) + 1}

    {' '}Days

  </div>

</td>

<td>
  <span
    className={`status-badge ${request.status?.toLowerCase()}`}
  >
    {request.status}
  </span>
</td>

                <td>
                  {formatStage(request.current_stage)}
                </td>

  <td>

  {canApprove &&
    request.current_stage !== 'completed' && (
      <button
        className="approve-btn"
        onClick={() =>
          updateStatus(
            request.id,
            'Approved'
          )
        }
      >
        {user.role === 'protocol'
          ? 'Clear'
          : 'Approve'}
      </button>
    )}

  {canReject &&
    request.current_stage !== 'completed' && (
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
    )}

  {canAmend &&
    request.current_stage ===
      'protocol' && (
      <button
        className="edit-btn"
        onClick={() =>
          amendRequest(request.id)
        }
      >
        Amend
      </button>
    )}

  {isTraveler &&
    request.final_status ===
      'amended' && (
      <button
        className="approve-btn"
        onClick={() =>
          resubmitRequest(
            request.id
          )
        }
      >
        Resubmit
      </button>
    )}

</td>

</tr>
            ))

          )}
        </tbody>
      </table>

    </div>
  );
}

export default RequestTable;