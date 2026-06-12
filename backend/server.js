require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const upload = require('./middleware/upload');
const transporter = require('./config/email');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://196.191.93.43:8080',
  'http://10.10.20.118:8080',
  'https://ftms.moa.gov.et',
  'http://ftms.moa.gov.et',
  FRONTEND_URL,
].filter(Boolean);

/* ── Middleware ─────────────────────────────────────────── */

app.use(cors({ origin: (_o, cb) => cb(null, true), credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ── Constants ──────────────────────────────────────────── */

const STAGES = {
  EXPERT_PREPARATION: 'expert_preparation',
  DIRECTOR_REVIEW: 'director_review',
  CEO_REVIEW: 'ceo_review',
  OFFICE_HEAD_REVIEW: 'office_head_review',
  LEAD_EXECUTIVE_REVIEW: 'lead_executive_review',
  STATE_MINISTER_REVIEW: 'state_minister_review',
  PROTOCOL_CLEARANCE: 'protocol_clearance',
  OFFICE_HEAD_FINAL: 'office_head_final',
  MINISTER_REVIEW: 'minister_review',
  PM_OFFICE_SUBMISSION: 'pm_office_submission',
  PM_OFFICE: 'pm_office_followup',
  COMPLETED: 'completed',
};

const WORKFLOW = {
  CEO: 'ceo_structure',
  OFFICE_HEAD: 'office_head_structure',
  SECTOR: 'sector_structure',
};

const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  AMENDED: 'amended',
};

const STAGE_NAMES = {
  expert_preparation: 'Expert Preparation',
  director_review: 'Lead Executive Officer Review',
  ceo_review: 'CEO Review',
  office_head_review: 'Office Head Review',
  lead_executive_review: 'Lead Executive Officer Review',
  state_minister_review: 'State Minister Review',
  protocol_clearance: 'Protocol Clearance',
  office_head_final: 'Office Head Final Decision',
  minister_review: 'Minister Approval',
  pm_office_submission: 'Protocol Submission to PM Office',
  pm_office_followup: 'PM Office Follow-up',
  foreign_affairs_followup: 'PM Office Follow-up',
  completed: 'Completed',
};

const STAGE_ROLES = {
  expert_preparation: 'traveler',
  director_review: 'lead_executive_officer',
  ceo_review: 'chief_executive_officer',
  office_head_review: 'office_head',
  lead_executive_review: 'lead_executive_officer',
  state_minister_review: 'state_minister',
  protocol_clearance: 'protocol',
  office_head_final: 'office_head',
  minister_review: 'minister',
  pm_office_submission: 'protocol',
  pm_office_followup: 'pm_office',
  foreign_affairs_followup: 'pm_office',
};

const ROLE_STAGES = {
  traveler: [STAGES.EXPERT_PREPARATION],
  expert: [STAGES.EXPERT_PREPARATION],
  chief_executive_officer: [STAGES.CEO_REVIEW],
  ceo: [STAGES.CEO_REVIEW],
  office_head: [STAGES.OFFICE_HEAD_REVIEW, STAGES.OFFICE_HEAD_FINAL],
  lead_executive_officer: [STAGES.LEAD_EXECUTIVE_REVIEW],
  lead_executive: [STAGES.LEAD_EXECUTIVE_REVIEW],
  state_minister: [STAGES.STATE_MINISTER_REVIEW],
  protocol: [STAGES.PROTOCOL_CLEARANCE, STAGES.PM_OFFICE_SUBMISSION],
  pm_office: [STAGES.PM_OFFICE],
  minister: [STAGES.MINISTER_REVIEW],
};

const ADMIN_STAGES = Object.values(STAGES).filter((s) => s !== STAGES.COMPLETED);
ROLE_STAGES.admin = ADMIN_STAGES;
ROLE_STAGES.super_admin = ADMIN_STAGES;

const APPROVER_ROLES = [
  'state_minister',
  'lead_executive_officer',
  'lead_executive',
  'office_head',
  'chief_executive_officer',
  'ceo',
  'minister',
  'protocol',
  'pm_office',
];

/* ── Helpers ─────────────────────────────────────────────── */

const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

const authenticateUser = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'ftms_secret_key');
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
};

const requireAdmin = (req, res, next) => {
  const role = req.user?.role;

  if (role !== 'admin' && role !== 'super_admin') {
    return res.status(403).json({
      error: 'Only administrators can review pending user accounts.',
    });
  }

  next();
};

const normalizePhone = (phone) => {
  const raw = String(phone || '').trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');

  if (/^0[97]\d+$/.test(digits)) {
    return `+251 ${digits.slice(1)}`;
  }

  if (/^[97]\d+$/.test(digits)) {
    return `+251 ${digits}`;
  }

  if (/^251[97]\d+$/.test(digits)) {
    return `+251 ${digits.slice(3)}`;
  }

  return raw;
};

const validatePasswordStrength = (password) => {
  const value = String(password || '');

  if (value.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include at least one letter and one number.';
  }

  return '';
};

const safeText = (v, fb = '-') =>
  v == null || v === '' ? fb : String(v);

const getDateParts = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth(),
      day: value.getDate(),
    };
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]) - 1,
      day: Number(isoMatch[3]),
    };
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
  };
};

const formatShortDate = (value) => {
  const parts = getDateParts(value);
  if (!parts) return safeText(value);

  const date = new Date(parts.year, parts.month, parts.day);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = String(parts.day).padStart(2, '0');
  const year = String(parts.year).slice(-2);

  return `${month} ${day}, ${year}`;
};

const getInclusiveDays = (start, end) => {
  const startParts = getDateParts(start);
  const endParts = getDateParts(end);

  if (!startParts || !endParts) return null;

  const startUtc = Date.UTC(startParts.year, startParts.month, startParts.day);
  const endUtc = Date.UTC(endParts.year, endParts.month, endParts.day);
  const days = Math.round((endUtc - startUtc) / 86400000) + 1;

  return days > 0 ? days : null;
};

const isGregorianLeapYear = (year) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const getEthiopianNewYearParts = (gregorianYear) => ({
  year: gregorianYear,
  month: 8,
  day: isGregorianLeapYear(gregorianYear + 1) ? 12 : 11,
});

const getEthiopianDateParts = (value) => {
  const parts = getDateParts(value);
  if (!parts) return null;

  const currentUtc = Date.UTC(parts.year, parts.month, parts.day);
  const currentYearNewYear = getEthiopianNewYearParts(parts.year);
  const currentYearNewYearUtc = Date.UTC(
    currentYearNewYear.year,
    currentYearNewYear.month,
    currentYearNewYear.day
  );

  const ethYear =
    currentUtc >= currentYearNewYearUtc ? parts.year - 7 : parts.year - 8;
  const startParts =
    currentUtc >= currentYearNewYearUtc
      ? currentYearNewYear
      : getEthiopianNewYearParts(parts.year - 1);
  const startUtc = Date.UTC(
    startParts.year,
    startParts.month,
    startParts.day
  );
  const dayOfYear = Math.floor((currentUtc - startUtc) / 86400000);

  return {
    year: ethYear,
    month: Math.floor(dayOfYear / 30) + 1,
    day: (dayOfYear % 30) + 1,
  };
};

const ETHIOPIAN_MONTHS_AMHARIC = [
  'መስከረም',
  'ጥቅምት',
  'ኅዳር',
  'ታኅሣሥ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ',
];

const formatEthiopianDateAmharic = (value) => {
  const parts = getEthiopianDateParts(value);
  if (!parts) return safeText(value);

  return `${ETHIOPIAN_MONTHS_AMHARIC[parts.month - 1]} ${String(
    parts.day
  ).padStart(2, '0')}, ${parts.year}`;
};

const formatTravelDateRange = (start, end) => {
  const startText = formatShortDate(start);
  const endText = formatShortDate(end);
  const days = getInclusiveDays(start, end);

  return `${startText} to ${endText}${
    days ? ` for ${days} Day${days === 1 ? '' : 's'}` : ''
  }`;
};

const formatTravelDateRangeAmharic = (start, end) => {
  const startText = formatEthiopianDateAmharic(start);
  const endText = formatEthiopianDateAmharic(end);
  const days = getInclusiveDays(start, end);

  return `${startText} እስከ ${endText}${days ? ` ለ ${days} ቀናት` : ''}`;
};

const getStageName = (s) => STAGE_NAMES[s] || s || '-';

const normalizeWorkflow = (w) =>
  Object.values(WORKFLOW).includes(w) ? w : WORKFLOW.OFFICE_HEAD;

const EMAIL_FROM = process.env.EMAIL_USER
  ? `"MoA-Foreign Travel" <${process.env.EMAIL_USER}>`
  : '"MoA-Foreign Travel"';

const sendEmailSafe = async (opts, label = 'EMAIL ERROR') => {
  if (!opts?.to) return;

  try {
    await transporter.sendMail(opts);
  } catch (e) {
    console.error(label, e);
  }
};

const query = (sql, params) => pool.query(sql, params);

const syncAffiliateDirectorGeneral = async (
  db,
  {
    organizationName,
    previousOrganizationName = '',
    generalDirectorName,
    email,
    phone,
    password,
  }
) => {
  const cleanOrganizationName = String(organizationName || '').trim();
  const cleanPreviousOrganizationName = String(previousOrganizationName || '').trim();
  const cleanEmail = normalizeEmail(email);
  const cleanName = String(generalDirectorName || '').trim();

  if (!cleanOrganizationName || !cleanEmail) return null;

  const existing = (
    await db.query(
      `SELECT id,password
       FROM users
       WHERE LOWER(TRIM(email))=$1
          OR (
            role='office_head'
            AND $2::text <> ''
            AND LOWER(TRIM(COALESCE(sector,'')))=LOWER(TRIM($2))
          )
       ORDER BY CASE WHEN LOWER(TRIM(email))=$1 THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [cleanEmail, cleanPreviousOrganizationName]
    )
  ).rows[0];

  const cleanPassword = String(password || '').trim();

  if (!existing && !cleanPassword) {
    const error = new Error(
      'Temporary password is required to create the General Director approver account.'
    );
    error.statusCode = 400;
    throw error;
  }

  const hashed = cleanPassword ? await bcrypt.hash(cleanPassword, 10) : null;

  if (existing) {
    const r = await db.query(
      `UPDATE users
       SET full_name=$1,
           email=$2,
           password=COALESCE($3,password),
           role='office_head',
           phone=COALESCE($4,phone),
           sector=$5,
           department=NULL,
           organization_type='Affiliate',
           organization_name=$5,
           account_status='active',
           is_active=true
       WHERE id=$6
       RETURNING id,full_name,email,role,sector,department`,
      [
        cleanName || cleanEmail,
        cleanEmail,
        hashed,
        normalizePhone(phone),
        cleanOrganizationName,
        existing.id,
      ]
    );

    return { user: r.rows[0], created: false };
  }

  const r = await db.query(
    `INSERT INTO users(
      full_name,
      email,
      password,
      role,
      phone,
      sector,
      department,
      organization_type,
      organization_name,
      account_status,
      is_active
    )
    VALUES($1,$2,$3,'office_head',$4,$5,NULL,'Affiliate',$5,'active',true)
    RETURNING id,full_name,email,role,sector,department`,
    [
      cleanName || cleanEmail,
      cleanEmail,
      hashed,
      normalizePhone(phone),
      cleanOrganizationName,
    ]
  );

  return { user: r.rows[0], created: true };
};

const ROLE_ALIASES = {
  chief_executive_officer: ['chief_executive_officer', 'ceo'],
  ceo: ['chief_executive_officer', 'ceo'],
  office_head: ['office_head'],
  lead_executive_officer: ['lead_executive_officer', 'lead_executive'],
  lead_executive: ['lead_executive_officer', 'lead_executive'],
  protocol: ['protocol'],
  pm_office: ['pm_office'],
  minister: ['minister'],
  state_minister: ['state_minister'],
};

const getRolesForLookup = (role) => ROLE_ALIASES[role] || [role];

const getFirstUserByRole = async (role) => {
  const roles = getRolesForLookup(role);

  const r = await query(
    `SELECT id, full_name, email, role, sector
     FROM users
     WHERE role = ANY($1)
       AND COALESCE(account_status,'active')='active'
       AND COALESCE(is_active,true)=true
     ORDER BY id ASC
     LIMIT 1`,
    [roles]
  );

  return r.rows[0] || null;
};

const getFirstUserByRoleAndSector = async (
  role,
  sector,
  department = '',
  options = {}
) => {
  const roles = getRolesForLookup(role);
  const cleanSector = String(sector || '').trim();
  const cleanDepartment = String(department || '').trim();
  const allowFallback = options.allowFallback !== false;

  if (!cleanSector) return allowFallback ? getFirstUserByRole(role) : null;

  if (cleanDepartment) {
    const officeMatch = await query(
      `SELECT id, full_name, email, role, sector, department
       FROM users
       WHERE role = ANY($1)
         AND COALESCE(account_status,'active')='active'
         AND COALESCE(is_active,true)=true
         AND LOWER(TRIM(COALESCE(sector,''))) = LOWER(TRIM($2))
         AND LOWER(TRIM(COALESCE(department,''))) = LOWER(TRIM($3))
       ORDER BY id ASC
       LIMIT 1`,
      [roles, cleanSector, cleanDepartment]
    );

    if (officeMatch.rows[0]) return officeMatch.rows[0];
  }

  const exact = await query(
    `SELECT id, full_name, email, role, sector, department
     FROM users
     WHERE role = ANY($1)
       AND COALESCE(account_status,'active')='active'
       AND COALESCE(is_active,true)=true
       AND LOWER(TRIM(COALESCE(sector,''))) = LOWER(TRIM($2))
     ORDER BY id ASC
     LIMIT 1`,
    [roles, cleanSector]
  );

  if (exact.rows[0]) return exact.rows[0];

  if (!allowFallback) return null;

  const partial = await query(
    `SELECT id, full_name, email, role, sector, department
     FROM users
     WHERE role = ANY($1)
       AND COALESCE(account_status,'active')='active'
       AND COALESCE(is_active,true)=true
       AND (
         LOWER(TRIM(COALESCE(sector,''))) LIKE '%' || LOWER(TRIM($2)) || '%'
         OR LOWER(TRIM($2)) LIKE '%' || LOWER(TRIM(COALESCE(sector,''))) || '%'
       )
     ORDER BY id ASC
     LIMIT 1`,
    [roles, cleanSector]
  );

  return partial.rows[0] || getFirstUserByRole(role);
};

const getSectorForStage = (stage, request) => {
  const workflow = normalizeWorkflow(request?.workflow_type);
  const requestSector = request?.sector;
  const affiliateOrganization = request?.organization_name || requestSector;

  if ([STAGES.DIRECTOR_REVIEW, STAGES.LEAD_EXECUTIVE_REVIEW].includes(stage)) {
    return requestSector;
  }

  if (stage === STAGES.STATE_MINISTER_REVIEW) {
    return requestSector;
  }

  if (stage === STAGES.CEO_REVIEW) {
    return requestSector || 'CEO Office';
  }

  if (stage === STAGES.OFFICE_HEAD_REVIEW) {
    if (request?.traveler_category === 'affiliate_institution') {
      return affiliateOrganization;
    }

    return workflow === WORKFLOW.OFFICE_HEAD ? requestSector : null;
  }

  if (stage === STAGES.OFFICE_HEAD_FINAL) {
    return null;
  }

  return null;
};

const getFirstUserForStage = async (stage, request = null) => {
  const role = STAGE_ROLES[stage];
  if (!role) return null;

  const sector = getSectorForStage(stage, request);
  const department =
    stage === STAGES.LEAD_EXECUTIVE_REVIEW ? request?.department : '';

  if (sector) {
    const requiresExactSector =
      stage === STAGES.OFFICE_HEAD_REVIEW &&
      request?.traveler_category === 'affiliate_institution';

    return getFirstUserByRoleAndSector(role, sector, department, {
      allowFallback: !requiresExactSector,
    });
  }

  return getFirstUserByRole(role);
};

const isSameUser = (a, b) => {
  if (!a || !b) return false;

  if (a.id && b.id && Number(a.id) === Number(b.id)) return true;

  return sameText(a.email, b.email);
};

const getNextStageAfterApproval = (stage, request = {}) => {
  const wf = normalizeWorkflow(request.workflow_type);

  if (stage === STAGES.LEAD_EXECUTIVE_REVIEW) {
    if (wf === WORKFLOW.SECTOR) return STAGES.STATE_MINISTER_REVIEW;
    if (wf === WORKFLOW.CEO) return STAGES.CEO_REVIEW;
    return STAGES.OFFICE_HEAD_REVIEW;
  }

  if (stage === STAGES.STATE_MINISTER_REVIEW) return STAGES.PROTOCOL_CLEARANCE;
  if (stage === STAGES.CEO_REVIEW) return STAGES.PROTOCOL_CLEARANCE;
  if (stage === STAGES.OFFICE_HEAD_REVIEW) return STAGES.PROTOCOL_CLEARANCE;
  if (stage === STAGES.PROTOCOL_CLEARANCE) return STAGES.OFFICE_HEAD_FINAL;
  if (stage === STAGES.OFFICE_HEAD_FINAL) return STAGES.MINISTER_REVIEW;
  if (stage === STAGES.MINISTER_REVIEW) return STAGES.PM_OFFICE_SUBMISSION;
  if (stage === STAGES.PM_OFFICE_SUBMISSION) return STAGES.PM_OFFICE;

  return stage;
};

const getInitialReviewStage = (request, actor) => {
  if (request?.traveler_category === 'affiliate_institution') {
    return STAGES.OFFICE_HEAD_REVIEW;
  }

  const wf = normalizeWorkflow(request?.workflow_type);

  if (
    actor?.role === 'state_minister' &&
    wf === WORKFLOW.SECTOR &&
    sameText(actor.sector, request?.sector)
  ) {
    return STAGES.STATE_MINISTER_REVIEW;
  }

  if (
    ['chief_executive_officer', 'ceo'].includes(actor?.role) &&
    wf === WORKFLOW.CEO &&
    sameText(actor.sector, request?.sector)
  ) {
    return STAGES.CEO_REVIEW;
  }

  if (
    actor?.role === 'office_head' &&
    wf === WORKFLOW.OFFICE_HEAD &&
    sameText(actor.sector, request?.sector)
  ) {
    return STAGES.OFFICE_HEAD_REVIEW;
  }

  return STAGES.LEAD_EXECUTIVE_REVIEW;
};

const resolveNextStageSkippingSelf = async (startStage, request, actor) => {
  let stage = startStage;
  const traveler = { email: request?.email };

  for (let i = 0; i < 8; i += 1) {
    if ([STAGES.EXPERT_PREPARATION, STAGES.COMPLETED].includes(stage)) {
      return stage;
    }

    const approver = await getFirstUserForStage(stage, request);

    if (!isSameUser(actor, approver) && !isSameUser(traveler, approver)) {
      return stage;
    }

    const next = getNextStageAfterApproval(stage, request);
    if (!next || next === stage) return stage;

    stage = next;
  }

  return stage;
};

const getActorUser = async ({ actorId, actorEmail }) => {
  const id = actorId || null;
  const email = normalizeEmail(actorEmail);

  if (!id && !email) return null;

  const r = await query(
    `SELECT id, full_name, email, role, sector, department
     FROM users
     WHERE ($1::int IS NOT NULL AND id=$1)
        OR ($2::text <> '' AND LOWER(TRIM(email))=$2)
     ORDER BY id ASC
     LIMIT 1`,
    [id, email]
  );

  return r.rows[0] || null;
};

const sameText = (a, b) =>
  normalizeEmail(a).replace(/\s+/g, ' ') ===
  normalizeEmail(b).replace(/\s+/g, ' ');

const getScopedDecisionError = async ({
  role,
  actorId,
  actorEmail,
  request,
  action,
}) => {
  if (['admin', 'super_admin'].includes(role)) return '';

  const actor = await getActorUser({ actorId, actorEmail });

  if (!actor) {
    return 'Unable to verify the acting user.';
  }

  const allowedRoleAliases = getRolesForLookup(role);

  if (!allowedRoleAliases.includes(actor.role)) {
    return 'Logged-in account does not match the submitted approval role.';
  }

  if (action === 'submit' || action === 'resubmit') {
    if (!sameText(actor.email, request.email)) {
      return 'You can only submit your own travel request.';
    }

    return '';
  }

  const stage = request.current_stage;
  const workflow = normalizeWorkflow(request.workflow_type);

  if (stage === STAGES.LEAD_EXECUTIVE_REVIEW) {
    if (
      !sameText(actor.sector, request.sector) ||
      !sameText(actor.department, request.department)
    ) {
      return 'This request is assigned to another Lead Executive Office.';
    }
  }

  if (stage === STAGES.STATE_MINISTER_REVIEW) {
    if (workflow !== WORKFLOW.SECTOR || !sameText(actor.sector, request.sector)) {
      return 'This request is assigned to another sector State Minister.';
    }
  }

  if (stage === STAGES.CEO_REVIEW) {
    if (workflow !== WORKFLOW.CEO || !sameText(actor.sector, request.sector)) {
      return 'This request is assigned to another CEO structure.';
    }
  }

  if (stage === STAGES.OFFICE_HEAD_REVIEW) {
    if (request.traveler_category === 'affiliate_institution') {
      const assignedAffiliate =
        request.organization_name || request.sector || request.organizationName;

      if (!sameText(actor.sector, assignedAffiliate)) {
        return 'This request is assigned to another Affiliate Institution Director General.';
      }

      return '';
    }

    if (
      workflow !== WORKFLOW.OFFICE_HEAD ||
      !sameText(actor.sector, request.sector)
    ) {
      return "This request is assigned to another Head of the Minister's Office structure.";
    }
  }

  return '';
};

const addNotification = async ({ userEmail, title, message }) => {
  if (!userEmail) return;

  try {
    await query(
      `INSERT INTO notifications(user_email,title,message)
       VALUES($1,$2,$3)`,
      [userEmail, title, message]
    );
  } catch (e) {
    console.error('NOTIFICATION ERROR:', e.message);
  }
};

const addAudit = async ({
  requestId,
  action,
  actorRole,
  actorEmail,
  comment,
  oldStage,
  newStage,
  oldStatus,
  newStatus,
}) => {
  try {
    await query(
      `INSERT INTO request_audit_trails(
        request_id,
        action,
        actor_role,
        actor_email,
        comment,
        old_stage,
        new_stage,
        old_status,
        new_status
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        requestId,
        action,
        actorRole || null,
        actorEmail || null,
        comment || null,
        oldStage || null,
        newStage || null,
        oldStatus || null,
        newStatus || null,
      ]
    );
  } catch (e) {
    console.error('AUDIT ERROR:', e.message);
  }
};

const archiveFile = (filename) => {
  if (!filename) return;

  const src = path.join(__dirname, 'uploads', filename);
  const dir = path.join(__dirname, 'uploads', 'archive');

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(src)) {
    fs.renameSync(src, path.join(dir, filename));
  }
};

/* ── Email Templates ─────────────────────────────────────── */

const taskEmail = ({ to, recipientName, request: r, stageName, actionUrl }) =>
  sendEmailSafe(
    {
      from: EMAIL_FROM,
      to,
      subject: `FTMS Pending Task: ${safeText(r.full_name)} - ${safeText(
        r.country
      )}`,
      html: `<div style="font-family:Arial;padding:20px">
        <h2 style="color:#2563eb">New Pending FTMS Task</h2>
        <p>Dear <strong>${safeText(
          recipientName,
          'Approver'
        )}</strong>, a travel request is waiting for your review.</p>

        <table border="1" cellpadding="10" style="border-collapse:collapse;width:100%">
          <tr><td><strong>Traveler</strong></td><td>${safeText(
            r.full_name
          )}</td></tr>
          <tr><td><strong>Destination</strong></td><td>${safeText(
            r.country
          )}</td></tr>
          <tr><td><strong>Travel Dates</strong></td><td>${formatTravelDateRange(
            r.start_date,
            r.end_date
          )}</td></tr>
          <tr><td><strong>Purpose</strong></td><td>${safeText(
            r.purpose
          )}</td></tr>
          <tr><td><strong>Stage</strong></td><td>${safeText(
            stageName
          )}</td></tr>
        </table>

        <p>
          <a href="${
            actionUrl || FRONTEND_URL
          }" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;text-decoration:none;border-radius:6px">
            Open FTMS
          </a>
        </p>
      </div>`,
    },
    'TASK EMAIL ERROR:'
  );

const travelerEmail = ({ request: r, status, displayStatus, amendmentComment }) =>
  r?.email &&
  sendEmailSafe(
    {
      from: EMAIL_FROM,
      to: r.email,
      subject:
        status === 'amend'
          ? 'Travel Request Requires Amendment'
          : status === 'resubmit'
          ? 'Travel Request Resubmitted'
          : 'Travel Request Status Updated',
      html: `<div style="font-family:Arial;padding:20px">
        <p>Dear <strong>${safeText(r.full_name, 'Traveler')}</strong>,</p>
        <p>Your travel request to <strong>${safeText(
          r.country
        )}</strong> has been updated.</p>
        <table border="1" cellpadding="10" style="border-collapse:collapse;width:100%">
          <tr><td><strong>Destination</strong></td><td>${safeText(
            r.country
          )}</td></tr>
          <tr><td><strong>Travel Dates</strong></td><td>${formatTravelDateRange(
            r.start_date,
            r.end_date
          )}</td></tr>
          <tr><td><strong>Current Stage</strong></td><td>${getStageName(
            r.current_stage
          )}</td></tr>
          <tr><td><strong>Status</strong></td><td>${safeText(
            displayStatus
          )}</td></tr>
        </table>
        ${
          amendmentComment
            ? `<p><strong>Comment:</strong> ${safeText(amendmentComment)}</p>`
            : ''
        }
        <p><a href="${FRONTEND_URL}" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;text-decoration:none;border-radius:6px">Open FTMS</a></p>
      </div>`,
    },
    'TRAVELER EMAIL ERROR:'
  );

const accountEmail = (user, activated) =>
  sendEmailSafe(
    {
      from: EMAIL_FROM,
      to: user.email,
      subject: activated
        ? 'FTMS Account Activated'
        : 'FTMS Account Request Rejected',
      html: `<div style="font-family:Arial;padding:20px">
        <h2 style="color:${activated ? '#16a34a' : '#dc2626'}">
          ${activated ? 'FTMS Account Activated' : 'Account Request Rejected'}
        </h2>
        <p>Dear <strong>${safeText(user.full_name, 'User')}</strong>,</p>
        <p>${
          activated
            ? 'Your FTMS account has been activated. You can now log in and submit travel requests.'
            : 'Your FTMS account request was not approved. Please contact the administrator.'
        }</p>
        ${
          activated
            ? `<p><a href="${FRONTEND_URL}" style="display:inline-block;background:#16a34a;color:white;padding:12px 18px;text-decoration:none;border-radius:6px">Open FTMS</a></p>`
            : ''
        }
      </div>`,
    },
    'ACCOUNT EMAIL ERROR:'
  );

/* ── Startup: DB Migration + Super Admin ────────────────── */

(async () => {
  try {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS position VARCHAR(150),
        ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100),
        ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS sector VARCHAR(150),
        ADD COLUMN IF NOT EXISTS department VARCHAR(150),
        ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);

    await query(`
      UPDATE users
      SET account_status='active'
      WHERE account_status IS NULL
    `);

    await query(`
      ALTER TABLE requests
        ADD COLUMN IF NOT EXISTS sector VARCHAR(150),
        ADD COLUMN IF NOT EXISTS amendment_comment TEXT,
        ADD COLUMN IF NOT EXISTS amended_by VARCHAR(100),
        ADD COLUMN IF NOT EXISTS workflow_type VARCHAR(50) DEFAULT 'office_head_structure',
        ADD COLUMN IF NOT EXISTS current_stage VARCHAR(80) DEFAULT 'expert_preparation',
        ADD COLUMN IF NOT EXISTS final_status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS decision_comment TEXT,
        ADD COLUMN IF NOT EXISTS last_decision_by INTEGER,
        ADD COLUMN IF NOT EXISTS last_decision_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS foreign_affairs_status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS foreign_affairs_comment TEXT,
        ADD COLUMN IF NOT EXISTS foreign_affairs_updated_at TIMESTAMP
    `);

    await query(`
      UPDATE requests
      SET workflow_type='office_head_structure'
      WHERE workflow_type IS NULL
    `);

    await query(`
      UPDATE requests
      SET current_stage='expert_preparation'
      WHERE current_stage IS NULL
    `);

    await query(`
      UPDATE requests
      SET current_stage='state_minister_review'
      WHERE current_stage='state_minister'
    `);

    await query(`
      UPDATE requests
      SET final_status='pending'
      WHERE final_status IS NULL
    `);

    await query(`
      UPDATE requests
      SET current_stage='lead_executive_review',
          status='Submitted to Lead Executive Officer'
      WHERE current_stage='director_review'
        AND final_status='pending'
    `);

    await query(`
      UPDATE requests
      SET current_stage='pm_office_followup',
          status='Submitted to PM Office'
      WHERE current_stage='foreign_affairs_followup'
        AND final_status='pending'
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS request_audit_trails (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
        action VARCHAR(100),
        actor_role VARCHAR(100),
        actor_email VARCHAR(255),
        comment TEXT,
        old_stage VARCHAR(80),
        new_stage VARCHAR(80),
        old_status VARCHAR(80),
        new_status VARCHAR(80),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS moa_sectors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        workflow_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS moa_executive_offices (
        id SERIAL PRIMARY KEY
      )
    `);

    await query(`
      ALTER TABLE moa_executive_offices
      ADD COLUMN IF NOT EXISTS name VARCHAR(255)
    `);

    await query(`
      ALTER TABLE moa_executive_offices
      ADD COLUMN IF NOT EXISTS office_name VARCHAR(255)
    `);

    await query(`
      UPDATE moa_executive_offices
      SET name = office_name
      WHERE name IS NULL AND office_name IS NOT NULL
    `);

    await query(`
      UPDATE moa_executive_offices
      SET office_name = name
      WHERE office_name IS NULL AND name IS NOT NULL
    `);

    await query(`
      ALTER TABLE moa_executive_offices
      ALTER COLUMN office_name DROP NOT NULL
    `);

    await query(`
      ALTER TABLE moa_executive_offices
      ADD COLUMN IF NOT EXISTS sector_id INTEGER
    `);

    await query(`
      ALTER TABLE moa_executive_offices
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'moa_executive_offices_sector_id_fkey'
        ) THEN
          ALTER TABLE moa_executive_offices
          ADD CONSTRAINT moa_executive_offices_sector_id_fkey
          FOREIGN KEY (sector_id)
          REFERENCES moa_sectors(id)
          ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'moa_executive_offices_sector_id_name_key'
        ) THEN
          ALTER TABLE moa_executive_offices
          ADD CONSTRAINT moa_executive_offices_sector_id_name_key
          UNIQUE(sector_id, name);
        END IF;
      END
      $$;
    `);

    console.log('DB migration OK');
  } catch (e) {
    console.error('DB MIGRATION ERROR:', e.message);
  }

  try {
    const email = normalizeEmail(
      process.env.SUPER_ADMIN_EMAIL || 'yosefgetachew@gmail.com'
    );

    const exists = await query(
      `SELECT id FROM users WHERE LOWER(TRIM(email))=$1 LIMIT 1`,
      [email]
    );

    if (exists.rows.length) {
      console.log('Super admin exists.');
      return;
    }

    const hashed = await bcrypt.hash(
      process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe@123457',
      10
    );

    await query(
      `INSERT INTO users(full_name,email,password,role,account_status,is_active)
       VALUES($1,$2,$3,'super_admin','active',true)`,
      [process.env.SUPER_ADMIN_NAME || 'System Super Admin', email, hashed]
    );

    console.log('Super admin created.');
  } catch (e) {
    console.error('SUPER ADMIN SEED ERROR:', e.message);
  }
})();

/* ── Basic Routes ───────────────────────────────────────── */

app.get('/', (_r, res) =>
  res.json({ message: 'FTMS Backend Running', status: 'OK' })
);

app.get('/api/health', (_r, res) =>
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
);

/* ── Auth ───────────────────────────────────────────────── */

app.post('/api/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      position,
      organizationType,
      organizationName,
      sector,
      department,
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        error: 'Full name, email, and password are required.',
      });
    }

    const ne = normalizeEmail(email);

    const existing = await query(
      `SELECT id FROM users WHERE LOWER(TRIM(email))=$1`,
      [ne]
    );

    if (existing.rows.length) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const r = await query(
      `INSERT INTO users(
        full_name,
        email,
        password,
        role,
        phone,
        position,
        organization_type,
        organization_name,
        sector,
        department,
        account_status,
        is_active
      )
      VALUES($1,$2,$3,'traveler',$4,$5,$6,$7,$8,$9,'pending',false)
      RETURNING *`,
      [
        fullName,
        ne,
        hashed,
        normalizePhone(phone),
        position || null,
        organizationType || null,
        organizationName || null,
        sector || null,
        department || null,
      ]
    );

    res.status(201).json({
      message: 'Registration submitted. Awaiting admin approval.',
      user: r.rows[0],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const r = await query(
      `SELECT * FROM users WHERE LOWER(TRIM(email))=$1`,
      [normalizeEmail(email)]
    );

    if (!r.rows.length) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const user = r.rows[0];

    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const status = user.account_status || 'active';

    if (status === 'pending') {
      return res.status(403).json({ error: 'Account pending admin approval.' });
    }

    if (status === 'rejected') {
      return res.status(403).json({ error: 'Account request rejected.' });
    }

    if (status !== 'active') {
      return res.status(403).json({ error: 'Account not active.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account disabled.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'ftms_secret_key',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        sector: user.sector,
        department: user.department,
        accountStatus: status,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

/* ── Requests: Create ───────────────────────────────────── */

const uploadFields = upload.fields([
  { name: 'passportFile', maxCount: 1 },
  { name: 'invitationLetter', maxCount: 1 },
  { name: 'torFile', maxCount: 1 },
]);

app.post('/api/requests', uploadFields, async (req, res) => {
  try {
    const {
      travelerCategory,
      workflowType,
      organizationName,
      fullName,
      position,
      department,
      sector,
      country,
      startDate,
      endDate,
      purpose,
      sponsor,
      passportNumber,
      email,
      phone,
    } = req.body;

    if (!fullName || !email || !country || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Full name, email, country, and travel dates are required.',
      });
    }

    const ne = normalizeEmail(email);

    const existingUser = (
      await query(`SELECT * FROM users WHERE LOWER(TRIM(email))=$1`, [ne])
    ).rows[0];

    const cleanTravelerCategory = travelerCategory || 'ministry_staff';
    const isAffiliateRequest =
      cleanTravelerCategory === 'affiliate_institution';
    const requestOrganization = isAffiliateRequest
      ? organizationName || existingUser?.organization_name || null
      : organizationName || null;
    const requestSector = isAffiliateRequest
      ? requestOrganization
      : sector || existingUser?.sector || null;

    const r = await query(
      `INSERT INTO requests(
        traveler_category,
        organization_name,
        workflow_type,
        current_stage,
        final_status,
        full_name,
        position,
        department,
        sector,
        country,
        start_date,
        end_date,
        purpose,
        sponsor,
        passport_number,
        email,
        phone,
        passport_file,
        invitation_letter,
        tor_file,
        status,
        foreign_affairs_status
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        cleanTravelerCategory,
        requestOrganization,
        normalizeWorkflow(workflowType),
        STAGES.EXPERT_PREPARATION,
        STATUS.PENDING,
        fullName,
        position || null,
        department || null,
        requestSector,
        country,
        startDate,
        endDate,
        purpose || null,
        sponsor || null,
        passportNumber || null,
        ne,
        normalizePhone(phone),
        req.files?.passportFile?.[0]?.filename || null,
        req.files?.invitationLetter?.[0]?.filename || null,
        req.files?.torFile?.[0]?.filename || null,
        'Draft / Expert Preparation',
        'pending',
      ]
    );

    await addNotification({
      userEmail: ne,
      title: 'Travel Request Created',
      message: `Your travel request to ${country} has been created.`,
    });

    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Requests: Get ──────────────────────────────────────── */

const SECTOR_EXPR = `CASE WHEN r.traveler_category='affiliate_institution' THEN 'Affiliate Institute'
  ELSE COALESCE(r.sector,traveler.sector,'Unassigned') END`;

const BASE_SELECT = `SELECT r.*,
    ${SECTOR_EXPR} AS sector,
    EXISTS (
      SELECT 1
      FROM request_audit_trails a
      WHERE a.request_id = r.id
        AND COALESCE(a.action,'') NOT IN ('submit','resubmit')
    ) AS has_workflow_action
  FROM requests r
  LEFT JOIN users traveler
    ON LOWER(TRIM(r.email))=LOWER(TRIM(traveler.email))`;

const ROLE_QUERIES = {
  admin: `${BASE_SELECT} ORDER BY r.id DESC`,
  super_admin: `${BASE_SELECT} ORDER BY r.id DESC`,

  traveler: `${BASE_SELECT}
    WHERE LOWER(TRIM(r.email))=LOWER(TRIM($1))
    ORDER BY r.id DESC`,

  expert: `${BASE_SELECT}
    WHERE LOWER(TRIM(r.email))=LOWER(TRIM($1))
    ORDER BY r.id DESC`,

  chief_executive_officer: `${BASE_SELECT}
    WHERE (
         r.current_stage='ceo_review'
         AND r.final_status='pending'
         AND r.workflow_type='ceo_structure'
         AND EXISTS (
           SELECT 1 FROM users me
           WHERE LOWER(TRIM(me.email))=LOWER(TRIM($1))
             AND me.role IN ('chief_executive_officer','ceo')
             AND LOWER(TRIM(COALESCE(me.sector,'')))=LOWER(TRIM(COALESCE(r.sector,'')))
         )
       )
       OR (
         r.final_status IN ('approved','rejected')
         AND EXISTS (
           SELECT 1 FROM request_audit_trails a
           WHERE a.request_id=r.id
             AND a.actor_role IN ('chief_executive_officer','ceo')
             AND LOWER(TRIM(COALESCE(a.actor_email,'')))=LOWER(TRIM($1))
         )
       )
    ORDER BY CASE WHEN r.current_stage='ceo_review' AND r.final_status='pending' THEN 0 ELSE 1 END, r.id DESC`,

  office_head: `${BASE_SELECT}
    WHERE (
         r.current_stage='office_head_review'
         AND r.final_status='pending'
         AND EXISTS (
           SELECT 1 FROM users me
           WHERE LOWER(TRIM(me.email))=LOWER(TRIM($1))
             AND me.role='office_head'
             AND (
               (
                 r.traveler_category='affiliate_institution'
                 AND LOWER(TRIM(COALESCE(me.sector,''))) =
                     LOWER(TRIM(COALESCE(r.organization_name,r.sector,'')))
               )
               OR (
                 r.traveler_category<>'affiliate_institution'
                 AND r.workflow_type='office_head_structure'
                 AND LOWER(TRIM(COALESCE(me.sector,'')))=LOWER(TRIM(COALESCE(r.sector,'')))
               )
             )
         )
       )
       OR (
         r.current_stage='office_head_final'
         AND r.final_status='pending'
         AND (
           r.traveler_category <> 'affiliate_institution'
           OR r.traveler_category='affiliate_institution'
         )
       )
       OR r.final_status IN ('approved','rejected')
    ORDER BY CASE WHEN r.current_stage IN ('office_head_review','office_head_final') AND r.final_status='pending' THEN 0 ELSE 1 END, r.id DESC`,

  lead_executive_officer: `${BASE_SELECT}
    WHERE (
         r.current_stage='lead_executive_review'
         AND r.final_status='pending'
         AND EXISTS (
           SELECT 1 FROM users me
           WHERE LOWER(TRIM(me.email))=LOWER(TRIM($1))
             AND me.role IN ('lead_executive_officer','lead_executive')
             AND LOWER(TRIM(COALESCE(me.sector,'')))=LOWER(TRIM(COALESCE(r.sector,'')))
             AND LOWER(TRIM(COALESCE(me.department,'')))=LOWER(TRIM(COALESCE(r.department,'')))
         )
       )
       OR (
         r.final_status IN ('approved','rejected')
         AND EXISTS (
           SELECT 1 FROM request_audit_trails a
           WHERE a.request_id=r.id
             AND a.actor_role IN ('lead_executive_officer','lead_executive')
             AND LOWER(TRIM(COALESCE(a.actor_email,'')))=LOWER(TRIM($1))
         )
       )
    ORDER BY CASE WHEN r.current_stage='lead_executive_review' AND r.final_status='pending' THEN 0 ELSE 1 END, r.id DESC`,

  state_minister: `${BASE_SELECT}
    WHERE (
         r.current_stage='state_minister_review'
         AND r.final_status='pending'
         AND r.workflow_type='sector_structure'
         AND EXISTS (
           SELECT 1 FROM users me
           WHERE LOWER(TRIM(me.email))=LOWER(TRIM($1))
             AND me.role='state_minister'
             AND LOWER(TRIM(COALESCE(me.sector,'')))=LOWER(TRIM(COALESCE(r.sector,'')))
         )
       )
       OR (
         r.final_status IN ('approved','rejected')
         AND EXISTS (
           SELECT 1 FROM request_audit_trails a
           WHERE a.request_id=r.id
             AND a.actor_role='state_minister'
             AND LOWER(TRIM(COALESCE(a.actor_email,'')))=LOWER(TRIM($1))
         )
       )
    ORDER BY CASE WHEN r.current_stage='state_minister_review' AND r.final_status='pending' THEN 0 ELSE 1 END, r.id DESC`,

  protocol: `${BASE_SELECT}
    WHERE (r.current_stage IN ('protocol_clearance','pm_office_submission') AND r.final_status='pending')
       OR (
         r.final_status IN ('approved','rejected')
         AND EXISTS (
           SELECT 1 FROM request_audit_trails a
           WHERE a.request_id=r.id
             AND a.actor_role='protocol'
             AND LOWER(TRIM(COALESCE(a.actor_email,'')))=LOWER(TRIM($1))
         )
       )
    ORDER BY CASE WHEN r.current_stage IN ('protocol_clearance','pm_office_submission') AND r.final_status='pending' THEN 0 ELSE 1 END, r.id DESC`,

  pm_office: `${BASE_SELECT}
    WHERE (r.current_stage IN ('pm_office_followup','foreign_affairs_followup') AND r.final_status='pending')
    ORDER BY CASE WHEN r.current_stage IN ('pm_office_followup','foreign_affairs_followup') AND r.final_status='pending' THEN 0 ELSE 1 END, r.id DESC`,

  minister: `${BASE_SELECT}
    WHERE (r.current_stage='minister_review' AND r.final_status='pending')
       OR r.final_status IN ('approved','rejected')
    ORDER BY CASE WHEN r.current_stage='minister_review' AND r.final_status='pending' THEN 0 ELSE 1 END, r.id DESC`,
};

ROLE_QUERIES.ceo = ROLE_QUERIES.chief_executive_officer;
ROLE_QUERIES.lead_executive = ROLE_QUERIES.lead_executive_officer;

const EMAIL_SCOPED_REQUEST_ROLES = [
  'traveler',
  'expert',
  'chief_executive_officer',
  'ceo',
  'lead_executive_officer',
  'lead_executive',
  'state_minister',
  'office_head',
  'protocol',
];

app.get('/api/requests', async (req, res) => {
  try {
    const { role, email } = req.query;
    const sql = ROLE_QUERIES[role];

    if (!sql) {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const needsEmail = EMAIL_SCOPED_REQUEST_ROLES.includes(role);
    const r = await query(sql, needsEmail ? [email || ''] : []);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Requests: Update ───────────────────────────────────── */

app.put('/api/requests/:id', uploadFields, async (req, res) => {
  try {
    const {
      travelerCategory,
      workflowType,
      organizationName,
      fullName,
      position,
      department,
      sector,
      email,
      phone,
      country,
      startDate,
      endDate,
      purpose,
      sponsor,
      passportNumber,
    } = req.body;

    const r = await query(
      `UPDATE requests SET
        traveler_category=COALESCE($1,traveler_category),
        workflow_type=COALESCE($2,workflow_type),
        organization_name=COALESCE($3,organization_name),
        full_name=COALESCE($4,full_name),
        position=COALESCE($5,position),
        department=COALESCE($6,department),
        sector=COALESCE($7,sector),
        email=COALESCE($8,email),
        phone=COALESCE($9,phone),
        country=COALESCE($10,country),
        start_date=COALESCE($11,start_date),
        end_date=COALESCE($12,end_date),
        purpose=COALESCE($13,purpose),
        sponsor=COALESCE($14,sponsor),
        passport_number=COALESCE($15,passport_number),
        passport_file=COALESCE($16,passport_file),
        invitation_letter=COALESCE($17,invitation_letter),
        tor_file=COALESCE($18,tor_file)
       WHERE id=$19
       RETURNING *`,
      [
        travelerCategory || null,
        workflowType ? normalizeWorkflow(workflowType) : null,
        organizationName || null,
        fullName || null,
        position || null,
        department || null,
        sector || null,
        email ? normalizeEmail(email) : null,
        normalizePhone(phone),
        country || null,
        startDate || null,
        endDate || null,
        purpose || null,
        sponsor || null,
        passportNumber || null,
        req.files?.passportFile?.[0]?.filename || null,
        req.files?.invitationLetter?.[0]?.filename || null,
        req.files?.torFile?.[0]?.filename || null,
        req.params.id,
      ]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json({ message: 'Request updated.', request: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
/* ── Requests: Workflow Decision ────────────────────────── */

app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      action,
      status,
      role,
      comment,
      actorEmail,
      actorId,
      foreignAffairsComment,
    } = req.body;

    const act = String(action || status || '').trim();

    const existing = (
      await query(`SELECT * FROM requests WHERE id=$1`, [id])
    ).rows[0];

    if (!existing) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (
      existing.current_stage === STAGES.COMPLETED ||
      [STATUS.APPROVED, STATUS.REJECTED].includes(existing.final_status)
    ) {
      return res.status(400).json({ error: 'Request already finalized.' });
    }

    const isSubmitAction = act === 'submit' || act === 'resubmit';
    const allowedStages = ROLE_STAGES[role] || [];

    if (
      !isSubmitAction &&
      allowedStages.length &&
      !allowedStages.includes(existing.current_stage)
    ) {
      return res.status(400).json({
        error: 'Request not assigned to your stage.',
      });
    }

    const scopedDecisionError = await getScopedDecisionError({
      role,
      actorId,
      actorEmail,
      request: existing,
      action: act,
    });

    if (scopedDecisionError) {
      return res.status(403).json({ error: scopedDecisionError });
    }

    const actor = await getActorUser({ actorId, actorEmail });
    const wf = normalizeWorkflow(existing.workflow_type);

    let nextStage = existing.current_stage;
    let finalStatus = existing.final_status || STATUS.PENDING;
    let displayStatus = existing.status || 'Pending';

    let amendComment = null;
    let amendedBy = null;

    let faStatus = existing.foreign_affairs_status || 'pending';
    let faUpdated = existing.foreign_affairs_updated_at || null;
    let faComment = existing.foreign_affairs_comment || null;

    const cur = existing.current_stage;

    if (act === 'submit') {
      if (!role) {
        return res.status(403).json({
          error: 'A valid logged-in user is required to submit.',
        });
      }

      if (cur !== STAGES.EXPERT_PREPARATION) {
        return res.status(400).json({
          error: 'Only Expert Preparation requests can be submitted.',
        });
      }

      /*
        Approval flow:
          - sector_structure: Expert -> Lead Executive Officer -> State Minister -> Protocol -> Office Head -> Protocol PM Submission -> PM Office
          - ceo_structure: Expert -> Lead Executive Officer -> CEO -> Protocol -> Office Head -> Protocol PM Submission -> PM Office
          - office_head_structure: Expert -> Lead Executive Officer -> Office Head -> Protocol -> Office Head -> Protocol PM Submission -> PM Office
          - affiliate_institution: Expert -> Director General -> Protocol -> Office Head -> Protocol PM Submission -> PM Office
          - At Office Head final stage, the Office Head can approve, reject, or forward to Minister.
      */
      const isAffiliateRequest =
        existing.traveler_category === 'affiliate_institution';

      const firstReviewStage = getInitialReviewStage(existing, actor);

      nextStage = await resolveNextStageSkippingSelf(
        firstReviewStage,
        existing,
        actor
      );
      finalStatus = STATUS.PENDING;
      displayStatus =
        nextStage === STAGES.OFFICE_HEAD_REVIEW && isAffiliateRequest
          ? 'Submitted to Director General Review'
          : `Submitted to ${getStageName(nextStage)}`;
    }

    else if (act === 'approve') {
      const approveMap = {
        [STAGES.CEO_REVIEW]: {
          roles: [
            'chief_executive_officer',
            'ceo',
            'admin',
            'super_admin',
          ],
          next: STAGES.PROTOCOL_CLEARANCE,
        },

        [STAGES.OFFICE_HEAD_REVIEW]: {
          roles: ['office_head', 'admin', 'super_admin'],
          next: STAGES.PROTOCOL_CLEARANCE,
        },

        [STAGES.LEAD_EXECUTIVE_REVIEW]: {
          roles: [
            'lead_executive_officer',
            'lead_executive',
            'admin',
            'super_admin',
          ],
          next:
            wf === WORKFLOW.SECTOR
              ? STAGES.STATE_MINISTER_REVIEW
              : wf === WORKFLOW.CEO
              ? STAGES.CEO_REVIEW
              : STAGES.OFFICE_HEAD_REVIEW,
        },

        [STAGES.STATE_MINISTER_REVIEW]: {
          roles: ['state_minister', 'admin', 'super_admin'],
          next: STAGES.PROTOCOL_CLEARANCE,
        },

        [STAGES.OFFICE_HEAD_FINAL]: {
          roles: ['office_head', 'admin', 'super_admin'],
          next: STAGES.PM_OFFICE_SUBMISSION,
        },

        [STAGES.MINISTER_REVIEW]: {
          roles: ['minister', 'admin', 'super_admin'],
          next: STAGES.PM_OFFICE_SUBMISSION,
        },
      };

      const mapping = approveMap[cur];

      if (!mapping) {
        return res.status(400).json({
          error: 'Approve not valid at this stage.',
        });
      }

      if (!mapping.roles.includes(role)) {
        return res.status(403).json({
          error: 'Insufficient role for this stage.',
        });
      }

      nextStage = await resolveNextStageSkippingSelf(
        mapping.next,
        existing,
        actor
      );
      finalStatus = STATUS.PENDING;
      displayStatus =
        nextStage === STAGES.PM_OFFICE_SUBMISSION
          ? cur === STAGES.OFFICE_HEAD_FINAL
            ? 'Office Head Approved - Sent to Protocol for PM Office Submission'
            : 'Minister Approved - Sent to Protocol for PM Office Submission'
          : `Approved by ${role
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())}`;
    }

    else if (act === 'reject') {
      if (
        [
          STAGES.DIRECTOR_REVIEW,
          STAGES.CEO_REVIEW,
          STAGES.OFFICE_HEAD_REVIEW,
          STAGES.LEAD_EXECUTIVE_REVIEW,
          STAGES.STATE_MINISTER_REVIEW,
        ].includes(cur)
      ) {
        nextStage = STAGES.EXPERT_PREPARATION;
        finalStatus = STATUS.AMENDED;
        displayStatus = 'Returned for Correction';
        amendComment = comment || 'Please correct and resubmit.';
        amendedBy = role;
      } else if (
        [STAGES.OFFICE_HEAD_FINAL, STAGES.MINISTER_REVIEW].includes(cur)
      ) {
        nextStage = STAGES.COMPLETED;
        finalStatus = STATUS.REJECTED;
        displayStatus = 'Rejected';
      } else {
        return res.status(400).json({
          error: 'Reject not valid at this stage.',
        });
      }
    }

    else if (act === 'clear') {
      if (cur !== STAGES.PROTOCOL_CLEARANCE) {
        return res.status(400).json({
          error: 'Clear only valid at Protocol Clearance.',
        });
      }

      if (!['protocol', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({
          error: 'Only Protocol can clear.',
        });
      }

      nextStage = STAGES.OFFICE_HEAD_FINAL;
      finalStatus = STATUS.PENDING;
      displayStatus = 'Cleared by Protocol';
    }

    else if (act === 'amend') {
      if (cur !== STAGES.PROTOCOL_CLEARANCE) {
        return res.status(400).json({
          error: 'Amend only valid at Protocol Clearance.',
        });
      }

      if (!['protocol', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({
          error: 'Only Protocol can amend.',
        });
      }

      nextStage = STAGES.EXPERT_PREPARATION;
      finalStatus = STATUS.AMENDED;
      displayStatus = 'Amendment Requested';
      amendComment = comment || 'Please amend.';
      amendedBy = role;
    }

    else if (act === 'forward_to_minister') {
      if (cur !== STAGES.OFFICE_HEAD_FINAL) {
        return res.status(400).json({
          error: 'Only Office Head Final can forward to Minister.',
        });
      }

      if (!['office_head', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({
          error: 'Only Office Head can forward.',
        });
      }

      nextStage = STAGES.MINISTER_REVIEW;
      finalStatus = STATUS.PENDING;
      displayStatus = 'Forwarded to Minister';
    }

    else if (act === 'submit_to_pm_office') {
      if (cur !== STAGES.PM_OFFICE_SUBMISSION) {
        return res.status(400).json({
          error: 'Submit to PM Office is only valid after Minister approval.',
        });
      }

      if (!['protocol', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({
          error: 'Only Protocol can submit to PM Office.',
        });
      }

      nextStage = STAGES.PM_OFFICE;
      finalStatus = STATUS.PENDING;
      displayStatus = 'Submitted to PM Office';
      faStatus = 'submitted';
      faComment = comment || faComment;
      faUpdated = new Date();
    }

    else if (
      act === 'foreign_affairs_approved' ||
      act === 'foreign_affairs_rejected' ||
      act === 'pm_office_approved' ||
      act === 'pm_office_rejected'
    ) {
      if (![STAGES.PM_OFFICE, 'foreign_affairs_followup'].includes(cur)) {
        return res.status(400).json({
          error: 'Only valid at PM Office stage.',
        });
      }

      if (!['pm_office', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({
          error: 'Only PM Office can update.',
        });
      }

      const approved =
        act === 'foreign_affairs_approved' || act === 'pm_office_approved';

      nextStage = STAGES.COMPLETED;
      finalStatus = approved ? STATUS.APPROVED : STATUS.REJECTED;
      displayStatus = approved
        ? 'PM Office Approved'
        : 'PM Office Rejected';

      faStatus = approved ? 'approved' : 'rejected';
      faUpdated = new Date();
      faComment = foreignAffairsComment || comment || faComment;
    }

    else {
      return res.status(400).json({
        error: 'Unknown workflow action.',
      });
    }

    let nextApprover = null;

    if (![STAGES.COMPLETED, STAGES.EXPERT_PREPARATION].includes(nextStage)) {
      nextApprover = await getFirstUserForStage(nextStage, existing);

      if (!nextApprover) {
        const nextStageLabel =
          nextStage === STAGES.OFFICE_HEAD_REVIEW &&
          existing.traveler_category === 'affiliate_institution'
            ? 'Affiliate Institution Director General'
            : getStageName(nextStage);

        return res.status(400).json({
          error: `No active ${nextStageLabel} approver is configured for this request.`,
        });
      }
    }

    const updated = await query(
      `UPDATE requests SET
        status=$1,
        current_stage=$2,
        final_status=$3,
        decision_comment=COALESCE($4,decision_comment),
        amendment_comment=COALESCE($5,amendment_comment),
        amended_by=COALESCE($6,amended_by),
        last_decision_by=COALESCE($7,last_decision_by),
        last_decision_at=NOW(),
        foreign_affairs_status=$8,
        foreign_affairs_comment=COALESCE($9,foreign_affairs_comment),
        foreign_affairs_updated_at=COALESCE($10,foreign_affairs_updated_at)
       WHERE id=$11
       RETURNING *`,
      [
        displayStatus,
        nextStage,
        finalStatus,
        comment || null,
        amendComment,
        amendedBy,
        actorId || null,
        faStatus,
        faComment,
        faUpdated,
        id,
      ]
    );

    const req2 = updated.rows[0];

    await addAudit({
      requestId: req2.id,
      action: act,
      actorRole: role,
      actorEmail,
      comment,
      oldStage: existing.current_stage,
      newStage: nextStage,
      oldStatus: existing.final_status,
      newStatus: finalStatus,
    });

    if ([STATUS.APPROVED, STATUS.REJECTED].includes(finalStatus)) {
      [req2.passport_file, req2.invitation_letter, req2.tor_file].forEach(
        archiveFile
      );
    }

    await addNotification({
      userEmail: req2.email,
      title: 'Travel Request Updated',
      message: amendComment
        ? `Your request to ${req2.country} requires correction: ${amendComment}`
        : `Your request to ${req2.country} is now: ${displayStatus}`,
    });

    await travelerEmail({
      request: req2,
      status: act,
      displayStatus,
      amendmentComment: amendComment,
    });

    if (
      nextApprover &&
      ![STAGES.COMPLETED, STAGES.EXPERT_PREPARATION].includes(nextStage)
    ) {
      await taskEmail({
        to: nextApprover.email,
        recipientName: nextApprover.full_name,
        request: req2,
        stageName: getStageName(nextStage),
        actionUrl: FRONTEND_URL,
      });

      await addNotification({
        userEmail: nextApprover.email,
        title: 'New FTMS Task Assigned',
        message: `A travel request from ${safeText(
          req2.full_name
        )} is waiting for your review at ${getStageName(nextStage)}.`,
      });
    }

    res.json({
      message: 'Status updated.',
      status: displayStatus,
      currentStage: nextStage,
      finalStatus,
      foreignAffairsStatus: faStatus,
    });
  } catch (e) {
    console.error('STATUS UPDATE ERROR:', e);
    res.status(500).json({ error: e.message });
  }
});

/* ── Requests: Resubmit ─────────────────────────────────── */

app.put('/api/requests/bulk/submit-to-pm-office', async (req, res) => {
  try {
    const { requestIds, role, actorEmail, actorId, comment } = req.body;
    const ids = [
      ...new Set((requestIds || []).map((id) => Number(id)).filter(Boolean)),
    ];

    if (!ids.length) {
      return res.status(400).json({ error: 'Select at least one request.' });
    }

    if (!['protocol', 'admin', 'super_admin'].includes(role)) {
      return res.status(403).json({
        error: 'Only Protocol can submit bulk requests to PM Office.',
      });
    }

    const actor = await getActorUser({ actorId, actorEmail });

    if (!['admin', 'super_admin'].includes(role)) {
      if (!actor) {
        return res.status(403).json({
          error: 'Unable to verify the acting user.',
        });
      }

      if (!getRolesForLookup(role).includes(actor.role)) {
        return res.status(403).json({
          error: 'Logged-in account does not match the submitted role.',
        });
      }
    }

    const existing = await query(
      `SELECT *
       FROM requests
       WHERE id = ANY($1::int[])
       ORDER BY id ASC`,
      [ids]
    );

    const validRequests = existing.rows.filter(
      (request) =>
        request.current_stage === STAGES.PM_OFFICE_SUBMISSION &&
        request.final_status === STATUS.PENDING
    );

    if (!validRequests.length) {
      return res.status(400).json({
        error: 'No selected requests are ready for PM Office submission.',
      });
    }

    const validIds = validRequests.map((request) => request.id);

    const updated = await query(
      `UPDATE requests
       SET status='Submitted to PM Office',
           current_stage=$1,
           final_status=$2,
           decision_comment=COALESCE($3,decision_comment),
           last_decision_by=COALESCE($4,last_decision_by),
           last_decision_at=NOW(),
           foreign_affairs_status='submitted',
           foreign_affairs_comment=COALESCE($3,foreign_affairs_comment),
           foreign_affairs_updated_at=NOW()
       WHERE id = ANY($5::int[])
       RETURNING *`,
      [
        STAGES.PM_OFFICE,
        STATUS.PENDING,
        comment || null,
        actorId || null,
        validIds,
      ]
    );

    for (const request of updated.rows) {
      await addAudit({
        requestId: request.id,
        action: 'bulk_submit_to_pm_office',
        actorRole: role,
        actorEmail,
        comment: comment || 'Bulk submitted to PM Office by Protocol.',
        oldStage: STAGES.PM_OFFICE_SUBMISSION,
        newStage: STAGES.PM_OFFICE,
        oldStatus: STATUS.PENDING,
        newStatus: STATUS.PENDING,
      });

      await addNotification({
        userEmail: request.email,
        title: 'Travel Request Submitted to PM Office',
        message: `Your request to ${request.country} was submitted to the PM Office.`,
      });
    }

    const pmOfficeUser = await getFirstUserForStage(
      STAGES.PM_OFFICE,
      updated.rows[0]
    );

    if (pmOfficeUser) {
      await taskEmail({
        to: pmOfficeUser.email,
        recipientName: pmOfficeUser.full_name,
        request: updated.rows[0],
        stageName: 'PM Office Follow-up',
        actionUrl: FRONTEND_URL,
      });

      await addNotification({
        userEmail: pmOfficeUser.email,
        title: 'Bulk PM Office Submission',
        message: `${updated.rowCount} travel request${
          updated.rowCount === 1 ? '' : 's'
        } were submitted to the PM Office queue.`,
      });
    }

    res.json({
      message: `${updated.rowCount} request${
        updated.rowCount === 1 ? '' : 's'
      } submitted to PM Office.`,
      submittedCount: updated.rowCount,
      skippedCount: ids.length - validIds.length,
      requests: updated.rows,
    });
  } catch (e) {
    console.error('BULK PM OFFICE SUBMIT ERROR:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/requests/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorEmail, actorId, role } = req.body;

    const existing = (
      await query(`SELECT * FROM requests WHERE id=$1`, [id])
    ).rows[0];

    if (!existing) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (
      existing.current_stage !== STAGES.EXPERT_PREPARATION ||
      !['pending', 'amended'].includes(existing.final_status)
    ) {
      return res.status(400).json({
        error: 'Only returned requests can be resubmitted.',
      });
    }

    const isAffiliateRequest =
      existing.traveler_category === 'affiliate_institution';
    const actor = await getActorUser({ actorId, actorEmail });
    const firstReviewStage = getInitialReviewStage(existing, actor);
    const nextStage = await resolveNextStageSkippingSelf(
      firstReviewStage,
      existing,
      actor
    );
    const displayStatus = isAffiliateRequest
      ? nextStage === STAGES.OFFICE_HEAD_REVIEW
        ? 'Resubmitted to Director General Review'
        : `Resubmitted to ${getStageName(nextStage)}`
      : `Resubmitted to ${getStageName(nextStage)}`;
    const nextStageName = isAffiliateRequest
      ? nextStage === STAGES.OFFICE_HEAD_REVIEW
        ? 'Director General Review'
        : getStageName(nextStage)
      : getStageName(nextStage);

    const nextApprover = await getFirstUserForStage(nextStage, existing);

    if (!nextApprover) {
      const nextStageLabel =
        nextStage === STAGES.OFFICE_HEAD_REVIEW && isAffiliateRequest
          ? 'Affiliate Institution Director General'
          : nextStageName;

      return res.status(400).json({
        error: `No active ${nextStageLabel} approver is configured for this request.`,
      });
    }

    const r = await query(
      `UPDATE requests
       SET current_stage=$1,
           final_status=$2,
           status=$3,
           last_decision_at=NOW()
       WHERE id=$4
       RETURNING *`,
      [
        nextStage,
        STATUS.PENDING,
        displayStatus,
        id,
      ]
    );

    const req2 = r.rows[0];

    await addAudit({
      requestId: req2.id,
      action: 'resubmit',
      actorRole: role || 'traveler',
      actorEmail: actorEmail || existing.email,
      comment: 'Traveler resubmitted corrected request.',
      oldStage: existing.current_stage,
      newStage: nextStage,
      oldStatus: existing.final_status,
      newStatus: STATUS.PENDING,
    });

    await addNotification({
      userEmail: req2.email,
      title: 'Travel Request Resubmitted',
      message: `Your corrected request to ${safeText(
        req2.country
      )} has been resubmitted to ${nextStageName}.`,
    });

    await travelerEmail({
      request: req2,
      status: 'resubmit',
      displayStatus,
    });

    if (nextApprover) {
      await taskEmail({
        to: nextApprover.email,
        recipientName: nextApprover.full_name,
        request: req2,
        stageName: nextStageName,
        actionUrl: FRONTEND_URL,
      });

      await addNotification({
        userEmail: nextApprover.email,
        title: 'New FTMS Task Assigned',
        message: `A corrected travel request from ${safeText(
          req2.full_name
        )} is waiting for ${nextStageName}.`,
      });
    }

    res.json({
      message: 'Request resubmitted.',
      request: req2,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Requests: Delete + Audit ───────────────────────────── */

app.delete('/api/requests/:id', async (req, res) => {
  try {
    await query(`DELETE FROM requests WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Request deleted.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/audit-trail', async (_req, res) => {
  try {
    const r = await query(
      `SELECT
        a.id,
        a.request_id,
        a.action,
        a.actor_role,
        a.actor_email,
        a.comment,
        a.old_stage,
        a.new_stage,
        a.old_status,
        a.new_status,
        a.created_at,
        r.full_name,
        r.email AS traveler_email,
        r.country,
        r.sector,
        r.department,
        r.workflow_type,
        r.current_stage,
        r.status AS current_status,
        r.final_status
       FROM request_audit_trails a
       LEFT JOIN requests r ON r.id = a.request_id
       ORDER BY a.created_at DESC, a.id DESC`
    );

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/requests/:id/audit-trail', async (req, res) => {
  try {
    const r = await query(
      `SELECT
        a.*,
        r.full_name,
        r.email AS traveler_email,
        r.country,
        r.sector,
        r.department,
        r.workflow_type,
        r.current_stage,
        r.status AS current_status,
        r.final_status
       FROM request_audit_trails a
       LEFT JOIN requests r ON r.id = a.request_id
       WHERE a.request_id=$1
       ORDER BY a.created_at ASC, a.id ASC`,
      [req.params.id]
    );

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Approvers / Workflow Users ─────────────────────────── */

app.get('/api/state-ministers', async (_req, res) => {
  try {
    const r = await query(
      `SELECT
        id,
        sector,
        department,
        full_name,
        email,
        role,
        account_status
       FROM users
       WHERE role = ANY($1)
       ORDER BY role ASC, sector ASC, department ASC, full_name ASC`,
      [APPROVER_ROLES]
    );

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/state-ministers', async (req, res) => {
  try {
    const { sector, department, fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required.' });
    }

    if (!APPROVER_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const ne = normalizeEmail(email);

    const exists = await query(
      `SELECT id FROM users WHERE LOWER(TRIM(email))=$1`,
      [ne]
    );

    if (exists.rows.length) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const r = await query(
      `INSERT INTO users(
        sector,
        department,
        full_name,
        email,
        password,
        role,
        account_status,
        is_active
      )
      VALUES($1,$2,$3,$4,$5,$6,'active',true)
      RETURNING id,sector,department,full_name,email,role`,
      [sector || null, department || null, fullName, ne, hashed, role]
    );

    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/state-ministers/:id', async (req, res) => {
  try {
    const { sector, department, fullName, email, role } = req.body;

    if (!APPROVER_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const r = await query(
      `UPDATE users
       SET sector=$1,
           department=$2,
           full_name=$3,
           email=$4,
           role=$5
       WHERE id=$6
       RETURNING id,sector,department,full_name,email,role`,
      [
        sector || null,
        department || null,
        fullName,
        normalizeEmail(email),
        role,
        req.params.id,
      ]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: 'Approver not found.' });
    }

    res.json({
      message: 'Approver updated.',
      approver: r.rows[0],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/state-ministers/:id', async (req, res) => {
  try {
    await query(
      `DELETE FROM users
       WHERE id=$1 AND role=ANY($2)`,
      [req.params.id, APPROVER_ROLES]
    );

    res.json({ message: 'Approver deleted.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Users ──────────────────────────────────────────────── */

app.get('/api/users', async (_req, res) => {
  try {
    const r = await query(
      `SELECT
        id,
        full_name,
        email,
        phone,
        position,
        sector,
        department,
        role,
        is_active,
        account_status
       FROM users
       WHERE role <> 'super_admin'
       ORDER BY id DESC`
    );

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/pending', authenticateUser, requireAdmin, async (_req, res) => {
  try {
    const r = await query(
      `SELECT
        id,
        full_name,
        email,
        phone,
        position,
        organization_type,
        organization_name,
        sector,
        department,
        role,
        account_status
       FROM users
       WHERE account_status='pending'
       ORDER BY id DESC`
    );

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({
      error: 'Failed to fetch pending users.',
    });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      phone,
      position,
      sector,
      department,
    } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required.' });
    }

    const ne = normalizeEmail(email);

    const exists = await query(
      `SELECT id FROM users WHERE LOWER(TRIM(email))=$1`,
      [ne]
    );

    if (exists.rows.length) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const r = await query(
      `INSERT INTO users(
        full_name,
        email,
        password,
        role,
        phone,
        position,
        sector,
        department,
        account_status,
        is_active
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'active',true)
      RETURNING id,full_name,email,role,phone,position,sector,department,account_status`,
      [
        fullName,
        ne,
        hashed,
        role,
        phone === undefined ? null : normalizePhone(phone),
        position || null,
        sector || null,
        department || null,
      ]
    );

    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id/approve', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const r = await query(
      `UPDATE users
       SET account_status='active',
           is_active=true
       WHERE id=$1
         AND account_status='pending'
       RETURNING id,full_name,email,role,account_status`,
      [req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: 'Pending user not found or already reviewed.',
      });
    }

    await accountEmail(r.rows[0], true);

    res.json({
      message: 'User approved.',
      user: r.rows[0],
    });
  } catch (e) {
    res.status(500).json({
      error: 'Failed to approve user.',
    });
  }
});

app.put('/api/users/:id/reject', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const r = await query(
      `UPDATE users
       SET account_status='rejected',
           is_active=false
       WHERE id=$1
         AND account_status='pending'
       RETURNING id,full_name,email,role,account_status`,
      [req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: 'Pending user not found or already reviewed.',
      });
    }

    await accountEmail(r.rows[0], false);

    res.json({
      message: 'User rejected.',
      user: r.rows[0],
    });
  } catch (e) {
    res.status(500).json({
      error: 'Failed to reject user.',
    });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const {
      fullName,
      email,
      role,
      phone,
      position,
      sector,
      department,
      accountStatus,
      isActive,
    } = req.body;

    const r = await query(
      `UPDATE users SET
        full_name=COALESCE($1,full_name),
        email=COALESCE($2,email),
        role=COALESCE($3,role),
        phone=COALESCE($4,phone),
        position=COALESCE($5,position),
        sector=CASE WHEN $10 THEN $6 ELSE sector END,
        department=CASE WHEN $11 THEN $7 ELSE department END,
        account_status=COALESCE($8,account_status),
        is_active=COALESCE($9,is_active)
       WHERE id=$12
       RETURNING id,full_name,email,role,phone,position,sector,department,is_active,account_status`,
      [
        fullName || null,
        email ? normalizeEmail(email) : null,
        role || null,
        normalizePhone(phone),
        position || null,
        sector === undefined ? null : sector || null,
        department === undefined ? null : department || null,
        accountStatus || null,
        typeof isActive === 'boolean' ? isActive : null,
        sector !== undefined,
        department !== undefined,
        req.params.id,
      ]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      message: 'User updated.',
      user: r.rows[0],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const check = (
      await query(`SELECT id,role FROM users WHERE id=$1`, [req.params.id])
    ).rows[0];

    if (!check) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (check.role === 'super_admin') {
      return res.status(403).json({
        error: 'Cannot delete super admin.',
      });
    }

    await query(`DELETE FROM users WHERE id=$1`, [req.params.id]);

    res.json({ message: 'User deleted.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'New password required.',
      });
    }

    const passwordError = validatePasswordStrength(newPassword);

    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const check = (
      await query(`SELECT id,role FROM users WHERE id=$1`, [req.params.id])
    ).rows[0];

    if (!check) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (check.role === 'super_admin') {
      return res.status(403).json({
        error: 'Cannot reset super admin password here.',
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await query(`UPDATE users SET password=$1 WHERE id=$2`, [
      hashed,
      req.params.id,
    ]);

    res.json({ message: 'Password reset.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Both passwords required.',
      });
    }

    const passwordError = validatePasswordStrength(newPassword);

    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = (
      await query(`SELECT * FROM users WHERE id=$1`, [req.params.id])
    ).rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.password);

    if (!passwordOk) {
      return res.status(400).json({
        error: 'Current password incorrect.',
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await query(`UPDATE users SET password=$1 WHERE id=$2`, [
      hashed,
      req.params.id,
    ]);

    res.json({ message: 'Password updated.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
/* ── Stats & Dashboard ──────────────────────────────────── */

app.get('/api/stats', async (req, res) => {
  try {
    const { role } = req.query;
    const scope =
      role === 'pm_office'
        ? `WHERE current_stage IN ('pm_office_followup','foreign_affairs_followup')
             AND final_status='pending'`
        : '';
    const scopedStatusAnd = scope ? 'AND' : 'WHERE';

    const [[total], [approved], [pending], [rejected]] = await Promise.all(
      [
        query(`SELECT COUNT(*)::int AS count FROM requests ${scope}`),
        query(
          `SELECT COUNT(*)::int AS count
           FROM requests
           ${scope}
           ${scopedStatusAnd} final_status='approved'`
        ),
        query(
          `SELECT COUNT(*)::int AS count
           FROM requests
           ${scope}
           ${scopedStatusAnd} final_status='pending'`
        ),
        query(
          `SELECT COUNT(*)::int AS count
           FROM requests
           ${scope}
           ${scopedStatusAnd} final_status='rejected'`
        ),
      ].map((p) => p.then((r) => r.rows))
    );

    res.json({
      totalRequests: total.count,
      approvedRequests: approved.count,
      pendingRequests: pending.count,
      rejectedRequests: rejected.count,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/dashboard/pending-by-sector', async (req, res) => {
  try {
    const { role } = req.query;
    const se = SECTOR_EXPR;

    const base = `
      SELECT ${se} AS sector,
             COUNT(*)::int AS pending_count
      FROM requests r
      LEFT JOIN users traveler
        ON LOWER(TRIM(r.email))=LOWER(TRIM(traveler.email))
    `;

    const stageMap = {
      chief_executive_officer: `r.current_stage='ceo_review'`,
      ceo: `r.current_stage='ceo_review'`,
      office_head: `r.current_stage IN ('office_head_review','office_head_final')`,
      lead_executive_officer: `r.current_stage='lead_executive_review'`,
      lead_executive: `r.current_stage='lead_executive_review'`,
      state_minister: `r.current_stage='state_minister_review'`,
      protocol: `r.current_stage IN ('protocol_clearance','pm_office_submission')`,
      pm_office: `r.current_stage IN ('pm_office_followup','foreign_affairs_followup')`,
      minister: `r.current_stage='minister_review'`,
    };

    const stageFilter = ['admin', 'super_admin'].includes(role)
      ? ''
      : stageMap[role]
      ? `AND ${stageMap[role]}`
      : null;

    if (stageFilter === null) {
      return res.json([]);
    }

    const r = await query(`
      ${base}
      WHERE r.final_status='pending'
      ${stageFilter}
      GROUP BY ${se}
      ORDER BY pending_count DESC
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Reports ────────────────────────────────────────────── */

app.get('/api/reports/status-summary', async (_req, res) => {
  try {
    const r = await query(`
      SELECT COALESCE(final_status,'pending') AS status,
             COUNT(*)::int AS count
      FROM requests
      GROUP BY 1
      ORDER BY 1
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reports/sector-status', async (_req, res) => {
  try {
    const r = await query(`
      SELECT
        CASE
          WHEN r.traveler_category='affiliate_institution'
          THEN 'Affiliate Institute'
          ELSE COALESCE(r.sector,u.sector,'Unassigned')
        END AS sector,
        COALESCE(r.final_status,'pending') AS final_status,
        COUNT(*)::int AS count
      FROM requests r
      LEFT JOIN users u
        ON LOWER(TRIM(r.email))=LOWER(TRIM(u.email))
      GROUP BY 1,2
      ORDER BY 1
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reports/monthly-requests', async (_req, res) => {
  try {
    const r = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month',start_date),'Mon YYYY') AS month,
        DATE_TRUNC('month',start_date) AS month_date,
        COUNT(*)::int AS total
      FROM requests
      WHERE start_date IS NOT NULL
        AND final_status='approved'
      GROUP BY DATE_TRUNC('month',start_date)
      ORDER BY 2
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reports/stage-summary', async (_req, res) => {
  try {
    const r = await query(`
      SELECT
        COALESCE(current_stage,'expert_preparation') AS current_stage,
        COUNT(*)::int AS count
      FROM requests
      GROUP BY 1
      ORDER BY 1
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reports/office-minister-summary', async (_req, res) => {
  try {
    const [moa, sector, affiliate] = await Promise.all([
      query(`
        SELECT
          CASE
            WHEN traveler_category='affiliate_institution'
            THEN 'Affiliate Institute'
            ELSE 'MoA'
          END AS name,
          COUNT(*)::int AS count
        FROM requests
        WHERE final_status IN ('approved','rejected','pending','amended')
        GROUP BY 1
        ORDER BY 1
      `),

      query(`
        SELECT
          COALESCE(r.sector,u.sector,'Unassigned Sector') AS name,
          COUNT(*)::int AS count
        FROM requests r
        LEFT JOIN users u
          ON LOWER(TRIM(r.email))=LOWER(TRIM(u.email))
        WHERE r.traveler_category<>'affiliate_institution'
          AND r.final_status IN ('approved','rejected','pending','amended')
        GROUP BY 1
        ORDER BY 2 DESC
      `),

      query(`
        SELECT
          COALESCE(organization_name,'Unassigned Organization') AS name,
          COUNT(*)::int AS count
        FROM requests
        WHERE traveler_category='affiliate_institution'
          AND final_status IN ('approved','rejected','pending','amended')
        GROUP BY 1
        ORDER BY 2 DESC
      `),
    ]);

    res.json({
      moaVsAffiliate: moa.rows,
      moaBySector: sector.rows,
      affiliateByOrganization: affiliate.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── PDF Generation ─────────────────────────────────────── */

app.get('/api/generate-pdf/:id', async (req, res) => {
  try {
    const r = (
      await query(`SELECT * FROM requests WHERE id=$1`, [req.params.id])
    ).rows[0];

    if (!r) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const supportLetterStages = [
      STAGES.PM_OFFICE_SUBMISSION,
      STAGES.PM_OFFICE,
      'foreign_affairs_followup',
      STAGES.COMPLETED,
    ];

    if (
      !supportLetterStages.includes(r.current_stage) &&
      r.final_status !== STATUS.APPROVED
    ) {
      return res.status(400).json({
        error:
          'The PM Office support letter is generated only after the request is approved for PM Office submission.',
      });
    }

    const pdfDir = path.join(__dirname, 'pdfs');

    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filePath = path.join(pdfDir, `travel-request-${req.params.id}.pdf`);
    const fontPath = path.join(
      __dirname,
      'fonts',
      'NotoSansEthiopic-Regular.ttf'
    );
    const logoCandidates = [
      path.join(__dirname, '..', 'frontend', 'public', 'ministry-logo.png'),
      path.join(__dirname, '..', 'frontend', 'src', 'assets', 'ministry-logo.png'),
      path.join(__dirname, 'ministry-logo.png'),
    ];
    const logoPath = logoCandidates.find((item) => fs.existsSync(item));

    const doc = new PDFDocument({ size: 'A4', margin: 46 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    if (fs.existsSync(fontPath)) doc.font(fontPath);

    const page = {
      left: doc.page.margins.left,
      right: doc.page.width - doc.page.margins.right,
      top: doc.page.margins.top,
      bottom: doc.page.height - doc.page.margins.bottom,
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    };
    const generatedDate = new Date();
    const refNo = `FTMS/${r.id}/${generatedDate.getFullYear()}`;
    const travelDates = formatTravelDateRangeAmharic(r.start_date, r.end_date);
    const travelerName = safeText(r.full_name, '-');
    const position = safeText(r.position, '-');
    const organization = safeText(r.organization_name || r.sector, '-');
    const destination = safeText(r.country, '-');
    const purpose = safeText(r.purpose, 'የውጭ ጉዞ ተልዕኮ');
    const sponsor = safeText(r.sponsor, '-');
    const passport = safeText(r.passport_number, '-');
    const recipient = 'ጠቅላይ ሚኒስትር ጽ/ቤት';

    const drawLine = (y, color = '#606975', width = 1) => {
      doc
        .save()
        .strokeColor(color)
        .lineWidth(width)
        .moveTo(page.left, y)
        .lineTo(page.right, y)
        .stroke()
        .restore();
    };

    if (logoPath) {
      doc.image(logoPath, page.left, page.top - 10, { fit: [150, 92] });
    } else {
      doc
        .fontSize(16)
        .fillColor('#173f35')
        .text('MINISTRY OF AGRICULTURE', page.left, page.top + 18);
    }

    drawLine(128, '#5b6470', 1.4);

    doc
      .fontSize(12)
      .fillColor('#4b5563')
      .text('ቁጥር', 395, 146)
      .text('Ref. No', 395, 162)
      .fillColor('#111827')
      .text(refNo, 455, 162)
      .moveTo(455, 177)
      .lineTo(548, 177)
      .strokeColor('#9ca3af')
      .stroke()
      .fillColor('#4b5563')
      .text('ቀን', 395, 190)
      .text('Date', 395, 206)
      .fillColor('#111827')
      .text(generatedDate.toLocaleDateString('en-GB'), 455, 206)
      .moveTo(455, 221)
      .lineTo(548, 221)
      .strokeColor('#9ca3af')
      .stroke();

    doc
      .fontSize(12.5)
      .fillColor('#111827')
      .text(`ለ${recipient}`, page.left + 70, 255)
      .text('አዲስ አበባ', page.left + 70, 277);

    doc
      .fontSize(13)
      .fillColor('#111827')
      .text('ጉዳዩ፡- የውጭ አገር የጉዞ ፈቃድን ይመለከታል፤', page.left, 330, {
        align: 'center',
        underline: true,
      });

    const paragraphOptions = {
      width: page.width - 85,
      align: 'justify',
      lineGap: 5,
    };

    doc
      .fontSize(12.2)
      .fillColor('#374151')
      .text(
        `የ${organization} ሰራተኛ የሆኑት ${travelerName} (${position}) ወደ ${destination} ለሚያደርጉት የውጭ አገር ጉዞ ጥያቄ  በስራ ሂደት ተገምግሞ በሚኒስቴሩ የተፈቀደ በመሆኑ ለጠቅላይ ሚኒስትር ጽ/ቤት የሚቀርብ የድጋፍ ደብዳቤ ነው።`,
        page.left + 45,
        372,
        paragraphOptions
      )
      .moveDown(1.2)
      .text(
        `ጉዞው ከ${travelDates} ድረስ የሚካሄድ ሲሆን ዋና ዓላማው ${purpose} ነው። የጉዞው ወጪ የሚሸፈነው በ${sponsor} ሲሆን የፓስፖርት ቁጥር ${passport} ነው።`,
        paragraphOptions
      )
      .moveDown(1.2)
      .text(
        'በመሆኑም ከላይ የተጠቀሰውን የጉዞ ጥያቄ እንዲፈቀድላቸው በአክብሮት እንጠያቃለን፡፡',
        paragraphOptions
      );

    const signatureTop = 620;
    doc
      .fontSize(12.5)
      .fillColor('#374151')
      .text('ከሰላምታ ጋር', 394, signatureTop)
      .moveTo(395, signatureTop + 42)
      .lineTo(548, signatureTop + 42)
      .strokeColor('#9ca3af')
      .stroke()
      .fontSize(11.5)
      // .text('የተፈቀደ ፊርማ', 420, signatureTop + 52);

    doc
      .save()
      .circle(285, signatureTop + 72, 48)
      .strokeColor('#64748b')
      .lineWidth(1)
      .dash(4, { space: 3 })
      .stroke()
      .undash()
      .fontSize(10)
      .fillColor('#64748b')
      .text('OFFICIAL STAMP', 240, signatureTop + 68, {
        width: 90,
        align: 'center',
      })
      .restore();

    drawLine(page.bottom - 64, '#206cc9', 1);
    doc
      .fontSize(9.5)
      .fillColor('#64748b')
      .text('+251 116 411969/71', page.left, page.bottom - 50, {
        width: 160,
      })
      .text('info@moa.gov.et', page.left + 210, page.bottom - 50, {
        width: 130,
      })
      .text('www.moa.gov.et', page.left + 385, page.bottom - 50, {
        width: 120,
      })
      .text(
        'Bole Sub City, Woreda 06, Gurd Shola, Addis Ababa, Ethiopia',
        page.left,
        page.bottom - 30,
        {
          width: page.width,
          align: 'center',
        }
      );

    doc.end();

    stream.on('finish', () => res.download(filePath));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/generate-pdf-summary/:id', async (req, res) => {
  try {
    const r = (
      await query(`SELECT * FROM requests WHERE id=$1`, [req.params.id])
    ).rows[0];

    if (!r) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const pdfDir = path.join(__dirname, 'pdfs');

    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filePath = path.join(pdfDir, `travel-request-${req.params.id}.pdf`);
    const fontPath = path.join(
      __dirname,
      'fonts',
      'NotoSansEthiopic-Regular.ttf'
    );

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const addPage = (title, subtitle, fields) => {
      if (fs.existsSync(fontPath)) {
        doc.font(fontPath);
      }

      doc.fontSize(22).text(title, { align: 'center' }).moveDown();
      doc.fontSize(18).text(subtitle, { align: 'center' }).moveDown(2);
      doc.fontSize(13);

      fields.forEach(([label, val]) => {
        doc.text(`${label}: ${safeText(val)}`).moveDown();
      });

      doc.moveDown(2).text('Authorized Signature: __________________');
    };

    addPage('Ministry of Agriculture', 'Foreign Travel Request Summary', [
      ['Traveler Name', r.full_name],
      ['Position', r.position],
      ['Department', r.department],
      ['Sector', r.sector],
      ['Workflow Type', r.workflow_type],
      ['Current Stage', getStageName(r.current_stage)],
      ['Destination Country', r.country],
      ['Travel Dates', formatTravelDateRange(r.start_date, r.end_date)],
      ['Purpose', r.purpose],
      ['Sponsor', r.sponsor],
      ['Passport Number', r.passport_number],
      ['System Status', r.status],
      ['Final Status', r.final_status],
      ['PM Office Status', r.foreign_affairs_status],
    ]);

    doc.addPage();

    addPage('የግብርና ሚኒስቴር', 'የውጭ ጉዞ ጥያቄ ማጠቃለያ', [
      ['ተጓዥ', r.full_name],
      ['የስራ መደብ', r.position],
      ['የስራ ክፍል', r.department],
      ['ሴክተር', r.sector],
      ['የሚሄዱበት ሀገር', r.country],
      ['የጉዞ ቀን', formatTravelDateRangeAmharic(r.start_date, r.end_date)],
      ['የጉዞ ዓላማ', r.purpose],
      ['ስፖንሰር', r.sponsor],
      ['ፓስፖርት ቁጥር', r.passport_number],
      ['ሁኔታ', r.status],
      ['የመጨረሻ ሁኔታ', r.final_status],
    ]);

    doc.end();

    stream.on('finish', () => res.download(filePath));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── MoA Sector / Office Settings ───────────────────────── */

const WORKFLOW_TYPE_LABELS = {
  sector_structure: 'State Minister / Sector Structure',
  ceo_structure: 'CEO Structure',
  office_head_structure: 'Office Head Structure',
  minister_structure: 'Minister Structure',
};

const ALLOWED_WORKFLOW_TYPES = Object.keys(WORKFLOW_TYPE_LABELS);

app.get('/api/moa-sectors', async (_req, res) => {
  try {
    const r = await query(`
      SELECT id,name,workflow_type,created_at
      FROM moa_sectors
      ORDER BY name ASC
    `);

    res.json(r.rows);
  } catch (e) {
    console.error('FETCH MOA SECTORS ERROR:', e);

    res.status(500).json({
      error: e.message || 'Failed to fetch MoA Sector / Office list.',
    });
  }
});

app.post('/api/moa-sectors', async (req, res) => {
  try {
    const { name, workflowType } = req.body;
    const cleanName = String(name || '').trim();

    if (!cleanName || !workflowType) {
      return res.status(400).json({
        error: 'Sector / Office name and workflow type are required.',
      });
    }

    if (!ALLOWED_WORKFLOW_TYPES.includes(workflowType)) {
      return res.status(400).json({
        error: 'Invalid workflow type.',
      });
    }

    const r = await query(
      `INSERT INTO moa_sectors(name,workflow_type)
       VALUES($1,$2)
       RETURNING id,name,workflow_type,created_at`,
      [cleanName, workflowType]
    );

    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('ADD MOA SECTOR ERROR:', e);

    if (e.code === '23505') {
      return res.status(409).json({
        error: 'This Sector / Office already exists.',
      });
    }

    res.status(500).json({
      error: e.message || 'Failed to add Sector / Office.',
    });
  }
});

app.put('/api/moa-sectors/:id', async (req, res) => {
  let client;
  let inTransaction = false;

  try {
    const { name, workflowType } = req.body;
    const cleanName = String(name || '').trim();

    if (!cleanName || !workflowType) {
      return res.status(400).json({
        error: 'Sector / Office name and workflow type are required.',
      });
    }

    if (!ALLOWED_WORKFLOW_TYPES.includes(workflowType)) {
      return res.status(400).json({
        error: 'Invalid workflow type.',
      });
    }

    client = await pool.connect();

    await client.query('BEGIN');
    inTransaction = true;

    const existing = (
      await client.query(`SELECT id,name FROM moa_sectors WHERE id=$1`, [
        req.params.id,
      ])
    ).rows[0];

    if (!existing) {
      await client.query('ROLLBACK');
      inTransaction = false;

      return res.status(404).json({
        error: 'Sector / Office not found.',
      });
    }

    const r = await client.query(
      `UPDATE moa_sectors
       SET name=$1,
           workflow_type=$2
       WHERE id=$3
       RETURNING id,name,workflow_type,created_at`,
      [cleanName, workflowType, req.params.id]
    );

    const usersUpdate = await client.query(
      `UPDATE users
       SET sector=$1
       WHERE LOWER(TRIM(COALESCE(sector,''))) = LOWER(TRIM($2))`,
      [cleanName, existing.name]
    );

    const requestsUpdate = await client.query(
      `UPDATE requests
       SET sector=$1
       WHERE LOWER(TRIM(COALESCE(sector,''))) = LOWER(TRIM($2))`,
      [cleanName, existing.name]
    );

    await client.query('COMMIT');
    inTransaction = false;

    res.json({
      message: 'Sector / Office updated.',
      sector: r.rows[0],
      updatedUsers: usersUpdate.rowCount,
      updatedRequests: requestsUpdate.rowCount,
    });
  } catch (e) {
    if (client && inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('UPDATE MOA SECTOR ERROR:', e);

    if (e.code === '23505') {
      return res.status(409).json({
        error: 'This Sector / Office already exists.',
      });
    }

    res.status(500).json({
      error: e.message || 'Failed to update Sector / Office.',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.delete('/api/moa-sectors/:id', async (req, res) => {
  try {
    const existing = (
      await query(`SELECT id,name FROM moa_sectors WHERE id=$1`, [
        req.params.id,
      ])
    ).rows[0];

    if (!existing) {
      return res.status(404).json({
        error: 'Sector / Office not found.',
      });
    }

    const userCount = Number(
      (
        await query(
          `SELECT COUNT(*) AS count
           FROM users
           WHERE LOWER(TRIM(COALESCE(sector,''))) = LOWER(TRIM($1))`,
          [existing.name]
        )
      ).rows[0].count
    );

    const requestCount = Number(
      (
        await query(
          `SELECT COUNT(*) AS count
           FROM requests
           WHERE LOWER(TRIM(COALESCE(sector,''))) = LOWER(TRIM($1))`,
          [existing.name]
        )
      ).rows[0].count
    );

    if (userCount || requestCount) {
      return res.status(409).json({
        error:
          'This Sector / Office is used by users or travel requests. Reassign them before deleting it.',
        linkedUsers: userCount,
        linkedRequests: requestCount,
      });
    }

    const r = await query(
      `DELETE FROM moa_sectors
       WHERE id=$1
       RETURNING id,name`,
      [req.params.id]
    );

    res.json({
      message: 'Sector / Office deleted.',
      sector: r.rows[0],
    });
  } catch (e) {
    console.error('DELETE MOA SECTOR ERROR:', e);

    res.status(500).json({
      error: e.message || 'Failed to delete Sector / Office.',
    });
  }
});

/* ── MoA Executive Offices ──────────────────────────────── */

app.get('/api/moa-executive-offices', async (req, res) => {
  try {
    const { sectorId } = req.query;

    const params = [];

    let sql = `
      SELECT 
        eo.id,
        eo.sector_id,
        COALESCE(eo.name, eo.office_name) AS name,
        eo.created_at,
        s.name AS sector_name,
        s.workflow_type
      FROM moa_executive_offices eo
      JOIN moa_sectors s ON s.id = eo.sector_id
    `;

    if (sectorId) {
      sql += ` WHERE eo.sector_id = $1 `;
      params.push(sectorId);
    }

    sql += ` ORDER BY s.name ASC, COALESCE(eo.name, eo.office_name) ASC`;

    const r = await query(sql, params);

    res.json(r.rows);
  } catch (e) {
    console.error('FETCH EXECUTIVE OFFICES ERROR:', e);

    res.status(500).json({
      error: e.message || 'Failed to fetch Executive Offices.',
    });
  }
});

app.post('/api/moa-executive-offices', async (req, res) => {
  try {
    const { sectorId, name } = req.body;
    const cleanName = String(name || '').trim();

    if (!sectorId || !cleanName) {
      return res.status(400).json({
        error: 'Sector / Office and Executive Office name are required.',
      });
    }

    const r = await query(
      `INSERT INTO moa_executive_offices(sector_id,name,office_name)
       VALUES($1,$2,$2)
       RETURNING id,sector_id,COALESCE(name,office_name) AS name,created_at`,
      [sectorId, cleanName]
    );

    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('ADD EXECUTIVE OFFICE ERROR:', e);

    if (e.code === '23505') {
      return res.status(409).json({
        error:
          'This Executive Office already exists under the selected Sector / Office.',
      });
    }

    if (e.code === '23503') {
      return res.status(400).json({
        error: 'Selected Sector / Office does not exist.',
      });
    }

    res.status(500).json({
      error: e.message || 'Failed to add Executive Office.',
    });
  }
});

app.put('/api/moa-executive-offices/:id', async (req, res) => {
  let client;
  let inTransaction = false;

  try {
    const { sectorId, name } = req.body;
    const cleanName = String(name || '').trim();

    if (!sectorId || !cleanName) {
      return res.status(400).json({
        error: 'Sector / Office and Executive Office name are required.',
      });
    }

    client = await pool.connect();

    await client.query('BEGIN');
    inTransaction = true;

    const existing = (
      await client.query(
        `SELECT eo.id,
                eo.sector_id,
                COALESCE(eo.name, eo.office_name) AS name,
                s.name AS sector_name
         FROM moa_executive_offices eo
         JOIN moa_sectors s ON s.id = eo.sector_id
         WHERE eo.id=$1`,
        [req.params.id]
      )
    ).rows[0];

    if (!existing) {
      await client.query('ROLLBACK');
      inTransaction = false;

      return res.status(404).json({
        error: 'Executive Office not found.',
      });
    }

    const targetSector = (
      await client.query(`SELECT id,name FROM moa_sectors WHERE id=$1`, [
        sectorId,
      ])
    ).rows[0];

    if (!targetSector) {
      await client.query('ROLLBACK');
      inTransaction = false;

      return res.status(400).json({
        error: 'Selected Sector / Office does not exist.',
      });
    }

    const r = await client.query(
      `UPDATE moa_executive_offices
       SET sector_id=$1,
           name=$2,
           office_name=$2
       WHERE id=$3
       RETURNING id,sector_id,COALESCE(name,office_name) AS name,created_at`,
      [sectorId, cleanName, req.params.id]
    );

    const usersUpdate = await client.query(
      `UPDATE users
       SET department=$1,
           sector=$2
       WHERE LOWER(TRIM(COALESCE(department,''))) = LOWER(TRIM($3))
         AND (
           sector IS NULL
           OR TRIM(COALESCE(sector,'')) = ''
           OR LOWER(TRIM(sector)) = LOWER(TRIM($4))
         )`,
      [cleanName, targetSector.name, existing.name, existing.sector_name]
    );

    const requestsUpdate = await client.query(
      `UPDATE requests
       SET department=$1,
           sector=$2
       WHERE LOWER(TRIM(COALESCE(department,''))) = LOWER(TRIM($3))
         AND (
           sector IS NULL
           OR TRIM(COALESCE(sector,'')) = ''
           OR LOWER(TRIM(sector)) = LOWER(TRIM($4))
         )`,
      [cleanName, targetSector.name, existing.name, existing.sector_name]
    );

    await client.query('COMMIT');
    inTransaction = false;

    res.json({
      message: 'Executive Office updated.',
      executiveOffice: r.rows[0],
      updatedUsers: usersUpdate.rowCount,
      updatedRequests: requestsUpdate.rowCount,
    });
  } catch (e) {
    if (client && inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('UPDATE EXECUTIVE OFFICE ERROR:', e);

    if (e.code === '23505') {
      return res.status(409).json({
        error:
          'This Executive Office already exists under the selected Sector / Office.',
      });
    }

    if (e.code === '23503') {
      return res.status(400).json({
        error: 'Selected Sector / Office does not exist.',
      });
    }

    res.status(500).json({
      error: e.message || 'Failed to update Executive Office.',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.delete('/api/moa-executive-offices/:id', async (req, res) => {
  try {
    const existing = (
      await query(
        `SELECT eo.id,
                COALESCE(eo.name, eo.office_name) AS name,
                s.name AS sector_name
         FROM moa_executive_offices eo
         JOIN moa_sectors s ON s.id = eo.sector_id
         WHERE eo.id=$1`,
        [req.params.id]
      )
    ).rows[0];

    if (!existing) {
      return res.status(404).json({
        error: 'Executive Office not found.',
      });
    }

    const userCount = Number(
      (
        await query(
          `SELECT COUNT(*) AS count
           FROM users
           WHERE LOWER(TRIM(COALESCE(department,''))) = LOWER(TRIM($1))
             AND (
               sector IS NULL
               OR TRIM(COALESCE(sector,'')) = ''
               OR LOWER(TRIM(sector)) = LOWER(TRIM($2))
             )`,
          [existing.name, existing.sector_name]
        )
      ).rows[0].count
    );

    const requestCount = Number(
      (
        await query(
          `SELECT COUNT(*) AS count
           FROM requests
           WHERE LOWER(TRIM(COALESCE(department,''))) = LOWER(TRIM($1))
             AND (
               sector IS NULL
               OR TRIM(COALESCE(sector,'')) = ''
               OR LOWER(TRIM(sector)) = LOWER(TRIM($2))
             )`,
          [existing.name, existing.sector_name]
        )
      ).rows[0].count
    );

    if (userCount || requestCount) {
      return res.status(409).json({
        error:
          'This Executive Office is used by users or travel requests. Reassign them before deleting it.',
        linkedUsers: userCount,
        linkedRequests: requestCount,
      });
    }

    const r = await query(
      `DELETE FROM moa_executive_offices
       WHERE id=$1
       RETURNING id,COALESCE(name,office_name) AS name`,
      [req.params.id]
    );

    res.json({
      message: 'Executive Office deleted.',
      executiveOffice: r.rows[0],
    });
  } catch (e) {
    console.error('DELETE EXECUTIVE OFFICE ERROR:', e);

    res.status(500).json({
      error: e.message || 'Failed to delete Executive Office.',
    });
  }
});

/* ── Affiliate Institutions ─────────────────────────────── */

app.get('/api/affiliate-institutions', async (_req, res) => {
  try {
    const r = await query(`
      SELECT id,organization_name,general_director_name,email,phone,created_at
      FROM affiliate_institutions
      ORDER BY organization_name ASC
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/affiliate-institutions', async (req, res) => {
  let client;
  let inTransaction = false;

  try {
    const { organizationName, generalDirectorName, email, phone, password } =
      req.body;
    const cleanOrganizationName = String(organizationName || '').trim();

    if (!cleanOrganizationName) {
      return res.status(400).json({
        error: 'Organization name is required.',
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;

    const r = await client.query(
      `INSERT INTO affiliate_institutions(
        organization_name,
        general_director_name,
        email,
        phone
      )
      VALUES($1,$2,$3,$4)
      RETURNING *`,
      [
        cleanOrganizationName,
        generalDirectorName || null,
        email ? normalizeEmail(email) : null,
        normalizePhone(phone),
      ]
    );

    const directorGeneral = await syncAffiliateDirectorGeneral(client, {
      organizationName: cleanOrganizationName,
      generalDirectorName,
      email,
      phone,
      password,
    });

    await client.query('COMMIT');
    inTransaction = false;

    res.status(201).json({
      ...r.rows[0],
      directorGeneral,
    });
  } catch (e) {
    if (client && inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }

    if (e.code === '23505') {
      return res.status(409).json({
        error: 'This organization already exists.',
      });
    }

    res.status(e.statusCode || 500).json({ error: e.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.put('/api/affiliate-institutions/:id', async (req, res) => {
  let client;
  let inTransaction = false;

  try {
    const { organizationName, generalDirectorName, email, phone, password } =
      req.body;
    const cleanOrganizationName = String(organizationName || '').trim();

    if (!cleanOrganizationName) {
      return res.status(400).json({
        error: 'Organization name is required.',
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;

    const existing = (
      await client.query(
        `SELECT id,organization_name
         FROM affiliate_institutions
         WHERE id=$1`,
        [req.params.id]
      )
    ).rows[0];

    if (!existing) {
      await client.query('ROLLBACK');
      inTransaction = false;

      return res.status(404).json({
        error: 'Organization not found.',
      });
    }

    const r = await client.query(
      `UPDATE affiliate_institutions
       SET organization_name=$1,
           general_director_name=$2,
           email=$3,
           phone=$4
       WHERE id=$5
       RETURNING *`,
      [
        cleanOrganizationName,
        generalDirectorName || null,
        email ? normalizeEmail(email) : null,
        normalizePhone(phone),
        req.params.id,
      ]
    );

    const requestsUpdate = await client.query(
      `UPDATE requests
       SET organization_name=$1,
           sector=$1
       WHERE traveler_category='affiliate_institution'
         AND (
           LOWER(TRIM(COALESCE(organization_name,''))) = LOWER(TRIM($2))
           OR LOWER(TRIM(COALESCE(sector,''))) = LOWER(TRIM($2))
         )`,
      [cleanOrganizationName, existing.organization_name]
    );

    const directorGeneral = await syncAffiliateDirectorGeneral(client, {
      organizationName: cleanOrganizationName,
      previousOrganizationName: existing.organization_name,
      generalDirectorName,
      email,
      phone,
      password,
    });

    await client.query('COMMIT');
    inTransaction = false;

    res.json({
      message: 'Organization updated.',
      organization: r.rows[0],
      directorGeneral,
      updatedRequests: requestsUpdate.rowCount,
    });
  } catch (e) {
    if (client && inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }

    if (e.code === '23505') {
      return res.status(409).json({
        error: 'This organization already exists.',
      });
    }

    res.status(e.statusCode || 500).json({ error: e.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.delete('/api/affiliate-institutions/:id', async (req, res) => {
  try {
    const r = await query(
      `DELETE FROM affiliate_institutions
       WHERE id=$1
       RETURNING id`,
      [req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: 'Organization not found.',
      });
    }

    res.json({ message: 'Organization deleted.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Notifications ──────────────────────────────────────── */

app.get('/api/notifications', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required.',
      });
    }

    const r = await query(
      `SELECT id,user_email,title,message,is_read,created_at
       FROM notifications
       WHERE LOWER(TRIM(user_email))=LOWER(TRIM($1))
       ORDER BY created_at DESC`,
      [email]
    );

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const r = await query(
      `UPDATE notifications
       SET is_read=true
       WHERE id=$1
       RETURNING *`,
      [req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: 'Notification not found.',
      });
    }

    res.json({
      message: 'Notification marked as read.',
      notification: r.rows[0],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/read-all/:email', async (req, res) => {
  try {
    await query(
      `UPDATE notifications
       SET is_read=true
       WHERE LOWER(TRIM(user_email))=LOWER(TRIM($1))`,
      [req.params.email]
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Fallback ───────────────────────────────────────────── */

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

/* ── Start Server ───────────────────────────────────────── */

app.listen(PORT, () => {
  console.log(`FTMS backend running on port ${PORT}`);
});
