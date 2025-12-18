const cloudinary = require('cloudinary').v2;
const { pool } = require('./db');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function migrateImagesToCloudinary() {
  console.log('🚀 Starting migration to Cloudinary...\n');

  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

  try {
    // Get all screenshots from database
    const result = await pool.query('SELECT * FROM screenshots ORDER BY id');
    const screenshots = result.rows;

    console.log(`📊 Found ${screenshots.length} screenshots to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const screenshot of screenshots) {
      // Skip if already a Cloudinary URL
      if (screenshot.filepath.startsWith('http://') || screenshot.filepath.startsWith('https://')) {
        console.log(`⏭️  Skipping #${screenshot.id}: Already on Cloudinary`);
        skipped++;
        continue;
      }

      const localPath = path.join(uploadsDir, screenshot.filepath);

      // Check if file exists locally
      if (!fs.existsSync(localPath)) {
        console.log(`❌ Missing file #${screenshot.id}: ${screenshot.filepath}`);
        errors++;
        continue;
      }

      try {
        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(localPath, {
          folder: 'eod-monitoring',
          public_id: screenshot.filepath.split('.')[0], // Use original filename without extension
          resource_type: 'image'
        });

        // Update database with Cloudinary URL
        await pool.query(
          'UPDATE screenshots SET filepath = $1 WHERE id = $2',
          [uploadResult.secure_url, screenshot.id]
        );

        console.log(`✅ Migrated #${screenshot.id}: ${screenshot.filename} -> ${uploadResult.secure_url}`);
        migrated++;

        // Optional: Delete local file after successful upload
        // Uncomment the next line if you want to remove local files after migration
        // fs.unlinkSync(localPath);

      } catch (err) {
        console.error(`❌ Error migrating #${screenshot.id}:`, err.message);
        errors++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${screenshots.length}`);

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateImagesToCloudinary()
  .then(() => {
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
  });
