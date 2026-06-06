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
    foreign_affairs_followup: 'Foreign Affairs Follow-up',
    completed: 'Completed',
    state_minister: 'State Minister',
    protocol: 'Protocol',
    office_head: 'Office Head',
    minister: 'Minister',
    protocol_final: 'Pending Foreign Affairs Response',
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
    office_head: ['office_head'],
  };

  return [...new Set(aliases[role] || [role])].filter(Boolean);
}
