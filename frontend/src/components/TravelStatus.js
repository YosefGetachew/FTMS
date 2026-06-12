import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import './TravelStatus.css';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (_error) {
    return {};
  }
};

const stageLabels = {
  expert_preparation: 'Expert',
  lead_executive_review: 'Lead Executive Officer',
  state_minister_review: 'State Minister',
  ceo_review: 'CEO',
  office_head_review: "Head of the Minister's Office",
  protocol_clearance: 'Protocol Clearance',
  office_head_final: 'Office Head',
  minister_review: 'Minister Approval',
  pm_office_submission: 'Protocol Submission',
  pm_office_followup: 'PM Office',
  foreign_affairs_followup: 'PM Office',
  completed: 'Completed',
};

const getStageLabel = (stage, request) => {
  if (
    request?.traveler_category === 'affiliate_institution' &&
    stage === 'office_head_review'
  ) {
    return 'Director General';
  }

  if (stage === 'office_head_final') {
    return "Head of the Minister's Office";
  }

  if (stage === 'pm_office_submission') {
    return 'Protocol Submission to PM Office';
  }

  return stageLabels[stage] || stage;
};

const workflowLabels = {
  sector_structure: 'Sector',
  ceo_structure: 'CEO',
  office_head_structure: "Head of the Minister's Office",
  affiliate_institution: 'Affiliate Institute',
};

const workflowStages = {
  sector_structure: [
    'expert_preparation',
    'lead_executive_review',
    'state_minister_review',
    'protocol_clearance',
    'office_head_final',
    'pm_office_submission',
    'pm_office_followup',
    'completed',
  ],
  ceo_structure: [
    'expert_preparation',
    'lead_executive_review',
    'ceo_review',
    'protocol_clearance',
    'office_head_final',
    'pm_office_submission',
    'pm_office_followup',
    'completed',
  ],
  office_head_structure: [
    'expert_preparation',
    'lead_executive_review',
    'office_head_review',
    'protocol_clearance',
    'office_head_final',
    'pm_office_submission',
    'pm_office_followup',
    'completed',
  ],
  affiliate_institution: [
    'expert_preparation',
    'office_head_review',
    'protocol_clearance',
    'office_head_final',
    'pm_office_submission',
    'pm_office_followup',
    'completed',
  ],
};

const roleAliases = {
  ceo: ['ceo', 'chief_executive_officer'],
  chief_executive_officer: ['chief_executive_officer', 'ceo'],
  lead_executive: ['lead_executive', 'lead_executive_officer'],
  lead_executive_officer: ['lead_executive_officer', 'lead_executive'],
  state_minister: ['state_minister'],
  office_head: ['office_head'],
  pm_office: ['pm_office'],
};

const normalizeText = (value) => String(value || '').toLowerCase();

const shouldShowMinisterStage = (request) => {
  const stage = normalizeText(request?.current_stage);
  const status = normalizeText(request?.status);

  return (
    stage === 'minister_review' ||
    status.includes('minister approved') ||
    status.includes('forwarded to minister')
  );
};

const formatDate = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

function TravelStatus() {
  const user = useMemo(() => getCurrentUser(), []);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setNotice(null);

      const aliases = [...new Set(roleAliases[user.role] || [user.role])].filter(Boolean);

      const responses = await Promise.allSettled(
        aliases.map((role) => {
          const params = new URLSearchParams({
            role,
            email: user.email || '',
            id: user.id ? String(user.id) : '',
          });

          return API.get(`/requests?${params.toString()}`);
        })
      );

      const successful = responses
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value.data || []);

      if (!successful.length) {
        const failed = responses.find((result) => result.status === 'rejected');
        if (failed) throw failed.reason;
      }

      const merged = new Map();
      successful.forEach((request) => merged.set(request.id, request));

      const nextRequests = [...merged.values()].sort((a, b) => b.id - a.id);
      setRequests(nextRequests);

      if (!selectedRequestId && nextRequests.length) {
        setSelectedRequestId(String(nextRequests[0].id));
      }
    } catch (error) {
      console.error(error);
      setNotice({
        type: 'error',
        message:
          error?.response?.data?.error ||
          'Failed to load travel status. Please confirm that the API server is running.',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedRequestId, user.email, user.id, user.role]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    const keyword = normalizeText(search);

    if (!keyword) return requests;

    return requests.filter((request) =>
      [
        request.full_name,
        request.country,
        request.sector,
        request.department,
        request.organization_name,
        request.current_stage,
        request.final_status,
        request.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [requests, search]);

  const selectedRequest = useMemo(
    () =>
      requests.find((request) => String(request.id) === String(selectedRequestId)) ||
      filteredRequests[0] ||
      null,
    [requests, selectedRequestId, filteredRequests]
  );

  const diagramStages = useMemo(() => {
    if (!selectedRequest) return [];

    const workflowType =
      selectedRequest.traveler_category === 'affiliate_institution'
        ? 'affiliate_institution'
        : selectedRequest.workflow_type || 'office_head_structure';
    const baseStages = workflowStages[workflowType] || workflowStages.office_head_structure;
    const stages = shouldShowMinisterStage(selectedRequest)
      ? baseStages.flatMap((stage) =>
          stage === 'pm_office_submission'
            ? ['minister_review', stage]
            : [stage]
        )
      : baseStages;
    const currentStage = selectedRequest.current_stage;
    const finalStatus = selectedRequest.final_status;
    const currentIndex =
      currentStage === 'completed'
        ? stages.length - 1
        : Math.max(stages.indexOf(currentStage), 0);

    return stages.map((stage, index) => {
      let state = 'upcoming';

      if (finalStatus === 'rejected') {
        state = index <= currentIndex ? 'rejected' : 'upcoming';
      } else if (finalStatus === 'amended' && stage === 'expert_preparation') {
        state = 'returned';
      } else if (index < currentIndex || finalStatus === 'approved') {
        state = 'complete';
      } else if (index === currentIndex) {
        state = 'current';
      }

      return {
        stage,
        label: getStageLabel(stage, selectedRequest),
        state,
      };
    });
  }, [selectedRequest]);

  const summary = useMemo(
    () => [
      {
        label: 'Visible Requests',
        value: requests.length,
        helper: 'Available in your role',
      },
      {
        label: 'Pending',
        value: requests.filter((request) => request.final_status === 'pending').length,
        helper: 'Still in workflow',
      },
      {
        label: 'Returned',
        value: requests.filter((request) => request.final_status === 'amended').length,
        helper: 'Needs correction',
      },
      {
        label: 'Completed',
        value: requests.filter((request) =>
          ['approved', 'rejected'].includes(request.final_status) ||
          request.current_stage === 'completed'
        ).length,
        helper: 'PM Office status completed',
      },
    ],
    [requests]
  );

  return (
    <div className="travel-status-page">
      <div className="travel-status-header">
        <div>
          <span className="travel-status-kicker">Request Progress</span>
          <h2>Travel Status</h2>
          <p>
            Select a travel request to see its approval path and current position
            in the workflow.
          </p>
        </div>

        <button
          type="button"
          className="travel-status-refresh"
          onClick={fetchRequests}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="travel-status-summary-grid">
        {summary.map((item) => (
          <div className="travel-status-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </div>
        ))}
      </div>

      {notice && (
        <div className={`travel-status-notice ${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="travel-status-controls">
        <label>
          Search Requests
          <input
            type="search"
            placeholder="Search traveler, country, sector..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label>
          Request
          <select
            value={selectedRequestId}
            onChange={(event) => setSelectedRequestId(event.target.value)}
          >
            {filteredRequests.length === 0 ? (
              <option value="">No requests available</option>
            ) : (
              filteredRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  #{request.id} - {request.full_name || 'Traveler'} -{' '}
                  {request.country || 'Destination'}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {selectedRequest ? (
        <div className="travel-status-layout">
          <div className="travel-status-diagram-card">
            <div className="travel-status-card-header">
              <div>
                <h3>
                  {workflowLabels[
                    selectedRequest.traveler_category === 'affiliate_institution'
                      ? 'affiliate_institution'
                      : selectedRequest.workflow_type
                  ] || 'Workflow'} Approval Path
                </h3>
                <p>{selectedRequest.status || 'Request status not set'}</p>
              </div>
            </div>

            <div className="travel-status-diagram">
              {diagramStages.map((item, index) => (
                <div className="travel-status-step-wrap" key={item.stage}>
                  <div className={`travel-status-step ${item.state}`}>
                    <span>{index + 1}</span>
                    <strong>{item.label}</strong>
                    <small>{item.state.replace('_', ' ')}</small>
                  </div>

                  {index < diagramStages.length - 1 && (
                    <div className={`travel-status-connector ${item.state}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="travel-status-detail-card">
            <h3>Selected Request</h3>

            <div className="travel-status-detail-list">
              <div>
                <span>Traveler</span>
                <strong>{selectedRequest.full_name || '-'}</strong>
              </div>
              <div>
                <span>Destination</span>
                <strong>{selectedRequest.country || '-'}</strong>
              </div>
              <div>
                <span>Travel Date</span>
                <strong>
                  {formatDate(selectedRequest.start_date)} to{' '}
                  {formatDate(selectedRequest.end_date)}
                </strong>
              </div>
              <div>
                <span>
                  {selectedRequest.traveler_category === 'affiliate_institution'
                    ? 'Affiliate Institute'
                    : 'Structure'}
                </span>
                <strong>
                  {selectedRequest.traveler_category === 'affiliate_institution'
                    ? selectedRequest.organization_name || selectedRequest.sector || '-'
                    : selectedRequest.sector || '-'}
                </strong>
              </div>
              <div>
                <span>
                  {selectedRequest.traveler_category === 'affiliate_institution'
                    ? 'Approver Branch'
                    : 'Lead Executive Office'}
                </span>
                <strong>
                  {selectedRequest.traveler_category === 'affiliate_institution'
                    ? 'Director General'
                    : selectedRequest.department || '-'}
                </strong>
              </div>
              <div>
                <span>Final Status</span>
                <strong>{selectedRequest.final_status || '-'}</strong>
              </div>
              <div>
                <span>Current Stage</span>
                <strong>
                  {getStageLabel(selectedRequest.current_stage, selectedRequest) || '-'}
                </strong>
              </div>
              <div>
                <span>Comment</span>
                <strong>
                  {selectedRequest.amendment_comment ||
                    selectedRequest.decision_comment ||
                    selectedRequest.foreign_affairs_comment ||
                    '-'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="travel-status-empty">
          <strong>No travel requests found</strong>
          <span>There are no requests available for your current role.</span>
        </div>
      )}
    </div>
  );
}

export default TravelStatus;
