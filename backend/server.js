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

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Root
app.get('/', (req, res) => {
  res.json({ message: 'FTMS Backend Running' });
});

/* ============================================================
   AUTHENTICATION
============================================================ */

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [fullName, email, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: 'User not found' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
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
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ============================================================
   TRAVEL REQUESTS
============================================================ */

// CREATE REQUEST
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

      const passportFile = req.files?.passportFile?.[0]?.filename || null;
      const invitationLetter = req.files?.invitationLetter?.[0]?.filename || null;
      const torFile = req.files?.torFile?.[0]?.filename || null;

      const result = await pool.query(
        `
        INSERT INTO requests (
          traveler_category, organization_name, full_name, position, department,
          country, start_date, end_date, purpose, sponsor, passport_number,
          email, phone, passport_file, invitation_letter, tor_file, status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *
        `,
        [
          travelerCategory,
          organizationName,
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

      // Save notification
      await pool.query(
        `
        INSERT INTO notifications (user_email, title, message)
        VALUES ($1, $2, $3)
        `,
        [
          email,
          'Travel Request Submitted',
          `Your travel request to ${country} has been submitted.`,
        ]
      );

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Travel Request Submitted',
        html: `
          <div style="font-family: Arial; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Foreign Travel Request Submitted</h2>
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>Your foreign travel request has been submitted successfully.</p>

            <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
              <tr><td><strong>Traveler Name</strong></td><td>${fullName}</td></tr>
              <tr><td><strong>Department</strong></td><td>${department}</td></tr>
              <tr><td><strong>Destination Country</strong></td><td>${country}</td></tr>
              <tr><td><strong>Travel Start Date</strong></td><td>${startDate}</td></tr>
              <tr><td><strong>Travel End Date</strong></td><td>${endDate}</td></tr>
              <tr><td><strong>Purpose</strong></td><td>${purpose}</td></tr>
              <tr><td><strong>Sponsor</strong></td><td>${sponsor}</td></tr>
              <tr><td><strong>Status</strong></td><td><strong>Pending</strong></td></tr>
            </table>

            <p style="margin-top: 20px;">You will receive another email once your request has been reviewed.</p>
            <p>Ministry of Agriculture<br/>Foreign Travel Management System (FTMS)</p>
          </div>
        `,
      });

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error' });
    }
  }
);

// GET ALL REQUESTS
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM requests ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});
app.delete(
  '/api/requests/:id',

  async (req, res) => {

    try {

      const { id } =
        req.params;

      await pool.query(

        `
        DELETE FROM requests
        WHERE id = $1
        `,

        [id]
      );

      res.json({

        message:
          'Request deleted successfully',
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        error:
          'Server Error',
      });
    }
  }
);
// UPDATE REQUEST
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
        req.files?.passport_file?.[0]?.filename || req.body.passport_file || null;

      const invitation_letter =
        req.files?.invitation_letter?.[0]?.filename || req.body.invitation_letter || null;

      const tor_file =
        req.files?.tor_file?.[0]?.filename || req.body.tor_file || null;

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
      } = req.body;

      await pool.query(
        `
        UPDATE requests
        SET full_name=$1, position=$2, department=$3, country=$4,
            start_date=$5, end_date=$6, purpose=$7, sponsor=$8,
            passport_number=$9, email=$10, phone=$11,
            passport_file=$12, invitation_letter=$13, tor_file=$14
        WHERE id=$15
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
          id,
        ]
      );

      res.json({ message: 'Request updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error' });
    }
  }
);

// UPDATE STATUS
app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
      `UPDATE requests SET status=$1 WHERE id=$2`,
      [status, id]
    );

    const requestResult = await pool.query(
      `SELECT * FROM requests WHERE id=$1`,
      [id]
    );

    const request = requestResult.rows[0];

    // Save notification
    await pool.query(
      `
      INSERT INTO notifications (user_email, title, message)
      VALUES ($1,$2,$3)
      `,
      [
        request.email,
        `Request ${status}`,
        `Your travel request to ${request.country} has been ${status}.`,
      ]
    );

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: request.email,
      subject: `Travel Request ${status}`,
      html: `
        <div style="font-family: Arial; padding: 20px; color: #333;">
          <h2 style="color: ${status === 'Approved' ? 'green' : 'red'};">
            Travel Request ${status}
          </h2>

          <p>Dear <strong>${request.full_name}</strong>,</p>
          <p>Your travel request has been <strong>${status}</strong>.</p>

          <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <tr><td><strong>Destination</strong></td><td>${request.country}</td></tr>
            <tr><td><strong>Department</strong></td><td>${request.department}</td></tr>
            <tr><td><strong>Travel Dates</strong></td><td>${request.start_date} to ${request.end_date}</td></tr>
            <tr><td><strong>Status</strong></td><td>${status}</td></tr>
          </table>

          <p style="margin-top: 20px;">Thank you.</p>
          <p>Ministry of Agriculture<br/>Foreign Travel Management System (FTMS)</p>
        </div>
      `,
    });

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================================================
   USERS
============================================================ */

// GET USERS
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, role, is_active
      FROM users
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// CREATE USER
app.post('/api/users', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password, role)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [fullName, email, hashedPassword, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE USER
app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// RESET PASSWORD
app.put('/api/users/:id/reset-password', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);

    await pool.query(
      `UPDATE users SET password=$1 WHERE id=$2`,
      [hashedPassword, req.params.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ============================================================
   DASHBOARD STATS
============================================================ */

app.get('/api/stats', async (req, res) => {
  try {
    const total = await pool.query(`SELECT COUNT(*) FROM requests`);
    const approved = await pool.query(`SELECT COUNT(*) FROM requests WHERE status='Approved'`);
    const pending = await pool.query(`SELECT COUNT(*) FROM requests WHERE status='Pending'`);
    const rejected = await pool.query(`SELECT COUNT(*) FROM requests WHERE status='Rejected'`);

    res.json({
      totalRequests: total.rows[0].count,
      approvedRequests: approved.rows[0].count,
      pendingRequests: pending.rows[0].count,
      rejectedRequests: rejected.rows[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================================================
   PDF GENERATION
============================================================ */

app.get('/api/generate-pdf/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM requests WHERE id=$1`,
      [req.params.id]
    );

    const request = result.rows[0];
    if (!request)
      return res.status(404).json({ error: 'Request not found' });

    const pdfDir = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

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

/* ===================================
   PAGE 1 — ENGLISH
=================================== */

doc
  .fontSize(22)
  .text(
    'Ministry of Agriculture',
    {
      align: 'center',
    }
  );

doc.moveDown();

doc
  .fontSize(18)
  .text(
    'Foreign Travel Approval Letter',
    {
      align: 'center',
    }
  );

doc.moveDown(2);

doc.fontSize(13);

doc.text(
  `Traveler Name: ${request.full_name}`
);

doc.moveDown();

doc.text(
  `Department: ${request.department}`
);

doc.moveDown();

doc.text(
  `Destination Country: ${request.country}`
);

doc.moveDown();

doc.text(
  `Travel Dates: ${request.start_date} to ${request.end_date}`
);

doc.moveDown();

doc.text(
  `Purpose of Travel: ${request.purpose}`
);

doc.moveDown();

doc.text(
  `Sponsor: ${request.sponsor}`
);

doc.moveDown();

doc.text(
  `Status: ${request.status}`
);

doc.moveDown(3);

doc.text(
  'Authorized Signature: __________________'
);

/* ===================================
   PAGE 2 — AMHARIC
=================================== */

doc.addPage();

doc
  .fontSize(22)
  .text(
    'የግብርና ሚኒስቴር',
    {
      align: 'center',
    }
  );

doc.moveDown();

doc
  .fontSize(18)
  .text(
    'የውጭ ጉዞ ፈቃድ ደብዳቤ',
    {
      align: 'center',
    }
  );

doc.moveDown(2);

doc.fontSize(13);

doc.text(
  `ተጓዥ: ${request.full_name}`
);

doc.moveDown();

doc.text(
  `የስራ ክፍል: ${request.department}`
);

doc.moveDown();

doc.text(
  `የሚሄዱበት ሀገር: ${request.country}`
);

doc.moveDown();

doc.text(
  `የጉዞ ቀን:
   ${request.start_date}
   እስከ
   ${request.end_date}`
);

doc.moveDown();

doc.text(
  `የጉዞ ዓላማ:
   ${request.purpose}`
);

doc.moveDown();

doc.text(
  `ስፖንሰር:
   ${request.sponsor}`
);

doc.moveDown();

doc.text(
  `ሁኔታ:
   ${request.status}`
);

doc.moveDown(3);

doc.text(
  'ፊርማ: __________________'
);

    doc.end();

    stream.on('finish', () => res.download(filePath));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ============================================================
   AFFILIATE INSTITUTIONS
============================================================ */

app.get('/api/affiliate-institutions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM affiliate_institutions
      ORDER BY organization_name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/affiliate-institutions', async (req, res) => {
  try {
    const { organizationName } = req.body;

    const result = await pool.query(
      `
      INSERT INTO affiliate_institutions (organization_name)
      VALUES ($1)
      RETURNING *
      `,
      [organizationName]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/api/affiliate-institutions/:id', async (req, res) => {
  try {
    const { organizationName } = req.body;

    await pool.query(
      `
      UPDATE affiliate_institutions
      SET organization_name=$1
      WHERE id=$2
      `,
      [organizationName, req.params.id]
    );

    res.json({ message: 'Organization updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.delete('/api/affiliate-institutions/:id', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM affiliate_institutions WHERE id=$1`,
      [req.params.id]
    );

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ============================================================
   NOTIFICATIONS
============================================================ */

app.get('/api/notifications/:email', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_email=$1
      ORDER BY created_at DESC
      `,
      [req.params.email]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query(
      `
      UPDATE notifications
      SET is_read=TRUE
      WHERE id=$1
      `,
      [req.params.id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ============================================================
   START SERVER
============================================================ */

app.listen(process.env).PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
}