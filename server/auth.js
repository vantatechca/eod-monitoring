const bcrypt = require('bcrypt');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to check if user has specific role
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Middleware to check if user can edit a specific report
const canEditReport = async (req, res, next, pool) => {
  try {
    const reportId = req.params.id;
    const user = req.session.user;

    // Admin can edit everything
    if (user.role === 'admin') {
      return next();
    }

    // Viewers cannot edit
    if (user.role === 'viewer') {
      return res.status(403).json({ error: 'Viewers cannot edit reports' });
    }

    // Employees can only edit their own reports
    const reportResult = await pool.query(
      'SELECT employee_id, created_at FROM eod_reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    // Check if report belongs to this employee
    if (report.employee_id !== user.employee_id) {
      return res.status(403).json({ error: 'You can only edit your own reports' });
    }

    // Check if within 3-day edit window
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    if (new Date(report.created_at) < threeDaysAgo) {
      return res.status(403).json({ error: 'Report is older than 3 days. Only admin can edit.' });
    }

    next();
  } catch (err) {
    console.error('Error checking report edit permission:', err);
    res.status(500).json({ error: 'Error checking permissions' });
  }
};

// Hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Check if viewer access is expired or revoked
const isViewerAccessValid = async (userId, pool) => {
  try {
    const result = await pool.query(`
      SELECT expires_at, revoked_at
      FROM viewer_access
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const access = result.rows[0];

    // Check if revoked
    if (access.revoked_at) {
      return false;
    }

    // Check if expired
    if (new Date(access.expires_at) < new Date()) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error checking viewer access:', err);
    return false;
  }
};

module.exports = {
  requireAuth,
  requireRole,
  canEditReport,
  hashPassword,
  comparePassword,
  isViewerAccessValid
};
