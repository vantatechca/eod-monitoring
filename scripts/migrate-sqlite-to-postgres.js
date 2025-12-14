#!/usr/bin/env node

/**
 * Migration Script: SQLite to PostgreSQL
 *
 * This script migrates data from the existing SQLite database (eod_reports.db)
 * to PostgreSQL. It preserves all data including employee records, EOD reports,
 * and screenshot references.
 *
 * The images in server/uploads will remain in place - only database references
 * are migrated.
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.js
 *
 * Prerequisites:
 *   - DATABASE_URL environment variable set (PostgreSQL connection string)
 *   - eod_reports.db file exists in the root directory
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Database connections
const sqliteDbPath = path.join(__dirname, '..', 'eod_reports.db');
const sqliteDb = new sqlite3.Database(sqliteDbPath);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Promisify SQLite queries
function sqliteAll(query, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrateEmployees() {
  console.log('\n📋 Migrating employees...');

  try {
    const employees = await sqliteAll('SELECT * FROM employees ORDER BY id');
    console.log(`   Found ${employees.length} employees in SQLite`);

    if (employees.length === 0) {
      console.log('   ✓ No employees to migrate');
      return;
    }

    const client = await pgPool.connect();
    try {
      let migrated = 0;

      for (const emp of employees) {
        // Check if employee already exists by email
        const existing = await client.query(
          'SELECT id FROM employees WHERE email = $1',
          [emp.email]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⊘ Skipping employee "${emp.name}" (${emp.email}) - already exists`);
          continue;
        }

        await client.query(
          `INSERT INTO employees (id, name, email, role, hourly_rate, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [emp.id, emp.name, emp.email, emp.role, emp.hourly_rate || 0, emp.created_at]
        );
        migrated++;
      }

      // Update the sequence to continue from the max ID
      if (employees.length > 0) {
        const maxId = Math.max(...employees.map(e => e.id));
        await client.query(`SELECT setval('employees_id_seq', $1, true)`, [maxId]);
      }

      console.log(`   ✓ Migrated ${migrated} employees`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('   ✗ Error migrating employees:', error.message);
    throw error;
  }
}

async function migrateEodReports() {
  console.log('\n📝 Migrating EOD reports...');

  try {
    const reports = await sqliteAll('SELECT * FROM eod_reports ORDER BY id');
    console.log(`   Found ${reports.length} EOD reports in SQLite`);

    if (reports.length === 0) {
      console.log('   ✓ No EOD reports to migrate');
      return;
    }

    const client = await pgPool.connect();
    try {
      let migrated = 0;

      for (const report of reports) {
        // Check if report already exists
        const existing = await client.query(
          'SELECT id FROM eod_reports WHERE id = $1',
          [report.id]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⊘ Skipping report ID ${report.id} - already exists`);
          continue;
        }

        await client.query(
          `INSERT INTO eod_reports
           (id, employee_id, date, start_time, end_time, break_duration,
            tasks_completed, challenges, plan_tomorrow, project, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            report.id,
            report.employee_id,
            report.date,
            report.start_time,
            report.end_time,
            report.break_duration || 0,
            report.tasks_completed,
            report.challenges,
            report.plan_tomorrow,
            report.project || null,
            report.created_at
          ]
        );
        migrated++;
      }

      // Update the sequence
      if (reports.length > 0) {
        const maxId = Math.max(...reports.map(r => r.id));
        await client.query(`SELECT setval('eod_reports_id_seq', $1, true)`, [maxId]);
      }

      console.log(`   ✓ Migrated ${migrated} EOD reports`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('   ✗ Error migrating EOD reports:', error.message);
    throw error;
  }
}

async function migrateScreenshots() {
  console.log('\n🖼️  Migrating screenshots...');

  try {
    const screenshots = await sqliteAll('SELECT * FROM screenshots ORDER BY id');
    console.log(`   Found ${screenshots.length} screenshots in SQLite`);

    if (screenshots.length === 0) {
      console.log('   ✓ No screenshots to migrate');
      return;
    }

    const client = await pgPool.connect();
    try {
      let migrated = 0;

      for (const screenshot of screenshots) {
        // Check if screenshot already exists
        const existing = await client.query(
          'SELECT id FROM screenshots WHERE id = $1',
          [screenshot.id]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⊘ Skipping screenshot ID ${screenshot.id} - already exists`);
          continue;
        }

        await client.query(
          `INSERT INTO screenshots (id, report_id, filepath, uploaded_at)
           VALUES ($1, $2, $3, $4)`,
          [screenshot.id, screenshot.report_id, screenshot.filepath, screenshot.uploaded_at]
        );
        migrated++;
      }

      // Update the sequence
      if (screenshots.length > 0) {
        const maxId = Math.max(...screenshots.map(s => s.id));
        await client.query(`SELECT setval('screenshots_id_seq', $1, true)`, [maxId]);
      }

      console.log(`   ✓ Migrated ${migrated} screenshots`);
      console.log(`   ℹ️  Image files remain in server/uploads directory`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('   ✗ Error migrating screenshots:', error.message);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  try {
    const client = await pgPool.connect();
    try {
      const employeeCount = await client.query('SELECT COUNT(*) FROM employees');
      const reportCount = await client.query('SELECT COUNT(*) FROM eod_reports');
      const screenshotCount = await client.query('SELECT COUNT(*) FROM screenshots');

      console.log(`   PostgreSQL now contains:`);
      console.log(`   - ${employeeCount.rows[0].count} employees`);
      console.log(`   - ${reportCount.rows[0].count} EOD reports`);
      console.log(`   - ${screenshotCount.rows[0].count} screenshots`);

      // Verify referential integrity
      const orphanedReports = await client.query(`
        SELECT COUNT(*) FROM eod_reports r
        WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = r.employee_id)
      `);

      const orphanedScreenshots = await client.query(`
        SELECT COUNT(*) FROM screenshots s
        WHERE NOT EXISTS (SELECT 1 FROM eod_reports r WHERE r.id = s.report_id)
      `);

      if (orphanedReports.rows[0].count > 0) {
        console.log(`   ⚠️  Warning: ${orphanedReports.rows[0].count} EOD reports reference non-existent employees`);
      }

      if (orphanedScreenshots.rows[0].count > 0) {
        console.log(`   ⚠️  Warning: ${orphanedScreenshots.rows[0].count} screenshots reference non-existent reports`);
      }

      if (orphanedReports.rows[0].count === 0 && orphanedScreenshots.rows[0].count === 0) {
        console.log(`   ✓ All foreign key relationships are valid`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('   ✗ Error during verification:', error.message);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  SQLite → PostgreSQL Migration Tool');
  console.log('═══════════════════════════════════════════════════');

  // Check prerequisites
  if (!process.env.DATABASE_URL) {
    console.error('\n✗ ERROR: DATABASE_URL environment variable is not set');
    console.error('  Please set it in your .env file or environment');
    process.exit(1);
  }

  console.log(`\n📂 SQLite database: ${sqliteDbPath}`);
  console.log(`🐘 PostgreSQL: ${process.env.DATABASE_URL.split('@')[1] || 'configured'}`);

  try {
    // Test PostgreSQL connection
    const client = await pgPool.connect();
    console.log('\n✓ PostgreSQL connection successful');
    client.release();

    // Run migrations in order
    await migrateEmployees();
    await migrateEodReports();
    await migrateScreenshots();

    // Verify
    await verifyMigration();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✓ Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════');
    console.error('✗ Migration failed:', error.message);
    console.error('═══════════════════════════════════════════════════\n');
    process.exit(1);
  } finally {
    // Close connections
    sqliteDb.close();
    await pgPool.end();
  }
}

// Run the migration
main();
