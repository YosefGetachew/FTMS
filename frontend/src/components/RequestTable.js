import { useEffect, useState } from 'react';
import API from '../services/api';

function RequestTable() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [viewingRequest, setViewingRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await API.get(
        `/requests?role=${user.role}&email=${user.email}&id=${user.id}`
      );

      setRequests(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: '2-digit',
    });
  };

  const getInputDate = (date) => {
    if (!date) return '';
    return String(date).slice(0, 10);
  };

  const getTripDays = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';

    const days =
      Math.ceil(
        (new Date(endDate) - new Date(startDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    return days > 0 ? days : '-';
  };

  const formatStage = (stage) => {
    const stages = {
      state_minister: 'State Minister',
      protocol: 'Protocol',
      office_head: 'Office Head',
      minister: 'Minister',
      protocol_final: 'Pending Foreign Affairs Response',
      completed: 'Completed',
      traveler: 'Traveler Amendment',
      chief_executive_officer: 'Chief Executive Officer',
    };

    return stages[stage] || stage || '-';
  };

  const renderSectorDepartment = (request) => (
    <td>
      <strong>
        {request.traveler_category === 'affiliate_institution'
          ? 'Affiliate Institute'
          : request.sector || '-'}
      </strong>
      <br />
      <small>
        {request.traveler_category === 'affiliate_institution'
          ? request.organization_name || '-'
          : request.department || '-'}
      </small>
    </td>
  );

  const renderTripDate = (request) => (
    <td
      style={{
        maxWidth: '120px',
        whiteSpace: 'normal',
        lineHeight: '1.25',
      }}
    >
      <div>{formatDate(request.start_date)}</div>

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

      <div>{formatDate(request.end_date)}</div>

      <div
        style={{
          marginTop: '6px',
          color: '#2563eb',
          fontWeight: '600',
          fontSize: '12px',
        }}
      >
        {getTripDays(request.start_date, request.end_date)} Days
      </div>
    </td>
  );

  const renderStatus = (request) => (
    <span
      className={`status-badge ${
        (request.status || '')
          .toLowerCase()
          .replace(/ /g, '-')
      }`}
    >
      {request.status || '-'}
    </span>
  );

  const renderFinalStatus = (request) => {
    if (request.final_status === 'approved') {
      return (
        <span className="status-badge approved">
          Approved
        </span>
      );
    }

    if (request.final_status === 'rejected') {
      return (
        <span className="status-badge rejected">
          Rejected
        </span>
      );
    }

    return (
      <span className="status-badge pending">
        Pending
      </span>
    );
  };

  const updateStatus = async (id, status) => {
    if (updatingId) return;

    try {
      setUpdatingId(id);

      await API.put(`/requests/${id}/status`, {
        status,
        role: user.role,
        authorEmail: user.email,
      });

      setRequests((prevRequests) =>
        prevRequests.filter((request) => request.id !== id)
      );

      fetchRequests();
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          'Failed to update request status'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const amendRequest = async (id) => {
    const comment = prompt('Enter amendment comment');
    if (!comment) return;

    try {
      setUpdatingId(id);

      await API.put(`/requests/${id}/status`, {
        status: 'Amended',
        role: user.role,
        comment,
      });

      setRequests((prevRequests) =>
        prevRequests.filter((request) => request.id !== id)
      );

      fetchRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to request amendment');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateRequest = async () => {
    try {
      const data = new FormData();

      data.append(
        'travelerCategory',
        editingRequest.traveler_category || ''
      );
      data.append(
        'organizationName',
        editingRequest.organization_name || ''
      );
      data.append('fullName', editingRequest.full_name || '');
      data.append('position', editingRequest.position || '');
      data.append('department', editingRequest.department || '');
      data.append('email', editingRequest.email || '');
      data.append('phone', editingRequest.phone || '');
      data.append('country', editingRequest.country || '');
      data.append(
        'startDate',
        getInputDate(editingRequest.start_date)
      );
      data.append(
        'endDate',
        getInputDate(editingRequest.end_date)
      );
      data.append('purpose', editingRequest.purpose || '');
      data.append('sponsor', editingRequest.sponsor || '');
      data.append(
        'passportNumber',
        editingRequest.passport_number || ''
      );

      if (editingRequest.passportFile) {
        data.append('passportFile', editingRequest.passportFile);
      }

      if (editingRequest.invitationLetter) {
        data.append(
          'invitationLetter',
          editingRequest.invitationLetter
        );
      }

      if (editingRequest.torFile) {
        data.append('torFile', editingRequest.torFile);
      }

      await API.put(`/requests/${editingRequest.id}`, data);

      alert('Request updated successfully');
      setEditingRequest(null);
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to update request');
    }
  };

  const resubmitRequest = async (id) => {
    try {
      setUpdatingId(id);

      await API.put(`/requests/${id}/resubmit`);

      alert('Request resubmitted successfully');

      setRequests((prevRequests) =>
        prevRequests.filter((request) => request.id !== id)
      );

      fetchRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to resubmit request');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRequest = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this request?'
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/requests/${id}`);

      setRequests((prevRequests) =>
        prevRequests.filter((request) => request.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert('Failed to delete request');
    }
  };

  const isProtocol = user?.role === 'protocol';
  const isTraveler = user?.role === 'traveler';
  const isOfficeHead = user?.role === 'office_head';

  const canApprove = [
    'state_minister',
    'protocol',
    'office_head',
    'chief_executive_officer',
    'minister',
    'admin',
  ].includes(user?.role);

  const canReject = [
    'state_minister',
    'office_head',
    'chief_executive_officer',
    'minister',
    'admin',
  ].includes(user?.role);

  const canAmend = user?.role === 'protocol';
  const canDelete = user?.role === 'admin';
  const canViewPdf = ['protocol', 'admin'].includes(user?.role);

  const submittedRequests = requests.filter(
    (request) =>
      request.final_status === 'pending' &&
      request.current_stage !== 'completed'
  );

  const historicalRequests = requests.filter((request) => {
    const isHistorical =
      request.final_status === 'approved' ||
      request.final_status === 'rejected' ||
      request.current_stage === 'completed';

    if (!isHistorical) return false;

    const keyword = search.toLowerCase();

    return (
      request.full_name?.toLowerCase().includes(keyword) ||
      request.department?.toLowerCase().includes(keyword) ||
      request.organization_name?.toLowerCase().includes(keyword) ||
      request.country?.toLowerCase().includes(keyword) ||
      request.purpose?.toLowerCase().includes(keyword) ||
      request.status?.toLowerCase().includes(keyword) ||
      request.final_status?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="table-container">
      <div className="table-header">
        <h2>Submitted Requests</h2>

        <input
          type="text"
          placeholder="Search historical travel..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Sector/ Department</th>
            <th>Destination Country</th>
            <th>Travel Purpose</th>
            <th>Travel Date</th>
            <th>Status</th>
            <th>Current Stage</th>
            <th>Amendment Comment</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {submittedRequests.length === 0 ? (
            <tr>
              <td colSpan="9">No submitted requests found</td>
            </tr>
          ) : (
            submittedRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.full_name || '-'}</td>

                {renderSectorDepartment(request)}

                <td
                  style={{
                    maxWidth: '90px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                  }}
                >
                  {request.country || '-'}
                </td>

                <td
                  style={{
                    maxWidth: '220px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.3',
                  }}
                >
                  {request.purpose || '-'}
                </td>

                {renderTripDate(request)}

                <td>{renderStatus(request)}</td>

                <td>{formatStage(request.current_stage)}</td>

                <td
                  style={{
                    maxWidth: '220px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    color:
                      request.final_status === 'amended'
                        ? '#b45309'
                        : '#64748b',
                    fontWeight:
                      request.final_status === 'amended'
                        ? '600'
                        : '400',
                  }}
                >
                  {request.final_status === 'amended'
                    ? request.amendment_comment ||
                      'Amendment requested'
                    : '-'}
                </td>

                <td>
                  {isProtocol &&
                    request.current_stage === 'protocol' && (
                      <button
                        className="pdf-btn"
                        disabled={updatingId === request.id}
                        onClick={() => setViewingRequest(request)}
                      >
                        View
                      </button>
                    )}

                  {canApprove &&
                    request.current_stage !== 'completed' &&
                    request.current_stage !== 'protocol_final' && (
                      <button
                        className="approve-btn"
                        disabled={updatingId === request.id}
                        onClick={() =>
                          updateStatus(request.id, 'Approved')
                        }
                      >
                        {updatingId === request.id
                          ? 'Processing...'
                          : user.role === 'protocol'
                          ? 'Clear'
                          : 'Approve'}
                      </button>
                    )}

                  {isOfficeHead &&
                    request.current_stage === 'office_head' &&
                    request.final_status !== 'approved' &&
                    request.final_status !== 'rejected' && (
                      <button
                        className="edit-btn"
                        disabled={updatingId === request.id}
                        onClick={() =>
                          updateStatus(
                            request.id,
                            'ForwardedToMinister'
                          )
                        }
                      >
                        {updatingId === request.id
                          ? 'Processing...'
                          : 'Forward to Minister'}
                      </button>
                    )}

                  {canReject &&
                    request.current_stage !== 'completed' &&
                    request.current_stage !== 'protocol_final' && (
                      <button
                        className="reject-btn"
                        disabled={updatingId === request.id}
                        onClick={() =>
                          updateStatus(request.id, 'Rejected')
                        }
                      >
                        {updatingId === request.id
                          ? 'Processing...'
                          : 'Reject'}
                      </button>
                    )}

                  {canAmend &&
                    request.current_stage === 'protocol' && (
                      <button
                        className="edit-btn"
                        disabled={updatingId === request.id}
                        onClick={() => amendRequest(request.id)}
                      >
                        Amend
                      </button>
                    )}

                  {isTraveler &&
                    request.final_status === 'amended' && (
                      <>
                        <button
                          className="edit-btn"
                          disabled={updatingId === request.id}
                          onClick={() => setEditingRequest(request)}
                        >
                          Edit
                        </button>

                        <button
                          className="approve-btn"
                          disabled={updatingId === request.id}
                          onClick={() =>
                            resubmitRequest(request.id)
                          }
                        >
                          {updatingId === request.id
                            ? 'Processing...'
                            : 'Resubmit'}
                        </button>
                      </>
                    )}

                  {user?.role === 'protocol' &&
                    request.current_stage === 'protocol_final' &&
                    request.final_status === 'pending' && (
                      <>
                        <button
                          className="approve-btn"
                          disabled={updatingId === request.id}
                          onClick={() =>
                            updateStatus(
                              request.id,
                              'ForeignAffairsApproved'
                            )
                          }
                        >
                          {updatingId === request.id
                            ? 'Processing...'
                            : 'Foreign Affairs Approved'}
                        </button>

                        <button
                          className="reject-btn"
                          disabled={updatingId === request.id}
                          onClick={() =>
                            updateStatus(
                              request.id,
                              'ForeignAffairsRejected'
                            )
                          }
                        >
                          {updatingId === request.id
                            ? 'Processing...'
                            : 'Foreign Affairs Rejected'}
                        </button>
                      </>
                    )}

                  {canViewPdf && (
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
                  )}

                  {canDelete && (
                    <button
                      className="delete-btn"
                      disabled={updatingId === request.id}
                      onClick={() => deleteRequest(request.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2
        style={{
          marginTop: '40px',
          marginBottom: '15px',
        }}
      >
        Historical Travel
      </h2>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>
              Sector/
              <br />
              Department
            </th>
            <th>Destination Country</th>
            <th>Travel Purpose</th>
            <th>Travel Date</th>
            <th>Final Status</th>
            {canViewPdf && <th>PDF</th>}
          </tr>
        </thead>

        <tbody>
          {historicalRequests.length === 0 ? (
            <tr>
              <td colSpan={canViewPdf ? '7' : '6'}>
                No historical requests found
              </td>
            </tr>
          ) : (
            historicalRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.full_name || '-'}</td>

                {renderSectorDepartment(request)}

                <td>{request.country || '-'}</td>

                <td
                  style={{
                    maxWidth: '260px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {request.purpose || '-'}
                </td>

                {renderTripDate(request)}

                <td>{renderFinalStatus(request)}</td>

                {canViewPdf && (
                  <td>
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
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {viewingRequest && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <h2>Travel Request Details</h2>

            <div className="request-detail-grid">
              <div>
                <strong>Traveler Category</strong>
                <p>{viewingRequest?.traveler_category || '-'}</p>
              </div>

              <div>
                <strong>Organization</strong>
                <p>{viewingRequest?.organization_name || '-'}</p>
              </div>

              <div>
                <strong>Traveler Name</strong>
                <p>{viewingRequest?.full_name || '-'}</p>
              </div>

              <div>
                <strong>Position</strong>
                <p>{viewingRequest?.position || '-'}</p>
              </div>

              <div>
                <strong>Department</strong>
                <p>{viewingRequest?.department || '-'}</p>
              </div>

              <div>
                <strong>Email</strong>
                <p>{viewingRequest?.email || '-'}</p>
              </div>

              <div>
                <strong>Phone</strong>
                <p>{viewingRequest?.phone || '-'}</p>
              </div>

              <div>
                <strong>Destination Country</strong>
                <p>{viewingRequest?.country || '-'}</p>
              </div>

              <div>
                <strong>Start Date</strong>
                <p>{formatDate(viewingRequest?.start_date)}</p>
              </div>

              <div>
                <strong>End Date</strong>
                <p>{formatDate(viewingRequest?.end_date)}</p>
              </div>

              <div>
                <strong>Number of Days</strong>
                <p>
                  {getTripDays(
                    viewingRequest?.start_date,
                    viewingRequest?.end_date
                  )}{' '}
                  Days
                </p>
              </div>

              <div>
                <strong>Sponsor</strong>
                <p>{viewingRequest?.sponsor || '-'}</p>
              </div>

              <div>
                <strong>Passport Number</strong>
                <p>{viewingRequest?.passport_number || '-'}</p>
              </div>

              <div>
                <strong>Status</strong>
                <p>{viewingRequest?.status || '-'}</p>
              </div>

              <div className="detail-full">
                <strong>Purpose of Travel</strong>
                <p>{viewingRequest?.purpose || '-'}</p>
              </div>
            </div>

            <h3 style={{ marginTop: '25px' }}>
              Attached Documents
            </h3>

            <div className="attachment-review">
              {viewingRequest?.passport_file ? (
                <a
                  href={`http://localhost:5000/uploads/${viewingRequest.passport_file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-card"
                >
                  <div className="attachment-title">
                    Passport Copy
                  </div>
                  <div className="attachment-name">
                    {viewingRequest.passport_file}
                  </div>
                </a>
              ) : (
                <div className="attachment-empty">
                  No Passport Uploaded
                </div>
              )}

              {viewingRequest?.invitation_letter ? (
                <a
                  href={`http://localhost:5000/uploads/${viewingRequest.invitation_letter}`}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-card"
                >
                  <div className="attachment-title">
                    Invitation Letter
                  </div>
                  <div className="attachment-name">
                    {viewingRequest.invitation_letter}
                  </div>
                </a>
              ) : (
                <div className="attachment-empty">
                  No Invitation Letter Uploaded
                </div>
              )}

              {viewingRequest?.tor_file ? (
                <a
                  href={`http://localhost:5000/uploads/${viewingRequest.tor_file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-card"
                >
                  <div className="attachment-title">
                    TOR Document
                  </div>
                  <div className="attachment-name">
                    {viewingRequest.tor_file}
                  </div>
                </a>
              ) : (
                <div className="attachment-empty">
                  No TOR Uploaded
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="approve-btn"
                disabled={updatingId === viewingRequest.id}
                onClick={() => {
                  updateStatus(viewingRequest.id, 'Approved');
                  setViewingRequest(null);
                }}
              >
                Clear
              </button>

              <button
                className="edit-btn"
                disabled={updatingId === viewingRequest.id}
                onClick={() => {
                  amendRequest(viewingRequest.id);
                  setViewingRequest(null);
                }}
              >
                Amend
              </button>

              <button
                className="delete-btn"
                onClick={() => setViewingRequest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRequest && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <h2>Edit Amended Request</h2>

            <div className="notice-error">
              <strong>Protocol Comment:</strong>
              <br />
              {editingRequest.amendment_comment ||
                'Please update the request as required.'}
            </div>

            <div className="request-detail-grid">
              <div>
                <strong>Traveler Category</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.traveler_category || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      traveler_category: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Organization Name</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.organization_name || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      organization_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Full Name</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.full_name || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      full_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Position</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.position || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      position: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Department</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.department || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      department: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Email</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.email || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Phone</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.phone || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Destination Country</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.country || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      country: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Start Date</strong>
                <input
                  type="date"
                  className="ministry-input"
                  value={getInputDate(editingRequest.start_date)}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      start_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>End Date</strong>
                <input
                  type="date"
                  className="ministry-input"
                  value={getInputDate(editingRequest.end_date)}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      end_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Sponsor</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.sponsor || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      sponsor: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Passport Number</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.passport_number || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      passport_number: e.target.value,
                    })
                  }
                />
              </div>

              <div className="detail-full">
                <strong>Purpose of Travel</strong>
                <textarea
                  className="ministry-input"
                  rows={4}
                  value={editingRequest.purpose || ''}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      purpose: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <h3 style={{ marginTop: '25px' }}>
              Update Attachments
            </h3>

            <div className="attachment-review">
              <div className="attachment-empty">
                <strong>Passport Copy</strong>
                <br />
                Current:{' '}
                {editingRequest.passport_file || 'Not uploaded'}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      passportFile: e.target.files[0],
                    })
                  }
                />
              </div>

              <div className="attachment-empty">
                <strong>Invitation Letter</strong>
                <br />
                Current:{' '}
                {editingRequest.invitation_letter ||
                  'Not uploaded'}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      invitationLetter: e.target.files[0],
                    })
                  }
                />
              </div>

              <div className="attachment-empty">
                <strong>TOR Document</strong>
                <br />
                Current: {editingRequest.tor_file || 'Not uploaded'}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      torFile: e.target.files[0],
                    })
                  }
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="approve-btn"
                onClick={updateRequest}
              >
                Save Changes
              </button>

              <button
                className="delete-btn"
                onClick={() => setEditingRequest(null)}
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