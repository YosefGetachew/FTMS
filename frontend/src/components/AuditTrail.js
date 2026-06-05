import { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import './AuditTrail.css';

const stageLabels = {
  expert_preparation: 'Expert Preparation',
  director_review: 'Lead Executive Officer Review',
  lead_executive_review: 'Lead Executive Officer Review',
  state_minister_review: 'State Minister Review',
  ceo_review: 'CEO Review',
  office_head_review: 'Office Head Review',
  protocol_clearance: 'Protocol Clearance',
  office_head_final: 'Office Head Final Decision',
  minister_review: 'Minister Approval',
  foreign_affairs_followup: 'Foreign Affairs Follow-up',
  completed: 'Completed',
  traveler: 'Traveler Amendment',
};

const roleLabels = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  traveler: 'Traveler',
  expert: 'Expert',
  state_minister: 'State Minister',
  lead_executive_officer: 'Lead Executive Officer',
  lead_executive: 'Lead Executive Officer',
  chief_executive_officer: 'CEO',
  ceo: 'CEO',
  office_head: "Head of the Minister's Office",
  protocol: 'Protocol',
  minister: 'Minister',
};

const statusLabels = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
  amended: 'Amended',
};

const actionLabels = {
  approve: 'Accepted',
  approved: 'Accepted',
  reject: 'Rejected',
  rejected: 'Rejected',
  amend: 'Returned for Correction',
  resubmit: 'Resubmitted',
  submit: 'Submitted',
};

const formatLookup = (lookup, value) => lookup[value] || value || '-';

const formatDate = (date) => {
  if (!date) return '-';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleString();
};

function AuditTrail() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedTraveler, setSelectedTraveler] = useState('');
  const [selectedRequest, setSelectedRequest] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await API.get('/audit-trail');
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.response?.data?.error ||
          'Failed to load audit trail. Please confirm that the API server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const travelers = useMemo(() => {
    const names = new Set();

    auditLogs.forEach((log) => {
      if (log.full_name) names.add(log.full_name);
    });

    return Array.from(names).sort();
  }, [auditLogs]);

  const requestOptions = useMemo(() => {
    const requests = new Map();

    auditLogs.forEach((log) => {
      if (!log.request_id) return;

      requests.set(log.request_id, {
        id: log.request_id,
        label: `#${log.request_id} - ${log.full_name || 'Unknown Traveler'}${
          log.country ? ` (${log.country})` : ''
        }`,
      });
    });

    return Array.from(requests.values()).sort((a, b) => b.id - a.id);
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const matchesTraveler =
        !selectedTraveler || log.full_name === selectedTraveler;

      const matchesRequest =
        !selectedRequest || String(log.request_id) === selectedRequest;

      const matchesSearch =
        !search ||
        [
          log.full_name,
          log.country,
          log.action,
          log.actor_role,
          log.actor_email,
          log.old_stage,
          log.new_stage,
          log.comment,
          log.final_status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search);

      return matchesTraveler && matchesRequest && matchesSearch;
    });
  }, [auditLogs, selectedTraveler, selectedRequest, searchTerm]);

  const latestRequest = filteredLogs[0] || null;

  const summaryCards = useMemo(
    () => [
      {
        label: 'Audit Records',
        value: auditLogs.length,
        helper: 'Total system decisions recorded',
      },
      {
        label: 'Travel Requests',
        value: requestOptions.length,
        helper: 'Requests with audit history',
      },
      {
        label: 'Actors',
        value: new Set(auditLogs.map((log) => log.actor_email).filter(Boolean))
          .size,
        helper: 'Unique approvers or users',
      },
      {
        label: 'Visible Records',
        value: filteredLogs.length,
        helper: 'Records matching current filters',
      },
    ],
    [auditLogs, requestOptions.length, filteredLogs.length]
  );

  return (
    <div className="audit-trail-page">
      <div className="audit-trail-header">
        <div>
          <span className="audit-trail-kicker">System Accountability</span>
          <h2>Audit Trail</h2>
          <p>
            Review every recorded travel-request action, actor, decision stage,
            and comment.
          </p>
        </div>

        <button
          type="button"
          className="audit-refresh-btn"
          onClick={loadAuditTrail}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="audit-summary-grid">
        {summaryCards.map((card) => (
          <div className="audit-summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="audit-error-notice">{errorMessage}</div>
      )}

      <div className="audit-filter-card">
        <label>
          Traveler
          <select
            value={selectedTraveler}
            onChange={(event) => setSelectedTraveler(event.target.value)}
          >
            <option value="">All Travelers</option>
            {travelers.map((traveler) => (
              <option key={traveler} value={traveler}>
                {traveler}
              </option>
            ))}
          </select>
        </label>

        <label>
          Request
          <select
            value={selectedRequest}
            onChange={(event) => setSelectedRequest(event.target.value)}
          >
            <option value="">All Requests</option>
            {requestOptions.map((request) => (
              <option key={request.id} value={request.id}>
                {request.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Search
          <input
            type="search"
            placeholder="Search action, actor, stage, comment..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
      </div>

      {latestRequest && (
        <div className="audit-current-card">
          <div>
            <span>Current Request Snapshot</span>
            <strong>{latestRequest.full_name || '-'}</strong>
            <small>{latestRequest.country || 'Destination not set'}</small>
          </div>

          <div>
            <span>Current Stage</span>
            <strong>{formatLookup(stageLabels, latestRequest.current_stage)}</strong>
            <small>{latestRequest.current_status || 'No current status text'}</small>
          </div>

          <div>
            <span>Final Status</span>
            <strong>{formatLookup(statusLabels, latestRequest.final_status)}</strong>
            <small>Request #{latestRequest.request_id || '-'}</small>
          </div>
        </div>
      )}

      <div className="audit-table-card">
        <div className="audit-table-header">
          <h3>Audit History</h3>
          <span>{filteredLogs.length} record{filteredLogs.length === 1 ? '' : 's'}</span>
        </div>

        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Request</th>
                <th>Traveler</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Stage Change</th>
                <th>Status Change</th>
                <th>Comment</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="audit-empty">
                    Loading audit records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="audit-empty">
                    No audit records found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.created_at)}</td>
                    <td>
                      <div className="audit-request-cell">
                        <strong>#{log.request_id || '-'}</strong>
                        <span>{log.country || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="audit-request-cell">
                        <strong>{log.full_name || '-'}</strong>
                        <span>{log.traveler_email || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="audit-action-pill">
                        {formatLookup(actionLabels, log.action)}
                      </span>
                    </td>
                    <td>
                      <div className="audit-request-cell">
                        <strong>{formatLookup(roleLabels, log.actor_role)}</strong>
                        <span>{log.actor_email || '-'}</span>
                      </div>
                    </td>
                    <td>
                      {formatLookup(stageLabels, log.old_stage)} to{' '}
                      {formatLookup(stageLabels, log.new_stage)}
                    </td>
                    <td>
                      {formatLookup(statusLabels, log.old_status)} to{' '}
                      {formatLookup(statusLabels, log.new_status)}
                    </td>
                    <td className="audit-comment-cell">{log.comment || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditTrail;
