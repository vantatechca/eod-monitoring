# Scripts Directory

This directory contains utility scripts for the EOD Monitoring application.

## Available Scripts

### migrate-sqlite-to-postgres.js

Migrates data from SQLite (eod_reports.db) to PostgreSQL database.

**Usage:**
```bash
npm run migrate
```

**What it does:**
- Reads all employees, EOD reports, and screenshots from SQLite
- Inserts them into PostgreSQL database
- Preserves all relationships and data integrity
- Skips records that already exist (safe to re-run)
- Image files in server/uploads remain unchanged

**Prerequisites:**
- DATABASE_URL environment variable must be set
- SQLite database file (eod_reports.db) must exist
- PostgreSQL database must be initialized (tables created)

**See:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions

## Running Scripts

All scripts can be run using npm scripts defined in package.json:

```bash
# Run migration
npm run migrate

# Add more scripts here as needed
```

## Development

When adding new scripts:
1. Create the script file in this directory
2. Add execute permissions: `chmod +x scripts/your-script.js`
3. Add npm script in package.json
4. Document it in this README
5. Create a guide if the script is complex
