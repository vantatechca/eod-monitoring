# SQLite to PostgreSQL Migration Guide

This guide explains how to migrate your existing SQLite database data to PostgreSQL.

## Prerequisites

1. **Backup your data first!**
   ```bash
   cp eod_reports.db eod_reports.db.backup
   cp -r server/uploads server/uploads.backup
   ```

2. **Install dependencies** (includes sqlite3 for the migration):
   ```bash
   npm install
   ```

3. **Set up PostgreSQL connection**

   Make sure your `.env` file has the `DATABASE_URL` variable set:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/eod_monitor
   ```

   For Render.com, this is automatically set by the platform.

## Migration Steps

### Local Development Migration

1. **Ensure PostgreSQL is running**
   ```bash
   # If using Docker:
   docker-compose up -d postgres

   # Or if PostgreSQL is installed locally, start the service
   ```

2. **Initialize the PostgreSQL database** (creates tables)
   ```bash
   npm start
   # Stop it after you see "Connected to PostgreSQL database"
   # Press Ctrl+C
   ```

3. **Run the migration**
   ```bash
   npm run migrate
   ```

   You should see output like:
   ```
   ═══════════════════════════════════════════════════
     SQLite → PostgreSQL Migration Tool
   ═══════════════════════════════════════════════════

   📂 SQLite database: /path/to/eod_reports.db
   🐘 PostgreSQL: localhost:5432/eod_monitor

   ✓ PostgreSQL connection successful

   📋 Migrating employees...
      Found 5 employees in SQLite
      ✓ Migrated 5 employees

   📝 Migrating EOD reports...
      Found 23 EOD reports in SQLite
      ✓ Migrated 23 EOD reports

   🖼️  Migrating screenshots...
      Found 15 screenshots in SQLite
      ✓ Migrated 15 screenshots
      ℹ️  Image files remain in server/uploads directory

   🔍 Verifying migration...
      PostgreSQL now contains:
      - 5 employees
      - 23 EOD reports
      - 15 screenshots
      ✓ All foreign key relationships are valid

   ═══════════════════════════════════════════════════
   ✓ Migration completed successfully!
   ═══════════════════════════════════════════════════
   ```

4. **Verify the migration**
   ```bash
   npm start
   ```

   Open your browser and check that all your employees, reports, and images are accessible.

### Production Migration (Render.com)

#### Option 1: Migrate Locally, Then Deploy (Recommended)

1. **Get your Render PostgreSQL connection string**
   - Go to Render Dashboard → Your Database
   - Copy the "External Database URL"

2. **Set it in your local environment** (temporarily)
   ```bash
   export DATABASE_URL="postgresql://user:pass@host.render.com/dbname"
   ```

3. **Run the migration to Render's database**
   ```bash
   npm run migrate
   ```

4. **Upload images to Render**

   Since Render uses ephemeral storage, you have two options:

   **Option A: Accept that uploads will be lost on restart** (Free tier)
   - Just deploy normally
   - Re-upload important images after each restart

   **Option B: Use persistent storage** (Recommended for production)
   - Add Render Disk in your `render.yaml`:
     ```yaml
     services:
       - type: web
         disk:
           name: uploads
           mountPath: /app/server/uploads
           sizeGB: 1
     ```
   - Upload your images via SFTP or through the application

#### Option 2: Manual Database Import

If the migration script doesn't work for your production setup:

1. **Export data from SQLite**
   ```bash
   sqlite3 eod_reports.db .dump > backup.sql
   ```

2. **Convert to PostgreSQL format**
   - Edit `backup.sql` to match PostgreSQL syntax
   - Change `INTEGER PRIMARY KEY` to `SERIAL PRIMARY KEY`
   - Remove SQLite-specific commands

3. **Import to Render PostgreSQL**
   - Go to Render Dashboard → Your Database → Shell
   - Paste your converted SQL commands

## What Gets Migrated

✅ **Migrated:**
- All employee records (id, name, email, role, hourly_rate, created_at)
- All EOD reports (id, employee_id, date, times, tasks, challenges, project, etc.)
- All screenshot references (id, report_id, filepath, uploaded_at)

📁 **Not Changed:**
- Image files in `server/uploads/` remain exactly where they are
- Only the database references are copied to PostgreSQL

## Re-running the Migration

The migration script is **safe to re-run**. It will:
- Skip records that already exist in PostgreSQL
- Only insert new records
- Show you what was skipped vs. what was migrated

```bash
npm run migrate
```

## Troubleshooting

### Error: "DATABASE_URL is not set"

**Solution:** Check your `.env` file:
```bash
cat .env
```

Make sure it contains:
```env
DATABASE_URL=postgresql://...
```

### Error: "Cannot find module 'sqlite3'"

**Solution:** Install dependencies:
```bash
npm install
```

### Error: "ENOENT: no such file or directory, open 'eod_reports.db'"

**Solution:** Make sure your SQLite database file exists:
```bash
ls -la eod_reports.db
```

If it's in a different location, update the path in `scripts/migrate-sqlite-to-postgres.js`:
```javascript
const sqliteDbPath = path.join(__dirname, '..', 'path', 'to', 'eod_reports.db');
```

### Warning: "X EOD reports reference non-existent employees"

This means some reports in SQLite reference employee IDs that don't exist in the employees table.

**Solution:** Either:
1. Clean up the data before migration
2. Manually create the missing employees
3. Delete the orphaned reports

### Images not showing after migration

**Issue:** Image references are correct, but files are missing.

**Solution:**
1. Check that files exist in `server/uploads/`:
   ```bash
   ls -la server/uploads/
   ```

2. If deploying to Render, remember that free tier has ephemeral storage
   - Consider using Render Disk (paid)
   - Or use cloud storage (AWS S3, Cloudinary)

## Post-Migration Cleanup

After successful migration, you can:

1. **Keep the SQLite database as backup**
   ```bash
   mv eod_reports.db eod_reports.db.backup
   ```

2. **Remove sqlite3 dev dependency** (optional)
   ```bash
   npm uninstall sqlite3 --save-dev
   ```

3. **Update your deployment** to ensure it uses PostgreSQL

## Need Help?

If you encounter issues:
1. Check the error messages carefully
2. Verify your DATABASE_URL is correct
3. Ensure PostgreSQL is running and accessible
4. Check that SQLite database file exists and is readable
5. Review the migration script logs for specific errors
