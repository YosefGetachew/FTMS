import { normalizeText } from './format';

function stageMatches(request, stages) {
  const currentStage = normalizeText(request.current_stage);
  const status = normalizeText(request.status);
  return stages.some((stage) => currentStage === stage || status === stage);
}

export function canDecideRequest(user, request) {
  const role = user?.role;
  const workflowType = request.workflow_type;

  if (['admin', 'super_admin'].includes(role)) return true;
  if (['lead_executive_officer', 'lead_executive'].includes(role) && stageMatches(request, ['lead_executive_review', 'lead_executive'])) return true;
  if (role === 'state_minister' && workflowType === 'sector_structure' && stageMatches(request, ['state_minister', 'state_minister_review'])) return true;
  if (['chief_executive_officer', 'ceo'].includes(role) && workflowType === 'ceo_structure' && stageMatches(request, ['ceo_review', 'chief_executive_officer', 'ceo'])) return true;
  if (role === 'office_head' && stageMatches(request, ['office_head_review', 'office_head', 'office_head_final'])) return true;
  if (role === 'protocol' && stageMatches(request, ['protocol_clearance', 'protocol', 'foreign_affairs_followup'])) return true;
  if (role === 'minister' && stageMatches(request, ['minister_review', 'minister'])) return true;

  return false;
}

export function getPrimaryAction(request) {
  if (request.current_stage === 'protocol_clearance') return { action: 'approve', label: 'Clear' };
  if (request.current_stage === 'office_head_final') return { action: 'approve', label: 'Forward' };
  if (request.current_stage === 'minister_review') return { action: 'approve', label: 'Approve Final' };
  return { action: 'approve', label: 'Approve' };
}
