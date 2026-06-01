import { useEffect, useMemo, useState } from 'react';
import API from '../services/api';

function AuditTrail() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedTraveler, setSelectedTraveler] = useState('');

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    try {
      const response = await API.get('/audit-trail');
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load audit trail');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
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

  const formatFinalStatus = (status) => {
    const statuses = {
      approved: 'Approved',
      rejected: 'Rejected',
      pending: 'Pending',
      amended: 'Amended',
    };

    return statuses[status] || status || '-';
  };

  const travelers = useMemo(() => {
    const names = new Set();

    auditLogs.forEach((log) => {
      if (log.full_name) {
        names.add(log.full_name);
      }
    });

    return Array.from(names).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    if (!selectedTraveler) return auditLogs;

    return auditLogs.filter(
      (log) => log.full_name === selectedTraveler
    );
  }, [auditLogs, selectedTraveler]);

  const selectedRequest =
    filteredLogs.length > 0 ? filteredLogs[0] : null;

  return (
    <div className="table-container">
      <h2>Audit Trail</h2>

      <div className="table-header">
        <select
          className="search-input"
          value={selectedTraveler}
          onChange={(e) =>
            setSelectedTraveler(e.target.value)
          }
        >
          <option value="">Select Traveler</option>

          {travelers.map((traveler) => (
            <option key={traveler} value={traveler}>
              {traveler}
            </option>
          ))}
        </select>
      </div>

      {selectedRequest && (
        <div
          className="settings-container"
          style={{ marginBottom: '20px' }}
        >
          <h3>Current Travel Status</h3>

          <table>
            <tbody>
              <tr>
                <th>Traveler</th>
                <td>{selectedRequest.full_name || '-'}</td>
              </tr>

              <tr>
                <th>Country</th>
                <td>{selectedRequest.country || '-'}</td>
              </tr>

              <tr>
                <th>Current Stage</th>
                <td>
                  {formatStage(selectedRequest.current_stage)}
                </td>
              </tr>

              <tr>
                <th>Current Status</th>
                <td>
                  {selectedRequest.current_status || '-'}
                </td>
              </tr>

              <tr>
                <th>Final Status</th>
                <td>
                  {formatFinalStatus(
                    selectedRequest.final_status
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <h3>Audit History</h3>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Request ID</th>
            <th>Traveler</th>
            <th>Country</th>
            <th>Action</th>
            <th>Actor Role</th>
            <th>Actor Email</th>
            <th>Old Stage</th>
            <th>New Stage</th>
            <th>Comment</th>
          </tr>
        </thead>

        <tbody>
          {filteredLogs.length === 0 ? (
            <tr>
              <td colSpan="10">
                No audit records found
              </td>
            </tr>
          ) : (
            filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.created_at)}</td>
                <td>{log.request_id || '-'}</td>
                <td>{log.full_name || '-'}</td>
                <td>{log.country || '-'}</td>
                <td>{log.action || '-'}</td>
                <td>{formatStage(log.actor_role)}</td>
                <td>{log.actor_email || '-'}</td>
                <td>{formatStage(log.old_stage)}</td>
                <td>{formatStage(log.new_stage)}</td>
                <td>{log.comment || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AuditTrail;