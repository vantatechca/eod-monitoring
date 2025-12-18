const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize PostgreSQL database
const initDB = async () => {
  const client = await pool.connect();
  try {
    // Create employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(255) NOT NULL
      )
    `);

    // Create eod_reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS eod_reports (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        hours DECIMAL(10, 2) NOT NULL,
        project VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    // Create screenshots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL,
        filepath VARCHAR(500) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        caption TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES eod_reports(id) ON DELETE CASCADE
      )
    `);

    console.log('PostgreSQL database initialized');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };