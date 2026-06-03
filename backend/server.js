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

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://196.191.93.43:8080',
  'http://10.10.20.118:8080',
  FRONTEND_URL,
].filter(Boolean);

/* ============================================================
   MIDDLEWARES
============================================================ */

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({
    message: 'FTMS Backend Running',
    status: 'OK',
  });
});

/* ============================================================
   DATABASE SAFETY MIGRATION
   This keeps your old database working with the new approval flow.
============================================================ */

const ensureDatabaseColumns = async () => {
  try {
    await pool.query(`
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

    await pool.query(`
      UPDATE users
      SET account_status = 'active'
      WHERE account_status IS NULL
    `);

    await pool.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS sector VARCHAR(150),
      ADD COLUMN IF NOT EXISTS amendment_comment TEXT,
      ADD COLUMN IF NOT EXISTS amended_by VARCHAR(100)
    `);

    console.log('Database columns checked successfully.');
  } catch (error) {
    console.error('DATABASE COLUMN CHECK ERROR:', error.message);
  }
};

ensureDatabaseColumns();

/* ============================================================
   HELPERS
============================================================ */

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const safeText = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const getFrontendUrl = () => FRONTEND_URL;

const sendEmailSafe = async (mailOptions, errorLabel = 'EMAIL ERROR') => {
  try {
    if (!mailOptions?.to) return;
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(errorLabel, error);
  }
};

const getFirstUserByRole = async (role) => {
  const result = await pool.query(
    `
    SELECT id, full_name, email, role
    FROM users
    WHERE role = $1
      AND COALESCE(account_status, 'active') = 'active'
    ORDER BY id ASC
    LIMIT 1
    `,
    [role]
  );

  return result.rows[0] || null;
};

const sendTaskEmail = async ({
  to,
  recipientName,
  request,
  stageName,
  actionUrl,
}) => {
  if (!to) return;

  await sendEmailSafe(
    {
      from: process.env.EMAIL_USER,
      to,
      subject: `FTMS Task Assigned: ${safeText(request.full_name)} - ${safeText(
        request.country
      )}`,
      html: `
        <div style="font-family: Arial; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">New FTMS Task Assigned</h2>

          <p>Dear <strong>${safeText(recipientName, 'Approver')}</strong>,</p>

          <p>A travel request has been assigned to you for review.</p>

          <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <tr>
              <td><strong>Traveler</strong></td>
              <td>${safeText(request.full_name)}</td>
            </tr>
            <tr>
              <td><strong>Department</strong></td>
              <td>${safeText(request.department)}</td>
            </tr>
            <tr>
              <td><strong>Destination</strong></td>
              <td>${safeText(request.country)}</td>
            </tr>
            <tr>
              <td><strong>Travel Dates</strong></td>
              <td>${safeText(request.start_date)} to ${safeText(request.end_date)}</td>
            </tr>
            <tr>
              <td><strong>Purpose</strong></td>
              <td>${safeText(request.purpose)}</td>
            </tr>
            <tr>
              <td><strong>Stage</strong></td>
              <td>${safeText(stageName)}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;">
            Please log in to FTMS and take the required action.
          </p>

          <p>
            <a href="${actionUrl || getFrontendUrl()}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Open FTMS
            </a>
          </p>

          <p style="margin-top: 30px;">
            Ministry of Agriculture<br/>
            Foreign Travel Management System
          </p>
        </div>
      `,
    },
    'TASK EMAIL ERROR:'
  );
};

const sendTravelerEmail = async ({
  request,
  status,
  displayStatus,
  amendmentComment,
}) => {
  if (!request?.email) return;

  await sendEmailSafe(
    {
      from: process.env.EMAIL_USER,
      to: request.email,
      subject:
        status === 'Amended'
          ? 'Travel Request Requires Amendment'
          : 'Travel Request Status Updated',
      html: `
        <div style="font-family: Arial; padding: 20px; color: #333;">
          <h2>
            ${
              status === 'Amended'
                ? 'Travel Request Requires Amendment'
                : 'Travel Request Status Updated'
            }
          </h2>

          <p>Dear <strong>${safeText(request.full_name, 'Traveler')}</strong>,</p>

          <p>
            Your travel request to
            <strong>${safeText(request.country)}</strong>
            has been updated.
          </p>

          ${
            status === 'Amended'
              ? `<p><strong>Amendment Comment:</strong> ${safeText(
                  amendmentComment
                )}</p>`
              : ''
          }

          <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
            <tr>
              <td><strong>Status</strong></td>
              <td>${safeText(displayStatus)}</td>
            </tr>
          </table>
        </div>
      `,
    },
    'TRAVELER EMAIL ERROR:'
  );
};

const sendAccountActivatedEmail = async (user) => {
  await sendEmailSafe(
    {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'FTMS Account Activated',
      html: `
        <div style="font-family: Arial; padding: 20px; color: #333;">
          <h2 style="color: #16a34a;">FTMS Account Activated</h2>

          <p>Dear <strong>${safeText(user.full_name, 'Traveler')}</strong>,</p>

          <p>
            Your Foreign Travel Management System account has been activated
            by the system administrator.
          </p>

          <p>You can now log in and submit your travel request.</p>

          <p>
            <a href="${getFrontendUrl()}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Open FTMS
            </a>
          </p>

          <p style="margin-top: 30px;">
            Ministry of Agriculture<br/>
            Foreign Travel Management System
          </p>
        </div>
      `,
    },
    'ACCOUNT ACTIVATION EMAIL ERROR:'
  );
};

const sendAccountRejectedEmail = async (user) => {
  await sendEmailSafe(
    {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'FTMS Account Request Rejected',
      html: `
        <div style="font-family: Arial; padding: 20px; color: #333;">
          <h2 style="color: #dc2626;">FTMS Account Request Rejected</h2>

          <p>Dear <strong>${safeText(user.full_name, 'Traveler')}</strong>,</p>

          <p>
            Your FTMS account request was not approved.
            Please contact the system administrator for more information.
          </p>

          <p style="margin-top: 30px;">
            Ministry of Agriculture<br/>
            Foreign Travel Management System
          </p>
        </div>
      `,
    },
    'ACCOUNT REJECTION EMAIL ERROR:'
  );
};

const addNotification = async ({ userEmail, title, message }) => {
  if (!userEmail) return;

  try {
    await pool.query(
      `
      INSERT INTO notifications (
        user_email,
        title,
        message
      )
      VALUES ($1, $2, $3)
      `,
      [userEmail, title, message]
    );
  } catch (error) {
    console.error('NOTIFICATION INSERT ERROR:', error.message);
  }
};

const addAuditTrail = async ({
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
    await pool.query(
      `
      INSERT INTO request_audit_trails (
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
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
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
  } catch (error) {
    console.error('AUDIT TRAIL INSERT ERROR:', error.message);
  }
};

const moveFileToArchive = (filename) => {
  if (!filename) return;

  const uploadsDir = path.join(__dirname, 'uploads');
  const archiveDir = path.join(uploadsDir, 'archive');

  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, {
      recursive: true,
    });
  }

  const sourcePath = path.join(uploadsDir, filename);
  const targetPath = path.join(archiveDir, filename);

  if (fs.existsSync(sourcePath)) {
    fs.renameSync(sourcePath, targetPath);
  }
};

const getStageName = (stage) => {
  const stages = {
    state_minister: 'State Minister Review',
    protocol: 'Protocol Review',
    office_head: 'Office Head Review',
    chief_executive_officer: 'Chief Executive Officer Review',
    minister: 'Minister Final Review',
    protocol_final: 'Pending Foreign Affairs Response',
    completed: 'Completed',
    traveler: 'Traveler Amendment',
  };

  return stages[stage] || stage || '-';
};

/* ============================================================
   AUTH
============================================================ */

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

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(TRIM(email)) = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email is already registered.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
  `
  INSERT INTO users (
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
  VALUES ($1, $2, $3, 'traveler', $4, $5, $6, $7, $8, $9, 'pending', false)
  RETURNING
    id,
    full_name,
    email,
    role,
    phone,
    position,
    organization_type,
    organization_name,
    sector,
    department,
    account_status,
    is_active
  `,
  [
    fullName,
    normalizedEmail,
    hashedPassword,
    phone || null,
    position || null,
    organizationType || null,
    organizationName || null,
    sector || null,
    department || null,
  ]
);

    res.status(201).json({
      message:
        'Registration submitted successfully. Please wait for admin approval.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(TRIM(email)) = $1
      `,
      [normalizeEmail(email)]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'User not found.',
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid credentials.',
      });
    }

    const accountStatus = user.account_status || 'active';

if (accountStatus === 'pending') {
  return res.status(403).json({
    error: 'Your account is pending admin approval.',
  });
}

if (accountStatus === 'rejected') {
  return res.status(403).json({
    error: 'Your account request was rejected. Please contact the admin.',
  });
}

if (accountStatus !== 'active') {
  return res.status(403).json({
    error: 'Your account is not active. Please contact the admin.',
  });
}

if (user.is_active === false) {
  return res.status(403).json({
    error: 'Your account is disabled. Please contact the admin.',
  });
}

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'ftms_secret_key',
      {
        expiresIn: '8h',
      }
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
        accountStatus: accountStatus,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({
      error: 'Login failed.',
    });
  }
});

/* ============================================================
   CREATE TRAVEL REQUEST
============================================================ */

app.post(
  '/api/requests',
  upload.fields([
    { name: 'passportFile', maxCount: 1 },
    { name: 'invitationLetter', maxCount: 1 },
    { name: 'torFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        travelerCategory,
        organizationName,
        assignedStateMinisterId,
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
          error:
            'Full name, email, country, start date, and end date are required.',
        });
      }

      const passportFile = req.files?.passportFile?.[0]?.filename || null;
      const invitationLetter =
        req.files?.invitationLetter?.[0]?.filename || null;
      const torFile = req.files?.torFile?.[0]?.filename || null;

      const normalizedEmail = normalizeEmail(email);

      const existingUserResult = await pool.query(
        `
        SELECT *
        FROM users
        WHERE LOWER(TRIM(email)) = $1
        `,
        [normalizedEmail]
      );

      const existingUser = existingUserResult.rows[0] || null;
      const userRole = existingUser?.role || 'traveler';

      let initialStage = 'state_minister';
      let initialAssignedStateMinisterId = assignedStateMinisterId || null;

      if (travelerCategory === 'affiliate_institution') {
        initialStage = 'protocol';
        initialAssignedStateMinisterId = null;
      } else if (
        userRole === 'state_minister' ||
        userRole === 'chief_executive_officer'
      ) {
        initialStage = 'protocol';
        initialAssignedStateMinisterId = null;
      } else if (userRole === 'office_head') {
        initialStage = 'minister';
        initialAssignedStateMinisterId = null;
      } else if (assignedStateMinisterId) {
        const approverResult = await pool.query(
          `
          SELECT role
          FROM users
          WHERE id = $1
            AND COALESCE(account_status, 'active') = 'active'
          `,
          [assignedStateMinisterId]
        );

        const approverRole = approverResult.rows[0]?.role;

        if (
          approverRole === 'state_minister' ||
          approverRole === 'office_head' ||
          approverRole === 'chief_executive_officer'
        ) {
          initialStage = approverRole;
        }
      }

      const result = await pool.query(
        `
        INSERT INTO requests (
          traveler_category,
          organization_name,
          assigned_state_minister_id,
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
          status
        )
        VALUES (
          $1, $2, $3, $4, 'pending',
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          'Pending'
        )
        RETURNING *
        `,
        [
          travelerCategory || 'ministry_staff',
          organizationName || null,
          initialAssignedStateMinisterId,
          initialStage,
          fullName,
          position || null,
          department || null,
          sector || existingUser?.sector || null,
          country,
          startDate,
          endDate,
          purpose || null,
          sponsor || null,
          passportNumber || null,
          normalizedEmail,
          phone || null,
          passportFile,
          invitationLetter,
          torFile,
        ]
      );

      const createdRequest = result.rows[0];

      if (
        initialStage === 'state_minister' ||
        initialStage === 'office_head' ||
        initialStage === 'chief_executive_officer'
      ) {
        const approverResult = await pool.query(
          `
          SELECT full_name, email
          FROM users
          WHERE id = $1
          `,
          [initialAssignedStateMinisterId]
        );

        const approver = approverResult.rows[0];

        if (approver) {
          await sendTaskEmail({
            to: approver.email,
            recipientName: approver.full_name,
            request: createdRequest,
            stageName: getStageName(initialStage),
            actionUrl: getFrontendUrl(),
          });
        }
      }

      if (initialStage === 'protocol') {
        const protocolUser = await getFirstUserByRole('protocol');

        if (protocolUser) {
          await sendTaskEmail({
            to: protocolUser.email,
            recipientName: protocolUser.full_name,
            request: createdRequest,
            stageName: 'Protocol Review',
            actionUrl: getFrontendUrl(),
          });
        }
      }

      await addNotification({
        userEmail: normalizedEmail,
        title: 'Travel Request Submitted',
        message: `Your travel request to ${country} has been submitted.`,
      });

      await sendEmailSafe(
        {
          from: process.env.EMAIL_USER,
          to: normalizedEmail,
          subject: 'Travel Request Submitted',
          html: `
            <div style="font-family: Arial; padding: 20px; color: #333;">
              <h2 style="color: #2563eb;">
                Foreign Travel Request Submitted
              </h2>

              <p>Dear <strong>${safeText(fullName)}</strong>,</p>

              <p>Your foreign travel request has been submitted successfully.</p>

              <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                <tr>
                  <td><strong>Destination Country</strong></td>
                  <td>${safeText(country)}</td>
                </tr>
                <tr>
                  <td><strong>Travel Dates</strong></td>
                  <td>${safeText(startDate)} to ${safeText(endDate)}</td>
                </tr>
                <tr>
                  <td><strong>Purpose</strong></td>
                  <td>${safeText(purpose)}</td>
                </tr>
                <tr>
                  <td><strong>Status</strong></td>
                  <td>Pending</td>
                </tr>
              </table>

              <p style="margin-top: 20px;">
                You can log in to FTMS to track your request after your account
                has been activated by the system administrator.
              </p>
            </div>
          `,
        },
        'TRAVELER SUBMISSION EMAIL ERROR:'
      );

      res.status(201).json(createdRequest);
    } catch (error) {
      console.error('CREATE REQUEST ERROR:', error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

/* ============================================================
   GET REQUESTS
============================================================ */

app.get('/api/requests', async (req, res) => {
  try {
    const { role, email, id } = req.query;

    let result;

    const baseSelect = `
      SELECT
        r.*,
        CASE
          WHEN r.traveler_category = 'affiliate_institution'
          THEN 'Affiliate Institute'
          ELSE COALESCE(
            r.sector,
            sm.sector,
            traveler.sector,
            'Unassigned'
          )
        END AS sector
      FROM requests r
      LEFT JOIN users sm
        ON r.assigned_state_minister_id = sm.id
      LEFT JOIN users traveler
        ON LOWER(TRIM(r.email)) = LOWER(TRIM(traveler.email))
    `;

    if (role === 'admin') {
      result = await pool.query(`
        ${baseSelect}
        ORDER BY r.id DESC
      `);
    } else if (role === 'traveler') {
      result = await pool.query(
        `
        ${baseSelect}
        WHERE LOWER(TRIM(r.email)) = LOWER(TRIM($1))
        ORDER BY r.id DESC
        `,
        [email || '']
      );
    } else if (role === 'state_minister') {
      result = await pool.query(
        `
        ${baseSelect}
        WHERE
          r.assigned_state_minister_id = $1
          OR r.final_status IN ('approved', 'rejected')
        ORDER BY
          CASE
            WHEN r.current_stage = 'state_minister'
             AND r.final_status = 'pending'
            THEN 0
            ELSE 1
          END,
          r.id DESC
        `,
        [id]
      );
    } else if (
      role === 'office_head' ||
      role === 'chief_executive_officer'
    ) {
      result = await pool.query(
        `
        ${baseSelect}
        WHERE
          (
            r.current_stage = $1
            AND r.final_status = 'pending'
          )
          OR r.final_status IN ('approved', 'rejected')
        ORDER BY
          CASE
            WHEN r.current_stage = $1
             AND r.final_status = 'pending'
            THEN 0
            ELSE 1
          END,
          r.id DESC
        `,
        [role]
      );
    } else if (role === 'protocol') {
      result = await pool.query(`
        ${baseSelect}
        WHERE
          (
            r.current_stage IN ('protocol', 'protocol_final')
            AND r.final_status = 'pending'
          )
          OR r.final_status IN ('approved', 'rejected')
        ORDER BY
          CASE
            WHEN r.current_stage IN ('protocol', 'protocol_final')
             AND r.final_status = 'pending'
            THEN 0
            ELSE 1
          END,
          r.id DESC
      `);
    } else if (role === 'minister') {
      result = await pool.query(`
        ${baseSelect}
        WHERE
          (
            r.current_stage = 'minister'
            AND r.final_status = 'pending'
          )
          OR r.final_status IN ('approved', 'rejected')
        ORDER BY
          CASE
            WHEN r.current_stage = 'minister'
             AND r.final_status = 'pending'
            THEN 0
            ELSE 1
          END,
          r.id DESC
      `);
    } else {
      return res.status(403).json({
        error: 'Unauthorized role.',
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('GET REQUESTS ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   UPDATE AMENDED REQUEST
============================================================ */

app.put(
  '/api/requests/:id',
  upload.fields([
    { name: 'passportFile', maxCount: 1 },
    { name: 'invitationLetter', maxCount: 1 },
    { name: 'torFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        travelerCategory,
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

      const passportFile = req.files?.passportFile?.[0]?.filename || null;
      const invitationLetter =
        req.files?.invitationLetter?.[0]?.filename || null;
      const torFile = req.files?.torFile?.[0]?.filename || null;

      const result = await pool.query(
        `
        UPDATE requests
        SET
          traveler_category = COALESCE($1, traveler_category),
          organization_name = COALESCE($2, organization_name),
          full_name = COALESCE($3, full_name),
          position = COALESCE($4, position),
          department = COALESCE($5, department),
          sector = COALESCE($6, sector),
          email = COALESCE($7, email),
          phone = COALESCE($8, phone),
          country = COALESCE($9, country),
          start_date = COALESCE($10, start_date),
          end_date = COALESCE($11, end_date),
          purpose = COALESCE($12, purpose),
          sponsor = COALESCE($13, sponsor),
          passport_number = COALESCE($14, passport_number),
          passport_file = COALESCE($15, passport_file),
          invitation_letter = COALESCE($16, invitation_letter),
          tor_file = COALESCE($17, tor_file)
        WHERE id = $18
        RETURNING *
        `,
        [
          travelerCategory || null,
          organizationName || null,
          fullName || null,
          position || null,
          department || null,
          sector || null,
          email ? normalizeEmail(email) : null,
          phone || null,
          country || null,
          startDate || null,
          endDate || null,
          purpose || null,
          sponsor || null,
          passportNumber || null,
          passportFile,
          invitationLetter,
          torFile,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Request not found.',
        });
      }

      res.json({
        message: 'Request updated successfully.',
        request: result.rows[0],
      });
    } catch (error) {
      console.error('UPDATE REQUEST ERROR:', error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

/* ============================================================
   UPDATE REQUEST STATUS
============================================================ */

app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role, comment, actorEmail } = req.body;

    const existingRequestResult = await pool.query(
      `
      SELECT *
      FROM requests
      WHERE id = $1
      `,
      [id]
    );

    const existingRequest = existingRequestResult.rows[0];

    if (!existingRequest) {
      return res.status(404).json({
        error: 'Request not found.',
      });
    }

    if (
      existingRequest.current_stage === 'completed' ||
      existingRequest.final_status === 'approved' ||
      existingRequest.final_status === 'rejected'
    ) {
      return res.status(400).json({
        error: 'This request has already been finalized.',
      });
    }

    const allowedStagesByRole = {
      state_minister: ['state_minister'],
      office_head: ['office_head'],
      chief_executive_officer: ['chief_executive_officer'],
      protocol: ['protocol', 'protocol_final'],
      minister: ['minister'],
      admin: [
        'state_minister',
        'office_head',
        'chief_executive_officer',
        'protocol',
        'minister',
        'protocol_final',
        'traveler',
      ],
    };

    const allowedStages = allowedStagesByRole[role];

    if (
      allowedStages &&
      !allowedStages.includes(existingRequest.current_stage)
    ) {
      return res.status(400).json({
        error:
          'This request is no longer assigned to your approval stage.',
      });
    }

    let nextStage = existingRequest.current_stage;
    let finalStatus = existingRequest.final_status || 'pending';
    let displayStatus = status;
    let amendmentComment = null;
    let amendedBy = null;

    if (status === 'Amended') {
      if (role !== 'protocol') {
        return res.status(403).json({
          error: 'Only Protocol can request amendment.',
        });
      }

      nextStage = 'traveler';
      finalStatus = 'amended';
      displayStatus = 'Amendment Requested';
      amendmentComment = comment || 'Please amend the request.';
      amendedBy = role;
    } else if (status === 'ForwardedToMinister') {
      if (role !== 'office_head') {
        return res.status(403).json({
          error: 'Only Office Head can forward to Minister.',
        });
      }

      nextStage = 'minister';
      finalStatus = 'pending';
      displayStatus = 'Forwarded to Minister';
    } else if (status === 'ForeignAffairsApproved') {
      if (
        role !== 'protocol' ||
        existingRequest.current_stage !== 'protocol_final'
      ) {
        return res.status(403).json({
          error: 'Only Protocol can approve Foreign Affairs response.',
        });
      }

      nextStage = 'completed';
      finalStatus = 'approved';
      displayStatus = 'Foreign Affairs Approved';
    } else if (status === 'ForeignAffairsRejected') {
      if (
        role !== 'protocol' ||
        existingRequest.current_stage !== 'protocol_final'
      ) {
        return res.status(403).json({
          error: 'Only Protocol can reject Foreign Affairs response.',
        });
      }

      nextStage = 'completed';
      finalStatus = 'rejected';
      displayStatus = 'Foreign Affairs Rejected';
    } else if (status === 'Rejected') {
      nextStage = 'completed';
      finalStatus = 'rejected';
      displayStatus = 'Rejected';
    } else if (status === 'Approved') {
      if (role === 'state_minister') {
        nextStage = 'protocol';
        finalStatus = 'pending';
        displayStatus = 'Approved by State Minister';
      } else if (role === 'chief_executive_officer') {
        nextStage = 'protocol';
        finalStatus = 'pending';
        displayStatus = 'Approved by Chief Executive Officer';
      } else if (role === 'protocol') {
        nextStage = 'office_head';
        finalStatus = 'pending';
        displayStatus = 'Cleared by Protocol';
      } else if (role === 'office_head') {
        nextStage = 'protocol_final';
        finalStatus = 'pending';
        displayStatus = 'Approved by Office Head';
      } else if (role === 'minister') {
        nextStage = 'protocol_final';
        finalStatus = 'pending';
        displayStatus = 'Approved by Minister';
      } else if (role === 'admin') {
        nextStage = 'completed';
        finalStatus = 'approved';
        displayStatus = 'Approved';
      } else {
        return res.status(403).json({
          error: 'You are not allowed to approve this request.',
        });
      }
    } else {
      return res.status(400).json({
        error: 'Unknown status action.',
      });
    }

    const updateResult = await pool.query(
      `
      UPDATE requests
      SET
        status = $1,
        current_stage = $2,
        final_status = $3,
        amendment_comment = COALESCE($4, amendment_comment),
        amended_by = COALESCE($5, amended_by)
      WHERE id = $6
      RETURNING *
      `,
      [
        displayStatus,
        nextStage,
        finalStatus,
        amendmentComment,
        amendedBy,
        id,
      ]
    );

    const request = updateResult.rows[0];

    await addAuditTrail({
      requestId: request.id,
      action: status,
      actorRole: role,
      actorEmail,
      comment,
      oldStage: existingRequest.current_stage,
      newStage: nextStage,
      oldStatus: existingRequest.final_status,
      newStatus: finalStatus,
    });

    if (finalStatus === 'approved' || finalStatus === 'rejected') {
      moveFileToArchive(request.passport_file);
      moveFileToArchive(request.invitation_letter);
      moveFileToArchive(request.tor_file);
    }

    await addNotification({
      userEmail: request.email,
      title: 'Travel Request Updated',
      message:
        status === 'Amended'
          ? `Your travel request to ${request.country} requires amendment: ${amendmentComment}`
          : `Your travel request to ${request.country} is now ${displayStatus}.`,
    });

    await sendTravelerEmail({
      request,
      status,
      displayStatus,
      amendmentComment,
    });

    let nextApprover = null;
    let nextStageName = '';

    if (nextStage === 'protocol' && status !== 'Amended') {
      nextApprover = await getFirstUserByRole('protocol');
      nextStageName = 'Protocol Review';
    } else if (nextStage === 'protocol_final') {
      nextApprover = await getFirstUserByRole('protocol');
      nextStageName = 'Pending Foreign Affairs Response';
    } else if (nextStage === 'office_head') {
      nextApprover = await getFirstUserByRole('office_head');
      nextStageName = 'Office Head Review';
    } else if (nextStage === 'minister') {
      nextApprover = await getFirstUserByRole('minister');
      nextStageName = 'Minister Final Review';
    }

    if (nextApprover && nextStage !== 'completed' && status !== 'Amended') {
      await sendTaskEmail({
        to: nextApprover.email,
        recipientName: nextApprover.full_name,
        request,
        stageName: nextStageName,
        actionUrl: getFrontendUrl(),
      });
    }

    res.json({
      message: 'Status updated successfully.',
      status: displayStatus,
      currentStage: nextStage,
      finalStatus,
    });
  } catch (error) {
    console.error('STATUS UPDATE ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   RESUBMIT AMENDED REQUEST
============================================================ */

app.put('/api/requests/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorEmail, role } = req.body;

    const existingRequestResult = await pool.query(
      `
      SELECT *
      FROM requests
      WHERE id = $1
      `,
      [id]
    );

    const existingRequest = existingRequestResult.rows[0];

    if (!existingRequest) {
      return res.status(404).json({
        error: 'Request not found.',
      });
    }

    if (existingRequest.final_status !== 'amended') {
      return res.status(400).json({
        error: 'Only amended requests can be resubmitted.',
      });
    }

    const updateResult = await pool.query(
      `
      UPDATE requests
      SET
        current_stage = 'protocol',
        final_status = 'pending',
        status = 'Resubmitted to Protocol'
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    const request = updateResult.rows[0];

    await addAuditTrail({
      requestId: request.id,
      action: 'Resubmitted',
      actorRole: role || 'traveler',
      actorEmail: actorEmail || request.email,
      comment: 'Traveler resubmitted amended request.',
      oldStage: existingRequest.current_stage,
      newStage: 'protocol',
      oldStatus: existingRequest.final_status,
      newStatus: 'pending',
    });

    const protocolUser = await getFirstUserByRole('protocol');

    if (protocolUser) {
      await sendTaskEmail({
        to: protocolUser.email,
        recipientName: protocolUser.full_name,
        request,
        stageName: 'Protocol Review',
        actionUrl: getFrontendUrl(),
      });
    }

    res.json({
      message: 'Request resubmitted successfully.',
    });
  } catch (error) {
    console.error('RESUBMIT REQUEST ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   DELETE REQUEST
============================================================ */

app.delete('/api/requests/:id', async (req, res) => {
  try {
    await pool.query(
      `
      DELETE FROM requests
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      message: 'Request deleted successfully.',
    });
  } catch (error) {
    console.error('DELETE REQUEST ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   REQUEST AUDIT TRAIL
============================================================ */

app.get('/api/requests/:id/audit-trail', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        request_id,
        action,
        actor_role,
        actor_email,
        comment,
        old_stage,
        new_stage,
        old_status,
        new_status,
        created_at
      FROM request_audit_trails
      WHERE request_id = $1
      ORDER BY created_at ASC
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET REQUEST AUDIT TRAIL ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   SECTOR APPROVERS
============================================================ */

app.get('/api/state-ministers', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        sector,
        full_name,
        email,
        role,
        account_status
      FROM users
      WHERE role IN (
        'state_minister',
        'office_head',
        'chief_executive_officer',
        'minister'
      )
      ORDER BY sector ASC, full_name ASC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET SECTOR APPROVERS ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post('/api/state-ministers', async (req, res) => {
  try {
    const { sector, fullName, email, password, role } = req.body;

    if (!sector || !fullName || !email || !password || !role) {
      return res.status(400).json({
        error: 'Please complete all required fields.',
      });
    }

    const allowedRoles = [
      'state_minister',
      'office_head',
      'chief_executive_officer',
      'minister',
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid sector approver role.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(TRIM(email)) = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email is already registered.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        sector,
        full_name,
        email,
        password,
        role,
        account_status,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, 'active', true)
      RETURNING id, sector, full_name, email, role, account_status
      `,
      [sector, fullName, normalizedEmail, hashedPassword, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CREATE SECTOR APPROVER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.put('/api/state-ministers/:id', async (req, res) => {
  try {
    const { sector, fullName, email, role } = req.body;

    const allowedRoles = [
      'state_minister',
      'office_head',
      'chief_executive_officer',
      'minister',
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid sector approver role.',
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        sector = $1,
        full_name = $2,
        email = $3,
        role = $4
      WHERE id = $5
      RETURNING id, sector, full_name, email, role, account_status
      `,
      [sector, fullName, normalizeEmail(email), role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Sector approver not found.',
      });
    }

    res.json({
      message: 'Sector approver updated successfully.',
      approver: result.rows[0],
    });
  } catch (error) {
    console.error('UPDATE SECTOR APPROVER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.delete('/api/state-ministers/:id', async (req, res) => {
  try {
    await pool.query(
      `
      DELETE FROM users
      WHERE id = $1
      AND role IN (
        'state_minister',
        'office_head',
        'chief_executive_officer',
        'minister'
      )
      `,
      [req.params.id]
    );

    res.json({
      message: 'Sector approver deleted successfully.',
    });
  } catch (error) {
    console.error('DELETE SECTOR APPROVER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   USERS AND ACCOUNT APPROVAL
============================================================ */

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
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
      ORDER BY id DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET USERS ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get('/api/users/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        position,
        sector,
        department,
        role,
        account_status
      FROM users
      WHERE account_status = 'pending'
      ORDER BY id DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET PENDING USERS ERROR:', error);
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
      return res.status(400).json({
        error: 'Full name, email, password, and role are required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(TRIM(email)) = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email is already registered.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true)
      RETURNING
        id,
        full_name,
        email,
        role,
        phone,
        position,
        sector,
        department,
        account_status
      `,
      [
        fullName,
        normalizedEmail,
        hashedPassword,
        role,
        phone || null,
        position || null,
        sector || null,
        department || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CREATE USER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.put('/api/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE users
      SET
        account_status = 'active',
        is_active = true
      WHERE id = $1
      RETURNING
        id,
        full_name,
        email,
        role,
        phone,
        position,
        sector,
        department,
        account_status
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    await sendAccountActivatedEmail(result.rows[0]);

    res.json({
      message: 'User account approved and activated successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('APPROVE USER ERROR:', error);
    res.status(500).json({
      error: 'Failed to approve user.',
    });
  }
});

app.put('/api/users/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE users
      SET
        account_status = 'rejected',
        is_active = false
      WHERE id = $1
      RETURNING
        id,
        full_name,
        email,
        role,
        phone,
        position,
        sector,
        department,
        account_status
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    await sendAccountRejectedEmail(result.rows[0]);

    res.json({
      message: 'User account request rejected.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('REJECT USER ERROR:', error);
    res.status(500).json({
      error: 'Failed to reject user.',
    });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

    const result = await pool.query(
      `
      UPDATE users
      SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        phone = COALESCE($4, phone),
        position = COALESCE($5, position),
        sector = COALESCE($6, sector),
        department = COALESCE($7, department),
        account_status = COALESCE($8, account_status),
        is_active = COALESCE($9, is_active)
      WHERE id = $10
      RETURNING
        id,
        full_name,
        email,
        role,
        phone,
        position,
        sector,
        department,
        is_active,
        account_status
      `,
      [
        fullName || null,
        email ? normalizeEmail(email) : null,
        role || null,
        phone || null,
        position || null,
        sector || null,
        department || null,
        accountStatus || null,
        typeof isActive === 'boolean' ? isActive : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    res.json({
      message: 'User updated successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('UPDATE USER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query(
      `
      DELETE FROM users
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      message: 'User deleted successfully.',
    });
  } catch (error) {
    console.error('DELETE USER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.put('/api/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'New password is required.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [hashedPassword, req.params.id]
    );

    res.json({
      message: 'Password reset successfully.',
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.put('/api/users/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required.',
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: 'Current password is incorrect.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [hashedPassword, id]
    );

    res.json({
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('CHANGE PASSWORD ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   STATS AND DASHBOARD
============================================================ */

app.get('/api/stats', async (req, res) => {
  try {
    const total = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM requests
    `);

    const approved = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM requests
      WHERE final_status = 'approved'
    `);

    const pending = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM requests
      WHERE final_status = 'pending'
    `);

    const rejected = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM requests
      WHERE final_status = 'rejected'
    `);

    res.json({
      totalRequests: total.rows[0].count,
      approvedRequests: approved.rows[0].count,
      pendingRequests: pending.rows[0].count,
      rejectedRequests: rejected.rows[0].count,
    });
  } catch (error) {
    console.error('STATS ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get('/api/dashboard/pending-by-sector', async (req, res) => {
  try {
    const { role, id } = req.query;

    let result;

    const sectorExpression = `
      CASE
        WHEN r.traveler_category = 'affiliate_institution'
        THEN 'Affiliate Institute'
        ELSE COALESCE(
          r.sector,
          approver.sector,
          traveler.sector,
          'Unassigned'
        )
      END
    `;

    const baseJoins = `
      FROM requests r
      LEFT JOIN users approver
        ON r.assigned_state_minister_id = approver.id
      LEFT JOIN users traveler
        ON LOWER(TRIM(r.email)) = LOWER(TRIM(traveler.email))
    `;

    if (role === 'admin') {
      result = await pool.query(`
        SELECT
          ${sectorExpression} AS sector,
          COUNT(*)::int AS pending_count
        ${baseJoins}
        WHERE r.final_status = 'pending'
        GROUP BY ${sectorExpression}
        ORDER BY pending_count DESC
      `);
    } else if (role === 'state_minister') {
      result = await pool.query(
        `
        SELECT
          ${sectorExpression} AS sector,
          COUNT(*)::int AS pending_count
        ${baseJoins}
        WHERE
          r.assigned_state_minister_id = $1
          AND r.current_stage = 'state_minister'
          AND r.final_status = 'pending'
          AND r.traveler_category <> 'affiliate_institution'
        GROUP BY ${sectorExpression}
        ORDER BY pending_count DESC
        `,
        [id]
      );
    } else if (
      role === 'office_head' ||
      role === 'chief_executive_officer' ||
      role === 'minister'
    ) {
      result = await pool.query(
        `
        SELECT
          ${sectorExpression} AS sector,
          COUNT(*)::int AS pending_count
        ${baseJoins}
        WHERE
          r.current_stage = $1
          AND r.final_status = 'pending'
        GROUP BY ${sectorExpression}
        ORDER BY pending_count DESC
        `,
        [role]
      );
    } else if (role === 'protocol') {
      result = await pool.query(`
        SELECT
          ${sectorExpression} AS sector,
          COUNT(*)::int AS pending_count
        ${baseJoins}
        WHERE
          r.final_status = 'pending'
          AND r.current_stage IN ('protocol', 'protocol_final')
        GROUP BY ${sectorExpression}
        ORDER BY pending_count DESC
      `);
    } else {
      result = { rows: [] };
    }

    res.json(result.rows);
  } catch (error) {
    console.error('PENDING BY SECTOR ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   REPORTS
============================================================ */

app.get('/api/reports/status-summary', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        COALESCE(final_status, 'pending') AS status,
        COUNT(*)::int AS count
      FROM requests
      GROUP BY COALESCE(final_status, 'pending')
      ORDER BY status
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('STATUS SUMMARY REPORT ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get('/api/reports/sector-status', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        CASE
          WHEN r.traveler_category = 'affiliate_institution'
          THEN 'Affiliate Institute'
          ELSE COALESCE(r.sector, u.sector, 'Unassigned')
        END AS sector,
        COALESCE(r.final_status, 'pending') AS final_status,
        COUNT(*)::int AS count
      FROM requests r
      LEFT JOIN users u
        ON r.assigned_state_minister_id = u.id
      GROUP BY
        CASE
          WHEN r.traveler_category = 'affiliate_institution'
          THEN 'Affiliate Institute'
          ELSE COALESCE(r.sector, u.sector, 'Unassigned')
        END,
        COALESCE(r.final_status, 'pending')
      ORDER BY sector
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('SECTOR STATUS REPORT ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get('/api/reports/monthly-requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', start_date), 'Mon YYYY') AS month,
        DATE_TRUNC('month', start_date) AS month_date,
        COUNT(*)::int AS total
      FROM requests
      WHERE start_date IS NOT NULL
        AND final_status = 'approved'
      GROUP BY DATE_TRUNC('month', start_date)
      ORDER BY DATE_TRUNC('month', start_date)
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('MONTHLY REQUEST REPORT ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get('/api/reports/stage-summary', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        COALESCE(current_stage, 'state_minister') AS current_stage,
        COUNT(*)::int AS count
      FROM requests
      GROUP BY COALESCE(current_stage, 'state_minister')
      ORDER BY current_stage
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('STAGE SUMMARY REPORT ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   PDF GENERATION
============================================================ */

app.get('/api/generate-pdf/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM requests
      WHERE id = $1
      `,
      [req.params.id]
    );

    const request = result.rows[0];

    if (!request) {
      return res.status(404).json({
        error: 'Request not found.',
      });
    }

    const pdfDir = path.join(__dirname, 'pdfs');

    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, {
        recursive: true,
      });
    }

    const fileName = `travel-request-${req.params.id}.pdf`;
    const filePath = path.join(pdfDir, fileName);

    const fontPath = path.join(
      __dirname,
      'fonts',
      'NotoSansEthiopic-Regular.ttf'
    );

    const doc = new PDFDocument({
      margin: 50,
    });

    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    doc.fontSize(22).text('Ministry of Agriculture', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text('Foreign Travel Approval Letter', {
      align: 'center',
    });
    doc.moveDown(2);

    doc.fontSize(13);
    doc.text(`Traveler Name: ${safeText(request.full_name)}`);
    doc.moveDown();
    doc.text(`Department: ${safeText(request.department)}`);
    doc.moveDown();
    doc.text(`Destination Country: ${safeText(request.country)}`);
    doc.moveDown();
    doc.text(
      `Travel Dates: ${safeText(request.start_date)} to ${safeText(
        request.end_date
      )}`
    );
    doc.moveDown();
    doc.text(`Purpose of Travel: ${safeText(request.purpose)}`);
    doc.moveDown();
    doc.text(`Sponsor: ${safeText(request.sponsor)}`);
    doc.moveDown();
    doc.text(`Status: ${safeText(request.status)}`);
    doc.moveDown(3);
    doc.text('Authorized Signature: __________________');

    doc.addPage();

    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    doc.fontSize(22).text('የግብርና ሚኒስቴር', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text('የውጭ ጉዞ ፈቃድ ደብዳቤ', {
      align: 'center',
    });
    doc.moveDown(2);

    doc.fontSize(13);
    doc.text(`ተጓዥ: ${safeText(request.full_name)}`);
    doc.moveDown();
    doc.text(`የስራ ክፍል: ${safeText(request.department)}`);
    doc.moveDown();
    doc.text(`የሚሄዱበት ሀገር: ${safeText(request.country)}`);
    doc.moveDown();
    doc.text(
      `የጉዞ ቀን: ${safeText(request.start_date)} እስከ ${safeText(
        request.end_date
      )}`
    );
    doc.moveDown();
    doc.text(`የጉዞ ዓላማ: ${safeText(request.purpose)}`);
    doc.moveDown();
    doc.text(`ስፖንሰር: ${safeText(request.sponsor)}`);
    doc.moveDown();
    doc.text(`ሁኔታ: ${safeText(request.status)}`);
    doc.moveDown(3);
    doc.text('ፊርማ: __________________');

    doc.end();

    stream.on('finish', () => {
      res.download(filePath);
    });
  } catch (error) {
    console.error('PDF ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   AFFILIATE INSTITUTIONS
============================================================ */

app.get('/api/affiliate-institutions', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        organization_name,
        general_director_name,
        email,
        phone
      FROM affiliate_institutions
      ORDER BY organization_name ASC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET AFFILIATES ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post('/api/affiliate-institutions', async (req, res) => {
  try {
    const { organizationName, generalDirectorName, email, phone } = req.body;

    const result = await pool.query(
      `
      INSERT INTO affiliate_institutions (
        organization_name,
        general_director_name,
        email,
        phone
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [organizationName, generalDirectorName, email, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CREATE AFFILIATE ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.put('/api/affiliate-institutions/:id', async (req, res) => {
  try {
    const { organizationName, generalDirectorName, email, phone } = req.body;

    const result = await pool.query(
      `
      UPDATE affiliate_institutions
      SET
        organization_name = $1,
        general_director_name = $2,
        email = $3,
        phone = $4
      WHERE id = $5
      RETURNING *
      `,
      [organizationName, generalDirectorName, email, phone, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Organization not found.',
      });
    }

    res.json({
      message: 'Organization updated successfully.',
      organization: result.rows[0],
    });
  } catch (error) {
    console.error('UPDATE AFFILIATE ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.delete('/api/affiliate-institutions/:id', async (req, res) => {
  try {
    await pool.query(
      `
      DELETE FROM affiliate_institutions
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      message: 'Organization deleted successfully.',
    });
  } catch (error) {
    console.error('DELETE AFFILIATE ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   MINISTRY ORGANIZATIONS
============================================================ */

app.get('/api/ministry-organizations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM ministry_organizations
      ORDER BY organization_name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('GET MINISTRY ORGANIZATIONS ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post('/api/ministry-organizations', async (req, res) => {
  try {
    const { organizationName } = req.body;

    const result = await pool.query(
      `
      INSERT INTO ministry_organizations (
        organization_name
      )
      VALUES ($1)
      RETURNING *
      `,
      [organizationName]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CREATE MINISTRY ORGANIZATION ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.put('/api/ministry-organizations/:id', async (req, res) => {
  try {
    const { organizationName } = req.body;

    const result = await pool.query(
      `
      UPDATE ministry_organizations
      SET organization_name = $1
      WHERE id = $2
      RETURNING *
      `,
      [organizationName, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Ministry organization not found.',
      });
    }

    res.json({
      message: 'Ministry organization updated successfully.',
      organization: result.rows[0],
    });
  } catch (error) {
    console.error('UPDATE MINISTRY ORGANIZATION ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.delete('/api/ministry-organizations/:id', async (req, res) => {
  try {
    await pool.query(
      `
      DELETE FROM ministry_organizations
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      message: 'Ministry organization deleted successfully.',
    });
  } catch (error) {
    console.error('DELETE MINISTRY ORGANIZATION ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   NOTIFICATIONS
============================================================ */

app.get('/api/notifications', async (req, res) => {
  try {
    const { email } = req.query;

    let result;

    if (email) {
      result = await pool.query(
        `
        SELECT *
        FROM notifications
        WHERE user_email = $1
        ORDER BY id DESC
        LIMIT 50
        `,
        [email]
      );
    } else {
      result = await pool.query(
        `
        SELECT *
        FROM notifications
        ORDER BY id DESC
        LIMIT 100
        `
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('GET NOTIFICATIONS ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   GLOBAL AUDIT TRAIL
============================================================ */

app.get('/api/audit-trail', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
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
        r.country,
        r.purpose,
        r.start_date,
        r.end_date,
        r.status AS current_status,
        r.final_status,
        r.current_stage
      FROM request_audit_trails a
      LEFT JOIN requests r
        ON a.request_id = r.id
      ORDER BY a.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('GET GLOBAL AUDIT TRAIL ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* ============================================================
   TEST EMAIL
============================================================ */

app.get('/api/test-email', async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'FTMS Email Test',
      text: 'FTMS email configuration is working.',
    });

    res.json({
      message: 'Test email sent successfully.',
    });
  } catch (error) {
    console.error('TEST EMAIL ERROR:', error);

    res.status(500).json({
      error: error.message,
      code: error.code,
      command: error.command,
    });
  }
});


/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use((error, req, res, next) => {
  console.error('GLOBAL SERVER ERROR:', error);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File size must not exceed 5MB.',
    });
  }

  res.status(500).json({
    error: error.message || 'Server Error',
  });
});

app.get('/api/users/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        position,
        sector,
        department,
        role,
        account_status,
        is_active
      FROM users
      WHERE account_status = 'pending'
      ORDER BY id DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET PENDING USERS ERROR:', error);
    res.status(500).json({
      error: 'Failed to fetch pending users.',
    });
  }
});
app.put('/api/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE users
      SET
        account_status = 'active',
        is_active = true
      WHERE id = $1
      RETURNING
        id,
        full_name,
        email,
        role,
        account_status,
        is_active
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    const approvedUser = result.rows[0];

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: approvedUser.email,
        subject: 'FTMS Account Activated',
        html: `
          <div style="font-family: Arial; padding: 20px; color: #333;">
            <h2 style="color: #16a34a;">FTMS Account Activated</h2>

            <p>Dear <strong>${approvedUser.full_name}</strong>,</p>

            <p>
              Your Foreign Travel Management System account has been activated
              by the system administrator.
            </p>

            <p>You can now log in and submit your travel request.</p>

            <p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
                 style="display: inline-block; background: #16a34a; color: white; padding: 12px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Open FTMS
              </a>
            </p>

            <p style="margin-top: 30px;">
              Ministry of Agriculture<br/>
              Foreign Travel Management System
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('ACCOUNT ACTIVATION EMAIL ERROR:', emailError);
    }

    res.json({
      message: 'User account approved and activated successfully.',
      user: approvedUser,
    });
  } catch (error) {
    console.error('APPROVE USER ERROR:', error);
    res.status(500).json({
      error: 'Failed to approve user.',
    });
  }
});
/* ============================================================
   SERVER INITIALIZATION
============================================================ */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

