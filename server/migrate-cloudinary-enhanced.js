const cloudinary = require('cloudinary').v2;
const { pool } = require('./db');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_LOCAL = process.argv.includes('--delete-local');
const SKIP_MISSING = process.argv.includes('--skip-missing');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Verify Cloudinary configuration
function verifyCloudinaryConfig() {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    console.error('❌ Cloudinary credentials not configured!');
    console.error('   Please set these environment variables:');
    console.error('   - CLOUDINARY_CLOUD_NAME');
    console.error('   - CLOUDINARY_API_KEY');
    console.error('   - CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  console.log(`✅ Cloudinary configured: ${cloud_name}\n`);
}

async function migrateImagesToCloudinary() {
  console.log('🚀 Starting Cloudinary Migration\n');
  console.log('Mode:', DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✍️  LIVE MODE');
  console.log('Delete local files:', DELETE_LOCAL ? 'YES' : 'NO');
  console.log('Skip missing files:', SKIP_MISSING ? 'YES' : 'NO (fail on error)');
  console.log('─'.repeat(60) + '\n');

  verifyCloudinaryConfig();

  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
  console.log(`📁 Local uploads directory: ${uploadsDir}\n`);

  try {
    // Get all screenshots from database
    const result = await pool.query('SELECT * FROM screenshots ORDER BY id');
    const screenshots = result.rows;

    if (screenshots.length === 0) {
      console.log('ℹ️  No screenshots found in database');
      return;
    }

    console.log(`📊 Found ${screenshots.length} screenshot(s) in database\n`);

    // Categorize screenshots
    const cloudinaryUrls = screenshots.filter(s =>
      s.filepath.startsWith('http://') || s.filepath.startsWith('https://')
    );
    const localPaths = screenshots.filter(s =>
      !(s.filepath.startsWith('http://') || s.filepath.startsWith('https://'))
    );

    console.log(`   Already on Cloudinary: ${cloudinaryUrls.length}`);
    console.log(`   Local files to migrate: ${localPaths.length}\n`);

    if (localPaths.length === 0) {
      console.log('✨ All screenshots are already on Cloudinary!');
      return;
    }

    // Migration stats
    let migrated = 0;
    let skipped = 0;
    let missing = 0;
    let failed = 0;

    console.log('Starting migration...\n');

    for (let i = 0; i < localPaths.length; i++) {
      const screenshot = localPaths[i];
      const progress = `[${i + 1}/${localPaths.length}]`;
      const localPath = path.join(uploadsDir, screenshot.filepath);

      // Check if file exists
      if (!fs.existsSync(localPath)) {
        console.log(`${progress} ⚠️  Missing file #${screenshot.id}: ${screenshot.filepath}`);
        missing++;

        if (!SKIP_MISSING && !DRY_RUN) {
          throw new Error(`File not found: ${localPath}`);
        }
        continue;
      }

      try {
        if (DRY_RUN) {
          // Just check what would be migrated
          console.log(`${progress} 🔍 Would migrate #${screenshot.id}: ${screenshot.filename}`);
          console.log(`          Local: ${localPath}`);
          console.log(`          Size: ${(fs.statSync(localPath).size / 1024).toFixed(2)} KB`);
          migrated++;
        } else {
          // Actually upload to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(localPath, {
            folder: 'eod-monitoring',
            public_id: screenshot.filepath.split('.')[0],
            resource_type: 'image',
            overwrite: false
          });

          // Update database with Cloudinary URL
          await pool.query(
            'UPDATE screenshots SET filepath = $1 WHERE id = $2',
            [uploadResult.secure_url, screenshot.id]
          );

          console.log(`${progress} ✅ Migrated #${screenshot.id}: ${screenshot.filename}`);
          console.log(`          ${uploadResult.secure_url}`);
          migrated++;

          // Delete local file if requested
          if (DELETE_LOCAL) {
            fs.unlinkSync(localPath);
            console.log(`          🗑️  Deleted local file`);
          }
        }
      } catch (err) {
        console.error(`${progress} ❌ Failed #${screenshot.id}: ${err.message}`);
        failed++;

        if (!SKIP_MISSING) {
          throw err;
        }
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📈 Migration Summary');
    console.log('═'.repeat(60));
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ⏭️  Already on Cloudinary: ${cloudinaryUrls.length}`);
    console.log(`   ⚠️  Missing files: ${missing}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total screenshots: ${screenshots.length}`);
    console.log('═'.repeat(60) + '\n');

    if (DRY_RUN) {
      console.log('ℹ️  This was a DRY RUN. No changes were made.');
      console.log('ℹ️  Run without --dry-run to perform actual migration.\n');
    } else {
      console.log('✨ Migration completed!\n');
    }

  } catch (err) {
    console.error('\n💥 Migration failed:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  } finally {
    await pool.end();
  }
}

// Display help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Cloudinary Migration Script
============================

Usage:
  node server/migrate-cloudinary-enhanced.js [options]

Options:
  --dry-run         Preview what will be migrated (no changes)
  --skip-missing    Continue if files are missing (don't fail)
  --delete-local    Delete local files after successful upload
  --help, -h        Show this help message

Examples:
  # Preview migration
  node server/migrate-cloudinary-enhanced.js --dry-run

  # Migrate and keep local files
  node server/migrate-cloudinary-enhanced.js --skip-missing

  # Migrate and delete local files
  node server/migrate-cloudinary-enhanced.js --skip-missing --delete-local

Environment Variables Required:
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  DATABASE_URL
  `);
  process.exit(0);
}

// Run migration
migrateImagesToCloudinary()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Error:', err.message);
    process.exit(1);
  });
