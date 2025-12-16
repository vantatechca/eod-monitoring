const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { pool, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (uploaded images) - BEFORE rate limiter
app.use('/uploads', express.static(uploadsDir));

// Apply rate limiting to API routes only
app.use('/api', limiter);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Initialize Database
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// ============ EMPLOYEE ROUTES ============

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single employee
app.get('/api/employees/:id', async (req, res) => {
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

// Create new employee
app.post('/api/employees', async (req, res) => {
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

// Update employee
app.put('/api/employees/:id', async (req, res) => {
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

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
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

// Get all reports with filters
app.get('/api/reports', async (req, res) => {
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

// Create new EOD report with screenshots
app.post('/api/reports', upload.array('screenshots', 10), async (req, res) => {
  const { employee_id, date, hours, project, description, captions } = req.body;

  if (!employee_id || !date || !hours) {
    return res.status(400).json({ error: 'Employee ID, date, and hours are required' });
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
        await client.query(
          'INSERT INTO screenshots (report_id, filename, filepath, caption) VALUES ($1, $2, $3, $4)',
          [reportId, file.originalname, file.filename, caption]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...reportResult.rows[0],
      screenshots: req.files ? req.files.length : 0
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update report
app.put('/api/reports/:id', upload.array('screenshots', 10), async (req, res) => {
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

        // Delete screenshot files from disk
        screenshotsToDelete.rows.forEach(screenshot => {
          const filePath = path.join(uploadsDir, screenshot.filepath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });

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
        await client.query(
          'INSERT INTO screenshots (report_id, filename, filepath, caption) VALUES ($1, $2, $3, $4)',
          [req.params.id, file.originalname, file.filename, caption]
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
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Delete report
app.delete('/api/reports/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get screenshots to delete files
    const screenshotsResult = await client.query(
      'SELECT filepath FROM screenshots WHERE report_id = $1',
      [req.params.id]
    );

    // Delete screenshot files
    screenshotsResult.rows.forEach(screenshot => {
      const filePath = path.join(uploadsDir, screenshot.filepath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

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

app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT project FROM eod_reports WHERE project IS NOT NULL AND project != \'\' ORDER BY project'
    );
    const projects = result.rows.map(row => row.project);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const employeesResult = await pool.query('SELECT COUNT(*) as count FROM employees');
    const reportsResult = await pool.query('SELECT COUNT(*) as count FROM eod_reports');
    const hoursResult = await pool.query('SELECT SUM(hours) as total FROM eod_reports');
    const todayResult = await pool.query('SELECT COUNT(*) as count FROM eod_reports WHERE date = CURRENT_DATE');

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
