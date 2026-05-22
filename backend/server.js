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
const sendTaskEmail = async ({
  to,
  recipientName,
  request,
  stageName,
  actionUrl,
}) => {
  if (!to) return;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `FTMS Task Assigned: ${request.full_name} - ${request.country}`,
    html: `
      <div style="font-family: Arial; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">
          New FTMS Task Assigned
        </h2>

        <p>
          Dear <strong>${recipientName || 'Approver'}</strong>,
        </p>

        <p>
          A travel request has been assigned to you for review.
        </p>

        <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
          <tr>
            <td><strong>Traveler</strong></td>
            <td>${request.full_name}</td>
          </tr>

          <tr>
            <td><strong>Department</strong></td>
            <td>${request.department}</td>
          </tr>

          <tr>
            <td><strong>Destination</strong></td>
            <td>${request.country}</td>
          </tr>

          <tr>
            <td><strong>Travel Dates</strong></td>
            <td>${request.start_date} to ${request.end_date}</td>
          </tr>

          <tr>
            <td><strong>Purpose</strong></td>
            <td>${request.purpose}</td>
          </tr>

          <tr>
            <td><strong>Current Stage</strong></td>
            <td>${stageName}</td>
          </tr>
        </table>

        <p style="margin-top: 20px;">
          Please log in to FTMS and take the required action.
        </p>

        <p>
          <a
            href="${actionUrl || 'http://localhost:3000'}"
            style="
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 12px 18px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            "
          >
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

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'FTMS Backend Running' });
});

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
      VALUES ($1,$2,$3,$4)
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
    res.status(500).json({ error: 'Server Error' });
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
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
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
    res.status(500).json({ error: 'Server Error' });
  }
});

/* =========================
   TRAVEL REQUESTS
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

const isNewTraveler =
  existingUser.rows.length === 0;

if (isNewTraveler) {
  const hashedPassword =
    await bcrypt.hash(passportNumber, 10);

  await pool.query(
    `
    INSERT INTO users (
      full_name,
      email,
      password,
      role
    )
    VALUES ($1,$2,$3,$4)
    `,
    [
      fullName,
      email,
      hashedPassword,
      'traveler',
    ]
  );
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
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20
        )
        RETURNING *
        `,
        [
          travelerCategory,
          organizationName,
          assignedStateMinisterId || null,
          'state_minister',
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

const createdRequest =
  result.rows[0];

const stateMinisterResult =
  await pool.query(
    `
    SELECT
      full_name,
      email
    FROM users
    WHERE id = $1
    `,
    [assignedStateMinisterId]
  );

if (
  stateMinisterResult.rows.length > 0
) {

  const stateMinister =
    stateMinisterResult.rows[0];

  await sendTaskEmail({
    to: stateMinister.email,

    recipientName:
      stateMinister.full_name,

    request: createdRequest,

    stageName:
      'State Minister Review',

    actionUrl:
      'http://localhost:3000',
  });
}      
      await pool.query(
        `
        INSERT INTO notifications (
          user_email,
          title,
          message
        )
        VALUES ($1,$2,$3)
        `,
        [
          email,
          'Travel Request Submitted',
          `Your travel request to ${country} has been submitted.`,
        ]
      );

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Travel Request Submitted',
        html: `
          <div style="font-family: Arial; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">
              Foreign Travel Request Submitted
            </h2>

            <p>Dear <strong>${fullName}</strong>,</p>

            <p>
              Your foreign travel request has been submitted successfully.
            </p>

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
          <td>http://localhost:3000</td>
        </tr>

        <tr>
          <td><strong>Username</strong></td>
          <td>${email}</td>
        </tr>

        <tr>
          <td><strong>Temporary Password</strong></td>
          <td>${passportNumber}</td>
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

        If you forgot your password, please use the Reset Password menu in FTMS
        or contact the system administrator.
      </p>
    `
}

            <p style="margin-top: 20px; color: #d97706;">
              Please change your password after first login.
            </p>

            <p style="margin-top: 30px;">
              Ministry of Agriculture<br/>
              Foreign Travel Management System (FTMS)
            </p>
          </div>
        `,
      });

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('CREATE REQUEST ERROR:', error);
      res.status(500).json({ error: 'Server Error' });
    }
  }
);

app.get('/api/requests', async (req, res) => {
  try {
    const { role, email, id } = req.query;

    let result;

    if (role === 'admin') {
      result = await pool.query(`
        SELECT *
        FROM requests
        ORDER BY id DESC
      `);
    }

    else if (role === 'traveler') {
      result = await pool.query(
        `
        SELECT *
        FROM requests
        WHERE email = $1
        ORDER BY id DESC
        `,
        [email]
      );
    }

    else if (role === 'state_minister') {
      result = await pool.query(
        `
        SELECT *
        FROM requests
        WHERE assigned_state_minister_id = $1
        AND current_stage = 'state_minister'
        AND final_status = 'pending'
        ORDER BY id DESC
        `,
        [id]
      );
    }

    else if (role === 'protocol') {
      result = await pool.query(
        `
        SELECT *
        FROM requests
        WHERE current_stage = 'protocol'
        AND final_status = 'pending'
        ORDER BY id DESC
        `
      );
    }

    else if (role === 'office_head') {
      result = await pool.query(
        `
        SELECT *
        FROM requests
        WHERE current_stage = 'office_head'
        AND final_status = 'pending'
        ORDER BY id DESC
        `
      );
    }

    else if (role === 'minister') {
      result = await pool.query(
        `
        SELECT *
        FROM requests
        WHERE current_stage = 'minister'
        AND final_status = 'pending'
        ORDER BY id DESC
        `
      );
    }

    else {
      return res.status(403).json({
        error: 'Unauthorized role',
      });
    }

    res.json(result.rows);

  } catch (error) {
    console.error('GET REQUESTS ERROR:', error);
    res.status(500).json({
      error: 'Server Error',
    });
  }
});

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
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put(
  '/api/requests/:id',
  upload.fields([
    { name: 'passport_file', maxCount: 1 },
    { name: 'invitation_letter', maxCount: 1 },
    { name: 'tor_file', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const passport_file =
        req.files?.passport_file?.[0]?.filename ||
        req.body.passport_file ||
        null;

      const invitation_letter =
        req.files?.invitation_letter?.[0]?.filename ||
        req.body.invitation_letter ||
        null;

      const tor_file =
        req.files?.tor_file?.[0]?.filename ||
        req.body.tor_file ||
        null;

      const {
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
        assigned_state_minister_id,
      } = req.body;

      await pool.query(
        `
        UPDATE requests
        SET
          full_name = $1,
          position = $2,
          department = $3,
          country = $4,
          start_date = $5,
          end_date = $6,
          purpose = $7,
          sponsor = $8,
          passport_number = $9,
          email = $10,
          phone = $11,
          passport_file = $12,
          invitation_letter = $13,
          tor_file = $14,
          assigned_state_minister_id = $15
        WHERE id = $16
        `,
        [
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
          assigned_state_minister_id || null,
          id,
        ]
      );

      res.json({
        message: 'Request updated successfully',
      });
    } catch (error) {
      console.error('UPDATE REQUEST ERROR:', error);
      res.status(500).json({ error: 'Server Error' });
    }
  }
);

app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role, comment } = req.body;

    let nextStage = 'state_minister';
    let finalStatus = 'pending';
    let displayStatus = status;
    let amendmentComment = null;
    let amendedBy = null;

    if (status === 'Amended') {
      nextStage = 'traveler';
      finalStatus = 'amended';
      displayStatus = 'Amendment Requested';
      amendmentComment = comment || 'Please amend the request.';
      amendedBy = role;
    }

    else if (status === 'Rejected') {
      nextStage = 'completed';
      finalStatus = 'rejected';
      displayStatus = 'Rejected';
    }

    else if (status === 'Approved') {
      if (role === 'state_minister') {
        nextStage = 'protocol';
        displayStatus = 'Approved by State Minister';
      }

      else if (role === 'protocol') {
        nextStage = 'office_head';
        displayStatus = 'Cleared by Protocol';
      }

      else if (role === 'office_head') {
        nextStage = 'minister';
        displayStatus = 'Approved by Office Head';
      }

      else if (role === 'minister') {
        nextStage = 'completed';
        finalStatus = 'approved';
        displayStatus = 'Approved';
      }

      else if (role === 'admin') {
        nextStage = 'completed';
        finalStatus = 'approved';
        displayStatus = 'Approved';
      }
    }

    await pool.query(
      `
      UPDATE requests
      SET
        status = $1,
        current_stage = $2,
        final_status = $3,
        amendment_comment = COALESCE($4, amendment_comment),
        amended_by = COALESCE($5, amended_by)
      WHERE id = $6
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

    const requestResult = await pool.query(
      `
      SELECT *
      FROM requests
      WHERE id = $1
      `,
      [id]
    );

    const request = requestResult.rows[0];

    await pool.query(
      `
      INSERT INTO notifications (
        user_email,
        title,
        message
      )
      VALUES ($1,$2,$3)
      `,
      [
        request.email,
        'Travel Request Updated',
        status === 'Amended'
          ? `Your travel request to ${request.country} requires amendment: ${amendmentComment}`
          : `Your travel request to ${request.country} is now at ${nextStage}.`,
      ]
    );

    await transporter.sendMail({
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

          <p>
            Dear <strong>${request.full_name}</strong>,
          </p>

          <p>
            Your travel request to
            <strong>${request.country}</strong>
            has been updated.
          </p>

          ${
            status === 'Amended'
              ? `
                <p>
                  <strong>Amendment Comment:</strong>
                  ${amendmentComment}
                </p>
              `
              : ''
          }

          <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
            <tr>
              <td><strong>Status</strong></td>
              <td>${displayStatus}</td>
            </tr>

            <tr>
              <td><strong>Current Stage</strong></td>
              <td>${nextStage}</td>
            </tr>

            <tr>
              <td><strong>Final Status</strong></td>
              <td>${finalStatus}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;">
            Ministry of Agriculture<br/>
            Foreign Travel Management System
          </p>
        </div>
      `,
    });

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

app.put('/api/requests/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;

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

    res.json({
      message: 'Request resubmitted successfully',
    });

  } catch (error) {
    console.error('RESUBMIT REQUEST ERROR:', error);
    res.status(500).json({
      error: 'Server Error',
    });
  }
});

/* =========================
   STATE MINISTERS
========================= */

app.post('/api/state-ministers', async (req, res) => {
  try {
    const {
      sector,
      fullName,
      email,
      password,
    } = req.body;

    const hashedPassword =
      await bcrypt.hash(password, 10);
let initialStage =
  'state_minister';

let initialAssignedStateMinisterId =
  assignedStateMinisterId;

const loggedInUser =
  await pool.query(
    `
    SELECT role
    FROM users
    WHERE email = $1
    `,
    [email]
  );

const loggedInUserRole =
  loggedInUser.rows[0]?.role;

if (
  loggedInUserRole ===
  'state_minister'
) {

  initialStage =
    'protocol';

  initialAssignedStateMinisterId =
    null;
}
    const result = await pool.query(
      `
      INSERT INTO users (
        sector,
        full_name,
        email,
        password,
        role
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, sector, full_name, email, role
      `,
      [
        sector,
        fullName,
        email,
        hashedPassword,
        'state_minister',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CREATE STATE MINISTER ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/state-ministers', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password,
        role
      )
      VALUES ($1,$2,$3,$4)
      RETURNING id, full_name, email, role
      `,
      [
        fullName,
        email,
        hashedPassword,
        'state_minister',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CREATE STATE MINISTER ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/api/state-ministers/:id', async (req, res) => {
  try {
    const { fullName, email } = req.body;

    await pool.query(
      `
      UPDATE users
      SET
        full_name = $1,
        email = $2
      WHERE id = $3
      AND role = 'state_minister'
      `,
      [
        fullName,
        email,
        req.params.id,
      ]
    );

    res.json({
      message: 'State Minister updated successfully',
    });
  } catch (error) {
    console.error('UPDATE STATE MINISTER ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.delete('/api/state-ministers/:id', async (req, res) => {
  try {
    await pool.query(
      `
      DELETE FROM users
      WHERE id = $1
      AND role = 'state_minister'
      `,
      [req.params.id]
    );

    res.json({
      message: 'State Minister deleted successfully',
    });
  } catch (error) {
    console.error('DELETE STATE MINISTER ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});
/* =========================
   STATE MINISTERS
========================= */

app.get('/api/state-ministers', async (req, res) => {

  try {

    const result = await pool.query(

      `
      SELECT
        id,
        sector,
        full_name,
        email
      FROM users
      WHERE role = 'state_minister'
      ORDER BY sector ASC
      `
    );

    res.json(result.rows);

  } catch (error) {

    console.error(
      'GET STATE MINISTERS ERROR:',
      error
    );

    res.status(500).json({

      error: 'Server Error',
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
    } = req.body;

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const result = await pool.query(

      `
      INSERT INTO users (
        sector,
        full_name,
        email,
        password,
        role
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING
        id,
        sector,
        full_name,
        email,
        role
      `,

      [
        sector,
        fullName,
        email,
        hashedPassword,
        'state_minister',
      ]
    );

    res.status(201).json(
      result.rows[0]
    );

  } catch (error) {

    console.error(
      'CREATE STATE MINISTER ERROR:',
      error
    );

    res.status(500).json({

      error: 'Server Error',
    });
  }
});

app.delete('/api/state-ministers/:id', async (req, res) => {

  try {

    await pool.query(

      `
      DELETE FROM users
      WHERE id = $1
      AND role = 'state_minister'
      `,

      [req.params.id]
    );

    res.json({

      message:
        'State Minister deleted successfully',
    });

  } catch (error) {

    console.error(
      'DELETE STATE MINISTER ERROR:',
      error
    );

    res.status(500).json({

      error: 'Server Error',
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
      SELECT
        id,
        full_name,
        email,
        role,
        is_active
      FROM users
      ORDER BY id DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET USERS ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password,
        role
      )
      VALUES ($1,$2,$3,$4)
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
    res.status(500).json({ error: 'Server Error' });
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
    res.status(500).json({ error: 'Server Error' });
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
    res.status(500).json({ error: 'Server Error' });
  }
});

/* =========================
   STATS
========================= */

app.get('/api/stats', async (req, res) => {
  try {
    const total = await pool.query(
      `SELECT COUNT(*) FROM requests`
    );

    const approved = await pool.query(
      `
      SELECT COUNT(*)
      FROM requests
      WHERE status = 'Approved'
      `
    );

    const pending = await pool.query(
      `
      SELECT COUNT(*)
      FROM requests
      WHERE status = 'Pending'
      `
    );

    const rejected = await pool.query(
      `
      SELECT COUNT(*)
      FROM requests
      WHERE status = 'Rejected'
      `
    );

    res.json({
      totalRequests: total.rows[0].count,
      approvedRequests: approved.rows[0].count,
      pendingRequests: pending.rows[0].count,
      rejectedRequests: rejected.rows[0].count,
    });
  } catch (error) {
    console.error('STATS ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   PDF
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
      fs.mkdirSync(pdfDir);
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
    doc.font(fontPath);

    doc.fontSize(22).text('Ministry of Agriculture', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(18).text('Foreign Travel Approval Letter', {
      align: 'center',
    });

    doc.moveDown(2);

    doc.fontSize(13);
    doc.text(`Traveler Name: ${request.full_name}`);
    doc.moveDown();
    doc.text(`Department: ${request.department}`);
    doc.moveDown();
    doc.text(`Destination Country: ${request.country}`);
    doc.moveDown();
    doc.text(`Travel Dates: ${request.start_date} to ${request.end_date}`);
    doc.moveDown();
    doc.text(`Purpose of Travel: ${request.purpose}`);
    doc.moveDown();
    doc.text(`Sponsor: ${request.sponsor}`);
    doc.moveDown();
    doc.text(`Status: ${request.status}`);
    doc.moveDown(3);
    doc.text('Authorized Signature: __________________');

    doc.addPage();

    doc.fontSize(22).text('የግብርና ሚኒስቴር', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(18).text('የውጭ ጉዞ ፈቃድ ደብዳቤ', {
      align: 'center',
    });

    doc.moveDown(2);

    doc.fontSize(13);
    doc.text(`ተጓዥ: ${request.full_name}`);
    doc.moveDown();
    doc.text(`የስራ ክፍል: ${request.department}`);
    doc.moveDown();
    doc.text(`የሚሄዱበት ሀገር: ${request.country}`);
    doc.moveDown();
    doc.text(`የጉዞ ቀን: ${request.start_date} እስከ ${request.end_date}`);
    doc.moveDown();
    doc.text(`የጉዞ ዓላማ: ${request.purpose}`);
    doc.moveDown();
    doc.text(`ስፖንሰር: ${request.sponsor}`);
    doc.moveDown();
    doc.text(`ሁኔታ: ${request.status}`);
    doc.moveDown(3);
    doc.text('ፊርማ: __________________');

    doc.end();

    stream.on('finish', () => {
      res.download(filePath);
    });
  } catch (error) {
    console.error('PDF ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* =========================
   AFFILIATE INSTITUTIONS
========================= */

app.get('/api/affiliate-institutions', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM affiliate_institutions
      ORDER BY organization_name ASC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET AFFILIATES ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/affiliate-institutions', async (req, res) => {
  try {
    const { organizationName } = req.body;

    const result = await pool.query(
      `
      INSERT INTO affiliate_institutions (
        organization_name
      )
      VALUES ($1)
      RETURNING *
      `,
      [organizationName]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CREATE AFFILIATE ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/api/affiliate-institutions/:id', async (req, res) => {
  try {
    const { organizationName } = req.body;

    await pool.query(
      `
      UPDATE affiliate_institutions
      SET organization_name = $1
      WHERE id = $2
      `,
      [
        organizationName,
        req.params.id,
      ]
    );

    res.json({
      message: 'Organization updated successfully',
    });
  } catch (error) {
    console.error('UPDATE AFFILIATE ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
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
    res.status(500).json({ error: 'Server Error' });
  }
});

/* =========================
   NOTIFICATIONS
========================= */

app.get('/api/notifications/:email', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_email = $1
      ORDER BY created_at DESC
      `,
      [req.params.email]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET NOTIFICATIONS ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('READ NOTIFICATION ERROR:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});
/* =========================
   Reset Password
========================= */
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

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [hashedPassword, id]
    );

    res.json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('CHANGE PASSWORD ERROR:', error);
    res.status(500).json({
      error: 'Server Error',
    });
  }
});
/* =========================
   Reports
========================= */
app.get('/api/reports/status-summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(final_status, 'pending') AS status,
        COUNT(*)::int AS count
      FROM requests
      GROUP BY COALESCE(final_status, 'pending')
      ORDER BY status
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('STATUS SUMMARY REPORT ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/sector-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(u.sector, 'Unassigned') AS sector,
        COALESCE(r.final_status, 'pending') AS final_status,
        COUNT(*)::int AS count
      FROM requests r
      LEFT JOIN users u
        ON r.assigned_state_minister_id = u.id
      GROUP BY
        COALESCE(u.sector, 'Unassigned'),
        COALESCE(r.final_status, 'pending')
      ORDER BY sector
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('SECTOR STATUS REPORT ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/monthly-requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        COUNT(*)::int AS total
      FROM requests
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('MONTHLY REQUEST REPORT ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/stage-summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(current_stage, 'state_minister') AS current_stage,
        COUNT(*)::int AS count
      FROM requests
      GROUP BY COALESCE(current_stage, 'state_minister')
      ORDER BY current_stage
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('STAGE SUMMARY REPORT ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});