export function formatDate(value) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function normalizeText(value) {
  return String(value || '').toLowerCase();
}

export function formatStage(stage) {
  const stages = {
    expert_preparation: 'Expert Preparation',
    director_review: 'Lead Executive Officer Review',
    ceo_review: 'CEO Review',
    office_head_review: "Office Head Review",
    lead_executive_review: 'Lead Executive Officer Review',
    state_minister_review: 'State Minister Review',
    protocol_clearance: 'Protocol Clearance',
    office_head_final: 'Office Head Final Decision',
    minister_review: 'Minister Review',
    pm_office_submission: 'Protocol Submission to PM Office',
    pm_office_followup: 'PM Office Follow-up',
    foreign_affairs_followup: 'PM Office Follow-up',
    completed: 'Completed',
    state_minister: 'State Minister',
    protocol: 'Protocol',
    director_general: 'Director General',
    office_head: 'Office Head',
    minister: 'Minister',
    pm_office: 'PM Office',
    protocol_final: 'Pending PM Office Response',
    traveler: 'Traveler Amendment',
    chief_executive_officer: 'Chief Executive Officer',
    ceo: 'CEO',
  };

  return stages[stage] || stage || '-';
}

export function getTripDays(startDate, endDate) {
  if (!startDate || !endDate) return '-';
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  return days > 0 ? days : '-';
}

export function getRoleAliases(role) {
  const aliases = {
    ceo: ['ceo', 'chief_executive_officer'],
    chief_executive_officer: ['chief_executive_officer', 'ceo'],
    lead_executive: ['lead_executive', 'lead_executive_officer'],
    lead_executive_officer: ['lead_executive_officer', 'lead_executive'],
    state_minister: ['state_minister'],
    director_general: ['director_general'],
    office_head: ['office_head'],
    pm_office: ['pm_office'],
  };

  return [...new Set(aliases[role] || [role])].filter(Boolean);
}
