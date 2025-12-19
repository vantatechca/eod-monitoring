const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const { pool, initDB } = require('./db-postgres');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const auth = require('./auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 5000;

// Uploads directory (for backwards compatibility with any remaining local files)
const uploadsDir = path.join(__dirname, 'uploads');

// Trust proxy - required for Render.com and other reverse proxies
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : '*',
  credentials: true
};

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static files (images)
    return req.path.startsWith('/uploads');
  }
});

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax'
  }
}));

// Apply rate limiting to API routes only
app.use('/api', limiter);

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eod-monitoring',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

console.log('☁️  Cloudinary configured for image uploads');

// Initialize Database
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// ============ AUTHENTICATION ROUTES ============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user from database
    const result = await pool.query(
      `SELECT u.*, e.name as employee_name, e.email as employee_email, e.role as employee_role
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       WHERE u.username = $1 AND u.is_active = TRUE`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await auth.comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check viewer access validity
    if (user.role === 'viewer') {
      const isValid = await auth.isViewerAccessValid(user.id, pool);
      if (!isValid) {
        return res.status(403).json({ error: 'Viewer access expired or revoked' });
      }
    }

    // Store user info in session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
      employee_name: user.employee_name,
      employee_email: user.employee_email,
      employee_role: user.employee_role
    };

    res.json({
      user: req.session.user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
app.get('/api/auth/me', auth.requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// Change password (authenticated users)
app.post('/api/auth/change-password', auth.requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get current user's password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.session.user.id]
    );

    // Verify current password
    const validPassword = await auth.comparePassword(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await auth.hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.session.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============ ADMIN ROUTES ============

// Create user (admin only)
app.post('/api/admin/users', auth.requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role, employee_id } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role required' });
    }

    if (!['admin', 'employee', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'employee' && !employee_id) {
      return res.status(400).json({ error: 'Employee ID required for employee role' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash password
    const passwordHash = await auth.hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, employee_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, role, employee_id, created_at`,
      [username, passwordHash, role, employee_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create user error:', err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', auth.requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.role, u.employee_id, u.is_active, u.created_at,
             e.name as employee_name, e.email as employee_email
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user (admin only)
app.put('/api/admin/users/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, employee_id, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (password) {
      const passwordHash = await auth.hashPassword(password);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (role !== undefined) {
      if (!['admin', 'employee', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (employee_id !== undefined) {
      updates.push(`employee_id = $${paramCount++}`);
      values.push(employee_id || null);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create viewer access (admin only)
app.post('/api/admin/viewer-access', auth.requireRole('admin'), async (req, res) => {
  try {
    const { username, password, notes } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create viewer user
      const passwordHash = await auth.hashPassword(password);
      const userResult = await client.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, 'viewer')
         RETURNING id`,
        [username, passwordHash]
      );

      const userId = userResult.rows[0].id;

      // Create viewer access record (expires in 3 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await client.query(
        `INSERT INTO viewer_access (user_id, expires_at, created_by, notes)
         VALUES ($1, $2, $3, $4)`,
        [userId, expiresAt, req.session.user.id, notes || null]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Viewer access created',
        username,
        expires_at: expiresAt
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create viewer access error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to create viewer access' });
  }
});

// Get all viewer accesses (admin only)
app.get('/api/admin/viewer-access', auth.requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT va.*, u.username,
             creator.username as created_by_username
      FROM viewer_access va
      JOIN users u ON va.user_id = u.id
      JOIN users creator ON va.created_by = creator.id
      ORDER BY va.created_at DESC
    `);

    // Add status to each access
    const accesses = result.rows.map(access => ({
      ...access,
      status: access.revoked_at ? 'revoked' :
              new Date(access.expires_at) < new Date() ? 'expired' : 'active'
    }));

    res.json(accesses);
  } catch (err) {
    console.error('Get viewer access error:', err);
    res.status(500).json({ error: 'Failed to fetch viewer accesses' });
  }
});

// Revoke viewer access (admin only)
app.put('/api/admin/viewer-access/:id/revoke', auth.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE viewer_access SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Viewer access not found' });
    }

    res.json({ message: 'Viewer access revoked', access: result.rows[0] });
  } catch (err) {
    console.error('Revoke viewer access error:', err);
    res.status(500).json({ error: 'Failed to revoke viewer access' });
  }
});

// ============ EMPLOYEE ROUTES ============

// Get all employees (authenticated users)
app.get('/api/employees', auth.requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single employee (authenticated users)
app.get('/api/employees/:id', auth.requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new employee (admin only)
app.post('/api/employees', auth.requireRole('admin'), async (req, res) => {
  const { name, email, role, hourly_rate } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO employees (name, email, role, hourly_rate) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, role, hourly_rate || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update employee (admin only)
app.put('/api/employees/:id', auth.requireRole('admin'), async (req, res) => {
  const { name, email, role, hourly_rate } = req.body;

  try {
    const result = await pool.query(
      'UPDATE employees SET name = $1, email = $2, role = $3, hourly_rate = $4 WHERE id = $5 RETURNING *',
      [name, email, role, hourly_rate || 0, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete employee (admin only)
app.delete('/api/employees/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ EOD REPORT ROUTES ============

// Get all reports with filters (authenticated users)
app.get('/api/reports', auth.requireAuth, async (req, res) => {
  const { employee_id, start_date, end_date, project } = req.query;

  let query = `
    SELECT
      r.*,
      e.name as employee_name,
      e.email as employee_email,
      e.role as employee_role
    FROM eod_reports r
    JOIN employees e ON r.employee_id = e.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  // Employees can only see their own reports
  if (req.session.user.role === 'employee') {
    query += ` AND r.employee_id = $${paramCount++}`;
    params.push(req.session.user.employee_id);
  } else if (employee_id) {
    // Admin and viewers can filter by employee
    query += ` AND r.employee_id = $${paramCount++}`;
    params.push(employee_id);
  }

  if (start_date) {
    query += ` AND r.date >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND r.date <= $${paramCount++}`;
    params.push(end_date);
  }

  if (project) {
    query += ` AND r.project = $${paramCount++}`;
    params.push(project);
  }

  query += ' ORDER BY r.date DESC, r.created_at DESC';

  try {
    const reportsResult = await pool.query(query, params);

    if (reportsResult.rows.length === 0) {
      return res.json([]);
    }

    const reportIds = reportsResult.rows.map(r => r.id);
    const placeholders = reportIds.map((_, i) => `$${i + 1}`).join(',');
    const screenshotsResult = await pool.query(
      `SELECT * FROM screenshots WHERE report_id IN (${placeholders})`,
      reportIds
    );

    const reportsWithScreenshots = reportsResult.rows.map(report => ({
      ...report,
      screenshots: screenshotsResult.rows.filter(s => s.report_id === report.id)
    }));

    res.json(reportsWithScreenshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single report
app.get('/api/reports/:id', async (req, res) => {
  try {
    const reportResult = await pool.query(
      `SELECT
        r.*,
        e.name as employee_name,
        e.email as employee_email,
        e.role as employee_role
      FROM eod_reports r
      JOIN employees e ON r.employee_id = e.id
      WHERE r.id = $1`,
      [req.params.id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const screenshotsResult = await pool.query(
      'SELECT * FROM screenshots WHERE report_id = $1',
      [req.params.id]
    );

    res.json({
      ...reportResult.rows[0],
      screenshots: screenshotsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new EOD report with screenshots (authenticated users)
app.post('/api/reports', auth.requireAuth, upload.array('screenshots', 10), async (req, res) => {
  const { employee_id, date, hours, project, description, captions } = req.body;

  if (!employee_id || !date || !hours) {
    return res.status(400).json({ error: 'Employee ID, date, and hours are required' });
  }

  // Employees can only create reports for themselves
  if (req.session.user.role === 'employee' && parseInt(employee_id) !== req.session.user.employee_id) {
    return res.status(403).json({ error: 'You can only create reports for yourself' });
  }

  // Viewers cannot create reports
  if (req.session.user.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot create reports' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const reportResult = await client.query(
      'INSERT INTO eod_reports (employee_id, date, hours, project, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employee_id, date, hours, project || '', description || '']
    );

    const reportId = reportResult.rows[0].id;

    // Insert screenshots if any
    if (req.files && req.files.length > 0) {
      let captionsArray = [];
      try {
        captionsArray = captions ? JSON.parse(captions) : [];
      } catch (e) {
        captionsArray = [];
      }

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const caption = captionsArray[i] || '';
        // file.path contains the Cloudinary URL
        // file.filename contains the Cloudinary public_id
        console.log(`📸 Saving screenshot to Cloudinary: ${file.filename} for report ${reportId}`);
        await client.query(
          'INSERT INTO screenshots (report_id, filename, filepath, caption) VALUES ($1, $2, $3, $4)',
          [reportId, file.originalname, file.path, caption]
        );
      }
    }

    // Fetch the created screenshots to return complete data
    const screenshotsResult = await client.query(
      'SELECT * FROM screenshots WHERE report_id = $1',
      [reportId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...reportResult.rows[0],
      screenshots: screenshotsResult.rows
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update report (auth required, with edit permission check)
app.put('/api/reports/:id', auth.requireAuth, upload.array('screenshots', 10), async (req, res, next) => {
  // Check permission before proceeding
  await auth.canEditReport(req, res, next, pool);
}, async (req, res) => {
  const { employee_id, date, hours, project, description, captions, deleted_screenshot_ids, updated_captions } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE eod_reports SET employee_id = $1, date = $2, hours = $3, project = $4, description = $5 WHERE id = $6 RETURNING *',
      [employee_id, date, hours, project || '', description, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    // Handle deleted screenshots
    if (deleted_screenshot_ids) {
      let deletedIds = [];
      try {
        deletedIds = JSON.parse(deleted_screenshot_ids);
      } catch (e) {
        deletedIds = [];
      }

      if (deletedIds.length > 0) {
        // Get screenshot filepaths before deleting
        const placeholders = deletedIds.map((_, i) => `$${i + 1}`).join(',');
        const screenshotsToDelete = await client.query(
          `SELECT filepath FROM screenshots WHERE id IN (${placeholders})`,
          deletedIds
        );

        // Delete screenshot files from Cloudinary (only if it's a Cloudinary URL)
        for (const screenshot of screenshotsToDelete.rows) {
          try {
            // Only delete from Cloudinary if it's a Cloudinary URL
            if (screenshot.filepath.startsWith('http://') || screenshot.filepath.startsWith('https://')) {
              // Extract public_id from Cloudinary URL
              // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/eod-monitoring/filename.jpg
              const urlParts = screenshot.filepath.split('/');
              const filenameWithExt = urlParts[urlParts.length - 1];
              const filename = filenameWithExt.split('.')[0];
              const public_id = `eod-monitoring/${filename}`;

              await cloudinary.uploader.destroy(public_id);
              console.log(`🗑️  Deleted from Cloudinary: ${public_id}`);
            } else {
              console.log(`⏭️  Skipping local file (not on Cloudinary): ${screenshot.filepath}`);
            }
          } catch (err) {
            console.error(`❌ Error deleting from Cloudinary: ${screenshot.filepath}`, err.message);
          }
        }

        // Delete from database
        await client.query(
          `DELETE FROM screenshots WHERE id IN (${placeholders})`,
          deletedIds
        );
      }
    }

    // Handle updated captions for existing screenshots
    if (updated_captions) {
      let captionsObj = {};
      try {
        captionsObj = JSON.parse(updated_captions);
      } catch (e) {
        captionsObj = {};
      }

      for (const [screenshotId, caption] of Object.entries(captionsObj)) {
        await client.query(
          'UPDATE screenshots SET caption = $1 WHERE id = $2',
          [caption, screenshotId]
        );
      }
    }

    // Insert new screenshots if any
    if (req.files && req.files.length > 0) {
      let captionsArray = [];
      try {
        captionsArray = captions ? JSON.parse(captions) : [];
      } catch (e) {
        captionsArray = [];
      }

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const caption = captionsArray[i] || '';
        // file.path contains the Cloudinary URL
        console.log(`📸 Saving screenshot to Cloudinary: ${file.filename} for report ${req.params.id}`);
        await client.query(
          'INSERT INTO screenshots (report_id, filename, filepath, caption) VALUES ($1, $2, $3, $4)',
          [req.params.id, file.originalname, file.path, caption]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      ...result.rows[0],
      screenshots_added: req.files ? req.files.length : 0
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating report:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Delete report
app.delete('/api/reports/:id', auth.requireAuth, async (req, res, next) => {
  // Check permission before proceeding
  await auth.canEditReport(req, res, next, pool);
}, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get screenshots to delete files
    const screenshotsResult = await client.query(
      'SELECT filepath FROM screenshots WHERE report_id = $1',
      [req.params.id]
    );

    // Delete screenshot files from Cloudinary or local storage
    for (const screenshot of screenshotsResult.rows) {
      try {
        // Check if it's a Cloudinary URL
        if (screenshot.filepath && (screenshot.filepath.startsWith('http://') || screenshot.filepath.startsWith('https://'))) {
          // Delete from Cloudinary
          const urlParts = screenshot.filepath.split('/');
          const filenameWithExt = urlParts[urlParts.length - 1];
          const filename = filenameWithExt.split('.')[0];
          const public_id = `eod-monitoring/${filename}`;

          await cloudinary.uploader.destroy(public_id);
          console.log(`🗑️  Deleted from Cloudinary: ${public_id}`);
        } else {
          // Delete local file (for backwards compatibility)
          const filePath = path.join(uploadsDir, screenshot.filepath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  Deleted local file: ${screenshot.filepath}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error deleting screenshot: ${screenshot.filepath}`, err.message);
        // Continue deleting other files even if one fails
      }
    }

    // Delete report (screenshots will be deleted via CASCADE)
    const result = await client.query('DELETE FROM eod_reports WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============ STATISTICS ROUTES ============

app.get('/api/projects', auth.requireAuth, async (req, res) => {
  try {
    let query = 'SELECT DISTINCT project FROM eod_reports WHERE project IS NOT NULL AND project != \'\'';

    // Employees only see their own projects
    if (req.session.user.role === 'employee') {
      query += ` AND employee_id = ${req.session.user.employee_id}`;
    }

    query += ' ORDER BY project';

    const result = await pool.query(query);
    const projects = result.rows.map(row => row.project);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', auth.requireAuth, async (req, res) => {
  try {
    const employeesResult = await pool.query('SELECT COUNT(*) as count FROM employees');

    let reportsQuery = 'SELECT COUNT(*) as count FROM eod_reports';
    let hoursQuery = 'SELECT SUM(hours) as total FROM eod_reports';
    let todayQuery = 'SELECT COUNT(*) as count FROM eod_reports WHERE date = CURRENT_DATE';

    // Employees only see their own stats
    if (req.session.user.role === 'employee') {
      const employeeFilter = ` WHERE employee_id = ${req.session.user.employee_id}`;
      reportsQuery += employeeFilter;
      hoursQuery += employeeFilter;
      todayQuery += ` AND employee_id = ${req.session.user.employee_id}`;
    }

    const reportsResult = await pool.query(reportsQuery);
    const hoursResult = await pool.query(hoursQuery);
    const todayResult = await pool.query(todayQuery);

    res.json({
      totalEmployees: parseInt(employeesResult.rows[0].count),
      totalReports: parseInt(reportsResult.rows[0].count),
      totalHours: parseFloat(hoursResult.rows[0].total) || 0,
      reportsToday: parseInt(todayResult.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ GALLERY ROUTES ============

// Get all screenshots with filters for gallery view (authenticated users)
app.get('/api/gallery', auth.requireAuth, async (req, res) => {
  const { employee_id, start_date, end_date } = req.query;

  let query = `
    SELECT
      s.*,
      e.name as employee_name,
      e.email as employee_email,
      r.date as report_date,
      r.project
    FROM screenshots s
    JOIN eod_reports r ON s.report_id = r.id
    JOIN employees e ON r.employee_id = e.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  // Employees can only see their own gallery
  if (req.session.user.role === 'employee') {
    query += ` AND r.employee_id = $${paramCount++}`;
    params.push(req.session.user.employee_id);
  } else if (employee_id) {
    // Admin and viewers can filter by employee
    query += ` AND r.employee_id = $${paramCount++}`;
    params.push(employee_id);
  }

  if (start_date) {
    query += ` AND r.date >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND r.date <= $${paramCount++}`;
    params.push(end_date);
  }

  query += ' ORDER BY s.uploaded_at DESC, r.date DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Gallery fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ EXPORT ROUTES ============

app.get('/api/reports/export/csv', async (req, res) => {
  const { employee_id, start_date, end_date, project } = req.query;

  let query = `
    SELECT
      r.date,
      e.name as employee_name,
      e.email as employee_email,
      e.role as employee_role,
      r.hours,
      r.project,
      r.description
    FROM eod_reports r
    JOIN employees e ON r.employee_id = e.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  if (employee_id) {
    query += ` AND r.employee_id = $${paramCount++}`;
    params.push(employee_id);
  }

  if (start_date) {
    query += ` AND r.date >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND r.date <= $${paramCount++}`;
    params.push(end_date);
  }

  if (project) {
    query += ` AND r.project = $${paramCount++}`;
    params.push(project);
  }

  query += ' ORDER BY r.date DESC';

  try {
    const result = await pool.query(query, params);

    let csv = 'Date,Employee Name,Email,Role,Hours,Project/App,Description\n';
    result.rows.forEach(row => {
      csv += `"${row.date}","${row.employee_name}","${row.employee_email}","${row.employee_role}",${row.hours},"${row.project || ''}","${row.description || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=eod_reports.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get missing EODs
app.get('/api/missing-eods', async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const employeesResult = await pool.query('SELECT id, name, role FROM employees ORDER BY name');
    const reportsResult = await pool.query(
      'SELECT DISTINCT employee_id FROM eod_reports WHERE date = $1',
      [targetDate]
    );

    const reportedEmployeeIds = reportsResult.rows.map(r => r.employee_id);
    const missingEmployees = employeesResult.rows.filter(e => !reportedEmployeeIds.includes(e.id));

    res.json({
      date: targetDate,
      total_employees: employeesResult.rows.length,
      reported: reportedEmployeeIds.length,
      missing: missingEmployees.length,
      missing_employees: missingEmployees
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get cost calculation
app.get('/api/costs', async (req, res) => {
  const { employee_id, project, start_date, end_date } = req.query;

  let query = `
    SELECT
      r.employee_id,
      e.name as employee_name,
      e.hourly_rate,
      SUM(r.hours) as total_hours,
      COUNT(r.id) as report_count,
      (SUM(r.hours) * e.hourly_rate) as total_cost
    FROM eod_reports r
    JOIN employees e ON r.employee_id = e.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  if (employee_id) {
    query += ` AND r.employee_id = $${paramCount++}`;
    params.push(employee_id);
  }

  if (project) {
    query += ` AND r.project = $${paramCount++}`;
    params.push(project);
  }

  if (start_date) {
    query += ` AND r.date >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND r.date <= $${paramCount++}`;
    params.push(end_date);
  }

  query += ' GROUP BY r.employee_id, e.name, e.hourly_rate ORDER BY total_cost DESC';

  try {
    const result = await pool.query(query, params);

    const grand_total = result.rows.reduce((sum, row) => sum + (parseFloat(row.total_cost) || 0), 0);
    const total_hours = result.rows.reduce((sum, row) => sum + (parseFloat(row.total_hours) || 0), 0);

    res.json({
      employees: result.rows,
      summary: {
        total_cost: grand_total,
        total_hours: total_hours,
        average_rate: total_hours > 0 ? grand_total / total_hours : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete reports
app.post('/api/reports/bulk-delete', async (req, res) => {
  const { report_ids } = req.body;

  if (!report_ids || !Array.isArray(report_ids) || report_ids.length === 0) {
    return res.status(400).json({ error: 'report_ids array is required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const placeholders = report_ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await client.query(
      `DELETE FROM eod_reports WHERE id IN (${placeholders})`,
      report_ids
    );

    await client.query('COMMIT');
    res.json({ deleted: result.rowCount, report_ids });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get last report for employee (for quick entry templates)
app.get('/api/employees/:id/last-report', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM eod_reports
       WHERE employee_id = $1
       ORDER BY date DESC, created_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Database connection closed');
  process.exit(0);
});
