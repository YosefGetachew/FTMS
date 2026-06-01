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

const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:3000';

/* =========================
   MIDDLEWARES
========================= */

app.use(cors());
app.use(express.json());

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

app.get('/', (req, res) => {
  res.json({
    message: 'FTMS Backend Running',
  });
});

/* =========================
   EMAIL HELPERS
========================= */

const sendTaskEmail = async ({
  to,
  recipientName,
  request,
  stageName,
  actionUrl,
}) => {
  if (!to) return;

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `FTMS Task Assigned: ${request.full_name} - ${request.country}`,
    html: `
      <div style="font-family: Arial; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">New FTMS Task Assigned</h2>

        <p>Dear <strong>${recipientName || 'Approver'}</strong>,</p>

        <p>A travel request has been assigned to you for review.</p>

        <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
          <tr>
            <td><strong>Traveler</strong></td>
            <td>${request.full_name || '-'}</td>
          </tr>
          <tr>
            <td><strong>Department</strong></td>
            <td>${request.department || '-'}</td>
          </tr>
          <tr>
            <td><strong>Destination</strong></td>
            <td>${request.country || '-'}</td>
          </tr>
          <tr>
            <td><strong>Travel Dates</strong></td>
            <td>${request.start_date || '-'} to ${request.end_date || '-'}</td>
          </tr>
          <tr>
            <td><strong>Purpose</strong></td>
            <td>${request.purpose || '-'}</td>
          </tr>
          <tr>
            <td><strong>Stage</strong></td>
            <td>${stageName || '-'}</td>
          </tr>
        </table>

        <p style="margin-top: 20px;">
          Please log in to FTMS and take the required action.
        </p>

        <p>
          <a href="${actionUrl || FRONTEND_URL}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">
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
};

const sendTravelerEmail = ({
  request,
  status,
  displayStatus,
  amendmentComment,
}) => {
  if (!request?.email) return;

  transporter
    .sendMail({
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

          <p>Dear <strong>${request.full_name || 'Traveler'}</strong>,</p>

          <p>
            Your travel request to
            <strong>${request.country || '-'}</strong>
            has been updated.
          </p>

          ${
            status === 'Amended'
              ? `<p><strong>Amendment Comment:</strong> ${
                  amendmentComment || '-'
                }</p>`
              : ''
          }

          <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
            <tr>
              <td><strong>Status</strong></td>
              <td>${displayStatus || '-'}</td>
            </tr>
          </table>
        </div>
      `,
    })
    .catch((error) => {
      console.error('TRAVELER EMAIL ERROR:', error);
    });
};

/* =========================
   AUDIT TRAIL HELPER
========================= */

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
};

/* =========================
   FILE ARCHIVE HELPER
========================= */

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

/* =========================
   AUTH
========================= */

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password,
        role
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role
      `,
      [
        fullName,
        email,
        hashedPassword,
        role || 'traveler',
      ]
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   CREATE TRAVEL REQUEST
========================= */

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
        country,
        startDate,
        endDate,
        purpose,
        sponsor,
        passportNumber,
        email,
        phone,
      } = req.body;

      const passportFile =
        req.files?.passportFile?.[0]?.filename || null;

      const invitationLetter =
        req.files?.invitationLetter?.[0]?.filename || null;

      const torFile =
        req.files?.torFile?.[0]?.filename || null;

      const existingUser = await pool.query(
        `
        SELECT *
        FROM users
        WHERE email = $1
        `,
        [email]
      );

      const isNewTraveler = existingUser.rows.length === 0;
      let userRole = 'traveler';

      if (isNewTraveler) {
        const temporaryPassword =
          passportNumber || phone || 'ChangeMe123';

        const hashedPassword = await bcrypt.hash(
          temporaryPassword,
          10
        );

        await pool.query(
          `
          INSERT INTO users (
            full_name,
            email,
            password,
            role
          )
          VALUES ($1, $2, $3, $4)
          `,
          [
            fullName,
            email,
            hashedPassword,
            'traveler',
          ]
        );
      } else {
        userRole = existingUser.rows[0]?.role || 'traveler';
      }

      let initialStage = 'state_minister';
let initialAssignedStateMinisterId =
  assignedStateMinisterId || null;

if (travelerCategory === 'affiliate_institution') {
  initialStage = 'protocol';
  initialAssignedStateMinisterId = null;
} else if (assignedStateMinisterId) {
  const approverResult = await pool.query(
    `
    SELECT role
    FROM users
    WHERE id = $1
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
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20
        )
        RETURNING *
        `,
        [
          travelerCategory,
          organizationName,
          initialAssignedStateMinisterId,
          initialStage,
          'pending',
          fullName,
          position,
          department,
          country,
          startDate,
          endDate,
          purpose,
          sponsor,
          passportNumber,
          email,
          phone,
          passportFile,
          invitationLetter,
          torFile,
          'Pending',
        ]
      );

      const createdRequest = result.rows[0];

      if (
  initialStage === 'state_minister' ||
  initialStage === 'office_head' ||
  initialStage === 'chief_executive_officer'
) {
        const stateMinisterResult = await pool.query(
          `
          SELECT full_name, email
          FROM users
          WHERE id = $1
          `,
          [initialAssignedStateMinisterId]
        );

        if (stateMinisterResult.rows.length > 0) {
          const stateMinister = stateMinisterResult.rows[0];

          sendTaskEmail({
            to: stateMinister.email,
            recipientName: stateMinister.full_name,
            request: createdRequest,
            stageName: 
            initialStage === 'state_minister'
            ? 'State Minister Review'
            : initialStage === 'office_head'
            ? 'Office Head Review'
            : 'Chief Executive Officer Review',
            actionUrl: FRONTEND_URL,
          }).catch((error) => {
            console.error('STATE MINISTER EMAIL ERROR:', error);
          });
        }
      }

      if (initialStage === 'protocol') {
        const protocolResult = await pool.query(
          `
          SELECT full_name, email
          FROM users
          WHERE role = 'protocol'
          LIMIT 1
          `
        );

        if (protocolResult.rows.length > 0) {
          const protocolUser = protocolResult.rows[0];

          sendTaskEmail({
            to: protocolUser.email,
            recipientName: protocolUser.full_name,
            request: createdRequest,
            stageName: 'Protocol Review',
            actionUrl: FRONTEND_URL,
          }).catch((error) => {
            console.error('PROTOCOL EMAIL ERROR:', error);
          });
        }
      }

      await pool.query(
        `
        INSERT INTO notifications (
          user_email,
          title,
          message
        )
        VALUES ($1, $2, $3)
        `,
        [
          email,
          'Travel Request Submitted',
          `Your travel request to ${country} has been submitted.`,
        ]
      );

      transporter
        .sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Travel Request Submitted',
          html: `
            <div style="font-family: Arial; padding: 20px; color: #333;">
              <h2 style="color: #2563eb;">
                Foreign Travel Request Submitted
              </h2>

              <p>Dear <strong>${fullName}</strong>,</p>

              <p>Your foreign travel request has been submitted successfully.</p>

              <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                <tr>
                  <td><strong>Destination Country</strong></td>
                  <td>${country}</td>
                </tr>
                <tr>
                  <td><strong>Travel Dates</strong></td>
                  <td>${startDate} to ${endDate}</td>
                </tr>
                <tr>
                  <td><strong>Purpose</strong></td>
                  <td>${purpose}</td>
                </tr>
                <tr>
                  <td><strong>Status</strong></td>
                  <td>Pending</td>
                </tr>
              </table>

              ${
                isNewTraveler
                  ? `
                    <h3 style="margin-top: 30px; color: #2563eb;">
                      Traveler Portal Access
                    </h3>

                    <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 10px;">
                      <tr>
                        <td><strong>Login URL</strong></td>
                        <td>${FRONTEND_URL}</td>
                      </tr>
                      <tr>
                        <td><strong>Username</strong></td>
                        <td>${email}</td>
                      </tr>
                      <tr>
                        <td><strong>Temporary Password</strong></td>
                        <td>${passportNumber || phone || 'ChangeMe123'}</td>
                      </tr>
                    </table>

                    <p style="margin-top: 20px; color: #d97706;">
                      Please reset your password after first login.
                    </p>
                  `
                  : `
                    <h3 style="margin-top: 30px; color: #2563eb;">
                      Traveler Portal Access
                    </h3>

                    <p>
                      You already have an FTMS account with the username:
                      <strong>${email}</strong>
                    </p>

                    <p style="color: #d97706;">
                      For security reasons, your password is not sent again.
                      Please log in using your existing password.
                    </p>
                  `
              }
            </div>
          `,
        })
        .catch((error) => {
          console.error('TRAVELER SUBMISSION EMAIL ERROR:', error);
        });

      res.status(201).json(createdRequest);
    } catch (error) {
      console.error('CREATE REQUEST ERROR:', error);
      res.status(500).json({
        error: error.message,
      });
    }
  }
);
/* =========================
   GET REQUESTS
========================= */

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
      ELSE COALESCE(r.sector, sm.sector, 'Unassigned')
    END AS sector
  FROM requests r
  LEFT JOIN users sm
    ON r.assigned_state_minister_id = sm.id
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
          (
            r.assigned_state_minister_id = $1
            AND r.current_stage = 'state_minister'
            AND r.final_status = 'pending'
          )
          OR r.final_status IN ('approved', 'rejected')
        ORDER BY
          CASE
            WHEN r.assigned_state_minister_id = $1
             AND r.current_stage = 'state_minister'
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
        error: 'Unauthorized role',
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

/* =========================
   UPDATE AMENDED REQUEST
========================= */

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
        email,
        phone,
        country,
        startDate,
        endDate,
        purpose,
        sponsor,
        passportNumber,
      } = req.body;

      const passportFile =
        req.files?.passportFile?.[0]?.filename || null;

      const invitationLetter =
        req.files?.invitationLetter?.[0]?.filename || null;

      const torFile =
        req.files?.torFile?.[0]?.filename || null;

      const result = await pool.query(
        `
        UPDATE requests
        SET
          traveler_category = COALESCE($1, traveler_category),
          organization_name = COALESCE($2, organization_name),
          full_name = COALESCE($3, full_name),
          position = COALESCE($4, position),
          department = COALESCE($5, department),
          email = COALESCE($6, email),
          phone = COALESCE($7, phone),
          country = COALESCE($8, country),
          start_date = COALESCE($9, start_date),
          end_date = COALESCE($10, end_date),
          purpose = COALESCE($11, purpose),
          sponsor = COALESCE($12, sponsor),
          passport_number = COALESCE($13, passport_number),
          passport_file = COALESCE($14, passport_file),
          invitation_letter = COALESCE($15, invitation_letter),
          tor_file = COALESCE($16, tor_file)
        WHERE id = $17
        RETURNING *
        `,
        [
          travelerCategory || null,
          organizationName || null,
          fullName || null,
          position || null,
          department || null,
          email || null,
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
          error: 'Request not found',
        });
      }

      res.json({
        message: 'Request updated successfully',
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

/* =========================
   UPDATE REQUEST STATUS
========================= */

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
        error: 'Request not found',
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
          error:
            'Only Protocol can approve Foreign Affairs response.',
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
          error:
            'Only Protocol can reject Foreign Affairs response.',
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
} else if (role === 'office_head') {
  if (existingRequest.status === 'Cleared by Protocol') {
    nextStage = 'completed';
    finalStatus = 'approved';
    displayStatus = 'Approved by Office Head';
  } else {
    nextStage = 'protocol';
    finalStatus = 'pending';
    displayStatus = 'Approved by Office Head';
  }
} 
      else if (role === 'protocol') {
        nextStage = 'office_head';
        finalStatus = 'pending';
        displayStatus = 'Cleared by Protocol';
      } else if (role === 'office_head') {
        nextStage = 'completed';
        finalStatus = 'approved';
        displayStatus = 'Approved by Office Head';
      } else if (role === 'minister') {
        nextStage = 'protocol_final';
        finalStatus = 'pending';
        displayStatus = 'Pending Foreign Affairs Response';
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

    if (
  finalStatus === 'approved' ||
  finalStatus === 'rejected'
) {
  moveFileToArchive(request.passport_file);
  moveFileToArchive(request.invitation_letter);
  moveFileToArchive(request.tor_file);
}

    await pool.query(
      `
      INSERT INTO notifications (
        user_email,
        title,
        message
      )
      VALUES ($1, $2, $3)
      `,
      [
        request.email,
        'Travel Request Updated',
        status === 'Amended'
          ? `Your travel request to ${request.country} requires amendment: ${amendmentComment}`
          : `Your travel request to ${request.country} is now ${displayStatus}.`,
      ]
    );

    sendTravelerEmail({
      request,
      status,
      displayStatus,
      amendmentComment,
    });

    let nextApprover = null;
    let nextStageName = '';

    if (
      nextStage === 'protocol' &&
      status !== 'Amended'
    ) {
      const approverResult = await pool.query(
        `
        SELECT full_name, email
        FROM users
        WHERE role = 'protocol'
        LIMIT 1
        `
      );

      nextApprover = approverResult.rows[0];
      nextStageName = 'Protocol Review';
    } else if (nextStage === 'protocol_final') {
      const approverResult = await pool.query(
        `
        SELECT full_name, email
        FROM users
        WHERE role = 'protocol'
        LIMIT 1
        `
      );

      nextApprover = approverResult.rows[0];
      nextStageName = 'Pending Foreign Affairs Response';
    } else if (nextStage === 'office_head') {
      const approverResult = await pool.query(
        `
        SELECT full_name, email
        FROM users
        WHERE role = 'office_head'
        LIMIT 1
        `
      );

      nextApprover = approverResult.rows[0];
      nextStageName = 'Office Head Review';
    } else if (nextStage === 'minister') {
      const approverResult = await pool.query(
        `
        SELECT full_name, email
        FROM users
        WHERE role = 'minister'
        LIMIT 1
        `
      );

      nextApprover = approverResult.rows[0];
      nextStageName = 'Minister Final Review';
    }

    if (
      nextApprover &&
      nextStage !== 'completed' &&
      status !== 'Amended'
    ) {
      sendTaskEmail({
        to: nextApprover.email,
        recipientName: nextApprover.full_name,
        request,
        stageName: nextStageName,
        actionUrl: FRONTEND_URL,
      }).catch((error) => {
        console.error('NEXT APPROVER EMAIL ERROR:', error);
      });
    }

    res.json({
      message: 'Status updated successfully',
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

/* =========================
   RESUBMIT AMENDED REQUEST
========================= */

app.put('/api/requests/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;

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
        error: 'Request not found',
      });
    }

    await pool.query(
      `
      UPDATE requests
      SET
        current_stage = 'protocol',
        final_status = 'pending',
        status = 'Resubmitted to Protocol'
      WHERE id = $1
      `,
      [id]
    );

    const requestResult = await pool.query(
      `
      SELECT *
      FROM requests
      WHERE id = $1
      `,
      [id]
    );

    const request = requestResult.rows[0];

    const protocolResult = await pool.query(
      `
      SELECT full_name, email
      FROM users
      WHERE role = 'protocol'
      LIMIT 1
      `
    );

    if (protocolResult.rows.length > 0) {
      const protocolUser = protocolResult.rows[0];

      sendTaskEmail({
        to: protocolUser.email,
        recipientName: protocolUser.full_name,
        request,
        stageName: 'Protocol Review',
        actionUrl: FRONTEND_URL,
      }).catch((error) => {
        console.error('RESUBMIT EMAIL ERROR:', error);
      });
    }

    res.json({
      message: 'Request resubmitted successfully',
    });
  } catch (error) {
    console.error('RESUBMIT REQUEST ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   DELETE REQUEST
========================= */

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
      message: 'Request deleted successfully',
    });
  } catch (error) {
    console.error('DELETE REQUEST ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   AUDIT TRAIL
========================= */

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
    console.error('GET AUDIT TRAIL ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   SECTOR APPROVERS
========================= */

app.get('/api/state-ministers', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        sector,
        full_name,
        email,
        role
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
    const {
      sector,
      fullName,
      email,
      password,
      role,
    } = req.body;

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        sector,
        full_name,
        email,
        password,
        role
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, sector, full_name, email, role
      `,
      [
        sector,
        fullName,
        email,
        hashedPassword,
        role,
      ]
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
    const {
      sector,
      fullName,
      email,
      role,
    } = req.body;

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
      RETURNING id, sector, full_name, email, role
      `,
      [
        sector,
        fullName,
        email,
        role,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Sector approver not found.',
      });
    }

    res.json({
      message: 'Sector approver updated successfully',
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
      message: 'Sector approver deleted successfully',
    });
  } catch (error) {
    console.error('DELETE SECTOR APPROVER ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   USERS
========================= */

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, full_name, email, role, is_active
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

app.post('/api/users', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password,
        role
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role
      `,
      [
        fullName,
        email,
        hashedPassword,
        role,
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

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role } = req.body;

    await pool.query(
      `
      UPDATE users
      SET
        full_name = $1,
        email = $2,
        role = $3
      WHERE id = $4
      `,
      [
        fullName,
        email,
        role,
        id,
      ]
    );

    res.json({
      message: 'User updated successfully',
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
      message: 'User deleted successfully',
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [
        hashedPassword,
        req.params.id,
      ]
    );

    res.json({
      message: 'Password reset successfully',
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
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        error: 'Current password is incorrect',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [
        hashedPassword,
        id,
      ]
    );

    res.json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('CHANGE PASSWORD ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   STATS
========================= */

app.get('/api/stats', async (req, res) => {
  try {
    const total = await pool.query(`
      SELECT COUNT(*)
      FROM requests
    `);

    const approved = await pool.query(`
      SELECT COUNT(*)
      FROM requests
      WHERE final_status = 'approved'
    `);

    const pending = await pool.query(`
      SELECT COUNT(*)
      FROM requests
      WHERE final_status = 'pending'
    `);

    const rejected = await pool.query(`
      SELECT COUNT(*)
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

    if (
      role === 'admin' ||
      role === 'office_head' ||
      role === 'minister'
    ) {
      result = await pool.query(`
        SELECT
          COALESCE(u.sector, 'Unassigned') AS sector,
          COUNT(*)::int AS pending_count
        FROM requests r
        LEFT JOIN users u
          ON r.assigned_state_minister_id = u.id
        WHERE r.final_status = 'pending'
        GROUP BY COALESCE(u.sector, 'Unassigned')
        ORDER BY pending_count DESC
      `);
    } else if (role === 'state_minister') {
  result = await pool.query(
    `
    SELECT *
    FROM requests
    WHERE
      (
        assigned_state_minister_id = $1
        AND current_stage = 'state_minister'
        AND final_status = 'pending'
      )
      OR final_status IN ('approved', 'rejected')
    ORDER BY
      CASE
        WHEN assigned_state_minister_id = $1
         AND current_stage = 'state_minister'
         AND final_status = 'pending'
        THEN 0
        ELSE 1
      END,
      id DESC
    `,
    [id]
  );

} else if (
  role === 'office_head' ||
  role === 'chief_executive_officer'
) {
  result = await pool.query(
    `
    SELECT *
    FROM requests
    WHERE
      (
        current_stage = $1
        AND final_status = 'pending'
      )
      OR final_status IN ('approved', 'rejected')
    ORDER BY
      CASE
        WHEN current_stage = $1
         AND final_status = 'pending'
        THEN 0
        ELSE 1
      END,
      id DESC
    `,
    [role]
  );

} else if (role === 'protocol') {
      result = await pool.query(`
        SELECT
          COALESCE(u.sector, 'Unassigned') AS sector,
          COUNT(*)::int AS pending_count
        FROM requests r
        LEFT JOIN users u
          ON r.assigned_state_minister_id = u.id
        WHERE r.final_status = 'pending'
        AND r.current_stage IN ('protocol', 'protocol_final')
        GROUP BY COALESCE(u.sector, 'Unassigned')
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

/* =========================
   REPORTS
========================= */

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
        TO_CHAR(
          DATE_TRUNC('month', start_date),
          'Mon YYYY'
        ) AS month,
        DATE_TRUNC(
          'month',
          start_date
        ) AS month_date,
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

/* =========================
   PDF GENERATION
========================= */

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
        error: 'Request not found',
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

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    doc.fontSize(22).text(
      'Ministry of Agriculture',
      { align: 'center' }
    );

    doc.moveDown();

    doc.fontSize(18).text(
      'Foreign Travel Approval Letter',
      { align: 'center' }
    );

    doc.moveDown(2);

    doc.fontSize(13);
    doc.text(`Traveler Name: ${request.full_name || '-'}`);
    doc.moveDown();
    doc.text(`Department: ${request.department || '-'}`);
    doc.moveDown();
    doc.text(`Destination Country: ${request.country || '-'}`);
    doc.moveDown();
    doc.text(`Travel Dates: ${request.start_date || '-'} to ${request.end_date || '-'}`);
    doc.moveDown();
    doc.text(`Purpose of Travel: ${request.purpose || '-'}`);
    doc.moveDown();
    doc.text(`Sponsor: ${request.sponsor || '-'}`);
    doc.moveDown();
    doc.text(`Status: ${request.status || '-'}`);
    doc.moveDown(3);
    doc.text('Authorized Signature: __________________');

    doc.addPage();

    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    doc.fontSize(22).text(
      'የግብርና ሚኒስቴር',
      { align: 'center' }
    );

    doc.moveDown();

    doc.fontSize(18).text(
      'የውጭ ጉዞ ፈቃድ ደብዳቤ',
      { align: 'center' }
    );

    doc.moveDown(2);

    doc.text(`ተጓዥ: ${request.full_name || '-'}`);
    doc.moveDown();
    doc.text(`የስራ ክፍል: ${request.department || '-'}`);
    doc.moveDown();
    doc.text(`የሚሄዱበት ሀገር: ${request.country || '-'}`);
    doc.moveDown();
    doc.text(`የጉዞ ቀን: ${request.start_date || '-'} እስከ ${request.end_date || '-'}`);
    doc.moveDown();
    doc.text(`የጉዞ ዓላማ: ${request.purpose || '-'}`);
    doc.moveDown();
    doc.text(`ስፖንሰር: ${request.sponsor || '-'}`);
    doc.moveDown();
    doc.text(`ሁኔታ: ${request.status || '-'}`);
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

/* =========================
   AFFILIATE INSTITUTIONS
========================= */

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
    const {
      organizationName,
      generalDirectorName,
      email,
      phone,
    } = req.body;

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
      [
        organizationName,
        generalDirectorName,
        email,
        phone,
      ]
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
    const {
      organizationName,
      generalDirectorName,
      email,
      phone,
    } = req.body;

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
      [
        organizationName,
        generalDirectorName,
        email,
        phone,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Organization not found',
      });
    }

    res.json({
      message: 'Organization updated successfully',
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
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    console.error('DELETE AFFILIATE ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   MINISTRY ORGANIZATIONS
========================= */

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
      [
        organizationName,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Ministry organization not found',
      });
    }

    res.json({
      message: 'Ministry organization updated successfully',
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
      message: 'Ministry organization deleted successfully',
    });
  } catch (error) {
    console.error('DELETE MINISTRY ORGANIZATION ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   NOTIFICATIONS
========================= */

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

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((error, req, res, next) => {
  console.error('GLOBAL SERVER ERROR:', error);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File size must not exceed 5MB',
    });
  }

  res.status(500).json({
    error: error.message || 'Server Error',
  });
});

/* =========================
   AUDIT TRAIL
========================= */
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
    console.error('GET AUDIT TRAIL ERROR:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});
/* =========================
   SERVER INITIALIZATION
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});