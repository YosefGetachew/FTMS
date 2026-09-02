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
  project_coordinator_review: 'Project Coordinator',
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
  minister_structure: 'Minister',
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
  sector_project: [
    'expert_preparation',
    'project_coordinator_review',
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
  ceo_project: [
    'expert_preparation',
    'project_coordinator_review',
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
    'protocol_clearance',
    'office_head_final',
    'pm_office_submission',
    'pm_office_followup',
    'completed',
  ],
  office_head_project: [
    'expert_preparation',
    'project_coordinator_review',
    'protocol_clearance',
    'office_head_final',
    'pm_office_submission',
    'pm_office_followup',
    'completed',
  ],
  minister_structure: [
    'expert_preparation',
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
  ceo: ['ceo', 'chief_executive_officer', 'traveler'],
  chief_executive_officer: ['chief_executive_officer', 'ceo', 'traveler'],
  lead_executive: ['lead_executive', 'lead_executive_officer', 'traveler'],
  lead_executive_officer: ['lead_executive_officer', 'lead_executive', 'traveler'],
  project_coordinator: ['project_coordinator', 'traveler'],
  state_minister: ['state_minister', 'traveler'],
  director_general: ['director_general', 'traveler'],
  office_head: ['office_head', 'traveler'],
  minister: ['minister', 'traveler'],
  protocol: ['protocol', 'traveler'],
  pm_office: ['pm_office', 'traveler'],
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

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const getDayCount = (date) => {
  if (!date) return null;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  const diff = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const formatPendingDays = (days) => {
  if (days === null || days === undefined) return 'Pending date unavailable';
  if (days === 0) return 'Pending today';
  if (days === 1) return 'Pending for 1 day';
  return `Pending for ${days} days`;
};

const stateLabel = (state) => {
  const labels = {
    complete: 'Done',
    current: 'Current',
    upcoming: 'Upcoming',
    returned: 'Returned',
    rejected: 'Rejected',
    optional: 'Optional',
  };

  return labels[state] || state;
};

const formatTimelineDate = (date) => {
  const formatted = formatDate(date);
  return formatted === '-' ? 'Date unavailable' : formatted;
};

const getApproverName = (entry) =>
  entry?.actor_full_name ||
  entry?.actor_email ||
  (entry?.actor_role ? getStageLabel(entry.actor_role) : '');

const getRequestStatusGroup = (request) => {
  if (request?.current_stage === 'completed') return 'completed';

  const finalStatus = normalizeText(request?.final_status);

  if (finalStatus === 'approved' || finalStatus === 'rejected') return 'completed';
  if (finalStatus === 'amended') return 'returned';

  return 'pending';
};

const formatStatusGroup = (value) => {
  const labels = {
    all: 'All Requests',
    pending: 'Pending',
    returned: 'Returned',
    completed: 'Completed',
  };

  return labels[value] || value;
};

function TravelStatus() {
  const user = useMemo(() => getCurrentUser(), []);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [auditTrail, setAuditTrail] = useState([]);
  const [workflowApprovers, setWorkflowApprovers] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  useEffect(() => {
    if (!selectedRequestId) {
      setAuditTrail([]);
      setWorkflowApprovers([]);
      return;
    }

    let active = true;

    const fetchAuditTrail = async () => {
      try {
        setAuditLoading(true);
        const [auditResponse, approverResponse] = await Promise.all([
          API.get(`/requests/${selectedRequestId}/audit-trail`),
          API.get(`/requests/${selectedRequestId}/workflow-approvers`),
        ]);

        if (active) {
          setAuditTrail(auditResponse.data || []);
          setWorkflowApprovers(approverResponse.data || []);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setAuditTrail([]);
          setWorkflowApprovers([]);
        }
      } finally {
        if (active) {
          setAuditLoading(false);
        }
      }
    };

    fetchAuditTrail();

    return () => {
      active = false;
    };
  }, [selectedRequestId]);

  const filteredRequests = useMemo(() => {
    const keyword = normalizeText(search);

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === 'all' || getRequestStatusGroup(request) === statusFilter;
      const matchesSearch =
        !keyword ||
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
          .includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  useEffect(() => {
    if (!filteredRequests.length) {
      if (selectedRequestId) {
        setSelectedRequestId('');
      }

      return;
    }

    const selectedIsVisible = filteredRequests.some(
      (request) => String(request.id) === String(selectedRequestId)
    );

    if (!selectedIsVisible) {
      setSelectedRequestId(String(filteredRequests[0].id));
    }
  }, [filteredRequests, selectedRequestId]);

  const selectedRequest = useMemo(
    () =>
      filteredRequests.find((request) => String(request.id) === String(selectedRequestId)) ||
      filteredRequests[0] ||
      null,
    [selectedRequestId, filteredRequests]
  );

  const stageTimeline = useMemo(() => {
    const byEnteredStage = new Map();
    const byApprovedStage = new Map();
    const byApproverStage = new Map();

    auditTrail.forEach((entry) => {
      if (entry.new_stage) {
        byEnteredStage.set(entry.new_stage, entry.created_at);
      }

      if (entry.old_stage) {
        byApprovedStage.set(entry.old_stage, entry.created_at);
        byApproverStage.set(entry.old_stage, getApproverName(entry));
      }
    });

    return {
      entered: byEnteredStage,
      approved: byApprovedStage,
      approver: byApproverStage,
    };
  }, [auditTrail]);

  const approversByStage = useMemo(() => {
    const next = new Map();

    workflowApprovers.forEach((item) => {
      if (item.stage) {
        next.set(item.stage, item.full_name || item.email || item.role || '');
      }
    });

    return next;
  }, [workflowApprovers]);

  const diagramStages = useMemo(() => {
    if (!selectedRequest) return [];

    const workflowType =
      selectedRequest.traveler_category === 'affiliate_institution'
        ? 'affiliate_institution'
        : selectedRequest.workflow_type || 'office_head_structure';
    const projectWorkflowType =
      selectedRequest.traveler_category === 'project'
        ? `${workflowType.replace('_structure', '')}_project`
        : workflowType;
    const baseStages =
      selectedRequest.traveler_category === 'advisor'
        ? (workflowStages[workflowType] || workflowStages.office_head_structure).filter(
            (stage) => stage !== 'lead_executive_review'
          )
        : workflowStages[projectWorkflowType] ||
          workflowStages[workflowType] ||
          workflowStages.office_head_structure;
    const shouldShowPmOfficeStages =
      selectedRequest.pm_approval_required !== false ||
      ['pm_office_submission', 'pm_office_followup', 'foreign_affairs_followup'].includes(
        selectedRequest.current_stage
      ) ||
      normalizeText(selectedRequest.status).includes('pm office');
    const ministerStageActive = shouldShowMinisterStage(selectedRequest);
    const hasMinisterStage = baseStages.includes('minister_review');
    const stagesWithMinister = baseStages.flatMap((stage) =>
      stage === 'pm_office_submission' && !hasMinisterStage
        ? ['minister_review', stage]
        : [stage]
    );
    const stages = shouldShowPmOfficeStages
      ? stagesWithMinister
      : stagesWithMinister.filter(
          (stage) =>
            !['pm_office_submission', 'pm_office_followup', 'foreign_affairs_followup'].includes(stage)
        );
    const currentStage = selectedRequest.current_stage;
    const finalStatus = selectedRequest.final_status;
    const currentIndex =
      currentStage === 'completed'
        ? stages.length - 1
        : Math.max(stages.indexOf(currentStage), 0);

    return stages.map((stage, index) => {
      let state = 'upcoming';
      const isOptionalMinisterStage =
        stage === 'minister_review' && !ministerStageActive;
      const enteredAt =
        stageTimeline.entered.get(stage) ||
        (stage === currentStage
          ? selectedRequest.last_decision_at ||
            selectedRequest.updated_at ||
            selectedRequest.created_at
          : null) ||
        (stage === 'expert_preparation' ? selectedRequest.created_at : null);
      const approvedAt =
        stageTimeline.approved.get(stage) ||
        (finalStatus === 'approved' && stage === 'completed'
          ? selectedRequest.last_decision_at || stageTimeline.entered.get(stage)
          : null);
      const approvedBy = stageTimeline.approver.get(stage);
      const expectedApprover = approversByStage.get(stage);
      const pendingDays = stage === currentStage ? getDayCount(enteredAt) : null;

      if (finalStatus === 'rejected') {
        state = index <= currentIndex ? 'rejected' : 'upcoming';
      } else if (finalStatus === 'amended' && stage === 'expert_preparation') {
        state = 'returned';
      } else if (index < currentIndex || finalStatus === 'approved') {
        state = 'complete';
      } else if (index === currentIndex) {
        state = 'current';
      }

      if (isOptionalMinisterStage) {
        state = 'optional';
      }

      return {
        stage,
        label: getStageLabel(stage, selectedRequest),
        state,
        optional: isOptionalMinisterStage,
        enteredAt,
        approvedAt,
        approvedBy,
        expectedApprover,
        pendingDays,
      };
    });
  }, [approversByStage, selectedRequest, stageTimeline]);

  const summary = useMemo(
    () => [
      {
        label: 'Visible Requests',
        value: filteredRequests.length,
        helper:
          filteredRequests.length === requests.length
            ? 'Available in your role'
            : `${requests.length} total available`,
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
    [filteredRequests.length, requests]
  );

  const progressSummary = useMemo(() => {
    if (!diagramStages.length) {
      return {
        completed: 0,
        total: 0,
        percent: 0,
        current: 'No active request',
        pendingLabel: 'No workflow selected',
      };
    }

    const requiredStages = diagramStages.filter((item) => !item.optional);
    const completed = requiredStages.filter((item) => item.state === 'complete').length;
    const activeStage =
      diagramStages.find((item) => item.state === 'current') ||
      diagramStages.find((item) => ['returned', 'rejected'].includes(item.state)) ||
      diagramStages[diagramStages.length - 1];
    const total = requiredStages.length || diagramStages.length;
    const percent =
      selectedRequest?.final_status === 'approved' || selectedRequest?.current_stage === 'completed'
        ? 100
        : Math.round((completed / Math.max(total, 1)) * 100);

    return {
      completed,
      total,
      percent,
      current: activeStage?.label || 'Workflow',
      pendingLabel:
        activeStage?.state === 'current'
          ? formatPendingDays(activeStage.pendingDays)
          : stateLabel(activeStage?.state || 'upcoming'),
    };
  }, [diagramStages, selectedRequest]);

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
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {['all', 'pending', 'returned', 'completed'].map((item) => (
              <option key={item} value={item}>
                {formatStatusGroup(item)}
              </option>
            ))}
          </select>
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

              <div className="travel-status-progress-card">
                <span>{progressSummary.percent}% complete</span>
                <strong>{progressSummary.current}</strong>
                <small>{progressSummary.pendingLabel}</small>
                <div className="travel-status-progress-track" aria-hidden="true">
                  <i style={{ width: `${progressSummary.percent}%` }} />
                </div>
              </div>
            </div>

            <div className="travel-status-diagram">
              {auditLoading && (
                <div className="travel-status-audit-loading">
                  Loading approval dates...
                </div>
              )}

              {diagramStages.map((item, index) => (
                <div className="travel-status-step-wrap" key={item.stage}>
                  <div className={`travel-status-step ${item.state}`}>
                    <span>{index + 1}</span>
                    <div className="travel-status-step-copy">
                      <div className="travel-status-step-title">
                        <strong>{item.label}</strong>
                        <small className={`travel-status-state-chip ${item.state}`}>
                          {stateLabel(item.state)}
                        </small>
                      </div>

                      {(item.state !== 'upcoming' || item.expectedApprover) && (
                        <div className="travel-status-step-meta">
                          {item.state === 'complete' && (
  <em>
    {item.stage === 'expert_preparation'
      ? item.approvedBy
        ? `Submitted by ${item.approvedBy} on `
        : 'Submitted on '
      : item.approvedBy
      ? `Approved by ${item.approvedBy} on `
      : 'Approved on '}
    {formatTimelineDate(item.approvedAt || item.enteredAt)}
  </em>
)}

                          {item.state === 'current' && (
                            <>
                              {item.expectedApprover && (
                                <em>Current approver: {item.expectedApprover}</em>
                              )}
                              <em>Reached on {formatTimelineDate(item.enteredAt)}</em>
                              <b>{formatPendingDays(item.pendingDays)}</b>
                            </>
                          )}

                          {['returned', 'rejected'].includes(item.state) && (
                            <em>
                              {item.approvedBy ? `Decision by ${item.approvedBy} on ` : 'Decision on '}
                              {formatTimelineDate(item.approvedAt)}
                            </em>
                          )}
                          {item.state === 'upcoming' && item.expectedApprover && (
                            <em>Upcoming: {item.expectedApprover}</em>
                          )}

                          {item.state === 'optional' && (
                            <em>
                              Optional: Office Head may forward to Minister
                              {item.expectedApprover ? ` (${item.expectedApprover})` : ''}
                            </em>
                          )}
                        </div>
                      )}
                    </div>
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
                <span>Protocol PM Decision</span>
                <strong>
                  {selectedRequest.pm_approval_required === true
                    ? 'PM Office approval required'
                    : selectedRequest.pm_approval_required === false
                    ? 'No PM Office approval required'
                    : 'Not decided yet'}
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
