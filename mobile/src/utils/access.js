export const REPORT_ROLES = ['admin', 'super_admin', 'minister', 'office_head'];
export const ADMIN_ROLES = ['admin', 'super_admin'];
export const AUDIT_ROLES = ['admin', 'super_admin', 'protocol'];

export function isTravelerRole(role) {
  return ['traveler', 'expert'].includes(role);
}

export function canViewReports(role) {
  return REPORT_ROLES.includes(role);
}

export function canManageUsers(role) {
  return ADMIN_ROLES.includes(role);
}

export function canViewAudit(role) {
  return AUDIT_ROLES.includes(role);
}

export function canUseNotifications(role) {
  return !['minister', 'pm_office'].includes(role);
}

export function canCreateRequest(role) {
  return !['minister', 'pm_office'].includes(role);
}
