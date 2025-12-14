const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (uploaded images)
app.use('/uploads', express.static(uploadsDir));

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

// Initialize SQLite Database
const db = new sqlite3.Database('./eod_reports.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Employees table
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // EOD Reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS eod_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      hours REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees (id)
    )
  `);

  // Screenshots table
  db.run(`
    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES eod_reports (id) ON DELETE CASCADE
    )
  `);
}

// ============ EMPLOYEE ROUTES ============

// Get all employees
app.get('/api/employees', (req, res) => {
  db.all('SELECT * FROM employees ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single employee
app.get('/api/employees/:id', (req, res) => {
  db.get('SELECT * FROM employees WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(row);
  });
});

// Create new employee
app.post('/api/employees', (req, res) => {
  const { name, email, role } = req.body;
  
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  db.run(
    'INSERT INTO employees (name, email, role) VALUES (?, ?, ?)',
    [name, email, role],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name, email, role });
    }
  );
});

// Update employee
app.put('/api/employees/:id', (req, res) => {
  const { name, email, role } = req.body;
  
  db.run(
    'UPDATE employees SET name = ?, email = ?, role = ? WHERE id = ?',
    [name, email, role, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ id: req.params.id, name, email, role });
    }
  );
});

// Delete employee
app.delete('/api/employees/:id', (req, res) => {
  db.run('DELETE FROM employees WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  });
});

// ============ EOD REPORT ROUTES ============

// Get all reports with filters
app.get('/api/reports', (req, res) => {
  const { employee_id, start_date, end_date } = req.query;
  
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
  
  if (employee_id) {
    query += ' AND r.employee_id = ?';
    params.push(employee_id);
  }
  
  if (start_date) {
    query += ' AND r.date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND r.date <= ?';
    params.push(end_date);
  }
  
  query += ' ORDER BY r.date DESC, r.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get screenshots for each report
    const reportIds = rows.map(r => r.id);
    if (reportIds.length === 0) {
      return res.json([]);
    }
    
    const placeholders = reportIds.map(() => '?').join(',');
    db.all(
      `SELECT * FROM screenshots WHERE report_id IN (${placeholders})`,
      reportIds,
      (err, screenshots) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Attach screenshots to reports
        const reportsWithScreenshots = rows.map(report => ({
          ...report,
          screenshots: screenshots.filter(s => s.report_id === report.id)
        }));
        
        res.json(reportsWithScreenshots);
      }
    );
  });
});

// Get single report
app.get('/api/reports/:id', (req, res) => {
  db.get(
    `SELECT 
      r.*,
      e.name as employee_name,
      e.email as employee_email,
      e.role as employee_role
    FROM eod_reports r
    JOIN employees e ON r.employee_id = e.id
    WHERE r.id = ?`,
    [req.params.id],
    (err, report) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }
      
      // Get screenshots
      db.all(
        'SELECT * FROM screenshots WHERE report_id = ?',
        [req.params.id],
        (err, screenshots) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ ...report, screenshots });
        }
      );
    }
  );
});

// Create new EOD report with screenshots
app.post('/api/reports', upload.array('screenshots', 10), (req, res) => {
  const { employee_id, date, hours, description } = req.body;
  
  if (!employee_id || !date || !hours) {
    return res.status(400).json({ error: 'Employee ID, date, and hours are required' });
  }

  db.run(
    'INSERT INTO eod_reports (employee_id, date, hours, description) VALUES (?, ?, ?, ?)',
    [employee_id, date, hours, description || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const reportId = this.lastID;
      
      // Insert screenshots if any
      if (req.files && req.files.length > 0) {
        const screenshotInserts = req.files.map(file => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO screenshots (report_id, filename, filepath) VALUES (?, ?, ?)',
              [reportId, file.originalname, file.filename],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        
        Promise.all(screenshotInserts)
          .then(() => {
            res.status(201).json({ 
              id: reportId, 
              employee_id, 
              date, 
              hours, 
              description,
              screenshots: req.files.length 
            });
          })
          .catch(err => {
            res.status(500).json({ error: 'Error saving screenshots: ' + err.message });
          });
      } else {
        res.status(201).json({ 
          id: reportId, 
          employee_id, 
          date, 
          hours, 
          description,
          screenshots: 0 
        });
      }
    }
  );
});

// Update report
app.put('/api/reports/:id', (req, res) => {
  const { employee_id, date, hours, description } = req.body;
  
  db.run(
    'UPDATE eod_reports SET employee_id = ?, date = ?, hours = ?, description = ? WHERE id = ?',
    [employee_id, date, hours, description, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }
      res.json({ id: req.params.id, employee_id, date, hours, description });
    }
  );
});

// Delete report
app.delete('/api/reports/:id', (req, res) => {
  // First get screenshots to delete files
  db.all('SELECT filepath FROM screenshots WHERE report_id = ?', [req.params.id], (err, screenshots) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Delete screenshot files
    screenshots.forEach(screenshot => {
      const filePath = path.join(uploadsDir, screenshot.filepath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    // Delete report (screenshots will be deleted via CASCADE)
    db.run('DELETE FROM eod_reports WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }
      res.json({ message: 'Report deleted successfully' });
    });
  });
});

// ============ STATISTICS ROUTES ============

app.get('/api/stats', (req, res) => {
  const queries = {
    totalEmployees: 'SELECT COUNT(*) as count FROM employees',
    totalReports: 'SELECT COUNT(*) as count FROM eod_reports',
    totalHours: 'SELECT SUM(hours) as total FROM eod_reports',
    reportsToday: `SELECT COUNT(*) as count FROM eod_reports WHERE date = date('now')`,
  };

  const stats = {};
  let completed = 0;

  Object.keys(queries).forEach(key => {
    db.get(queries[key], [], (err, row) => {
      if (!err) {
        stats[key] = row.count || row.total || 0;
      }
      completed++;
      
      if (completed === Object.keys(queries).length) {
        res.json(stats);
      }
    });
  });
});

// ============ EXPORT ROUTES ============

app.get('/api/reports/export/csv', (req, res) => {
  const { employee_id, start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      r.date,
      e.name as employee_name,
      e.email as employee_email,
      e.role as employee_role,
      r.hours,
      r.description
    FROM eod_reports r
    JOIN employees e ON r.employee_id = e.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (employee_id) {
    query += ' AND r.employee_id = ?';
    params.push(employee_id);
  }
  
  if (start_date) {
    query += ' AND r.date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND r.date <= ?';
    params.push(end_date);
  }
  
  query += ' ORDER BY r.date DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Create CSV
    let csv = 'Date,Employee Name,Email,Role,Hours,Description\n';
    rows.forEach(row => {
      csv += `"${row.date}","${row.employee_name}","${row.employee_email}","${row.employee_role}",${row.hours},"${row.description || ''}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=eod_reports.csv');
    res.send(csv);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
