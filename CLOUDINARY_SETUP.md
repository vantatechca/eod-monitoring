# Cloudinary Image Upload Setup Guide

This guide will help you set up Cloudinary for image uploads in your EOD Monitoring application deployed on Render.com.

## What is Cloudinary?

Cloudinary is a cloud-based image and video management service that:
- Stores images reliably with no data loss
- Automatically optimizes images for web
- Provides fast CDN delivery
- Offers 25GB storage and 25GB bandwidth/month on free tier

## Step 1: Create a Cloudinary Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account
3. After signup, you'll be redirected to your Dashboard
4. Copy the following credentials (you'll need them):
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Step 2: Add Environment Variables to Render

1. Go to your Render Dashboard: https://dashboard.render.com
2. Click on your **eod-monitoring** service
3. Click on the **"Environment"** tab in the left sidebar
4. Click **"Add Environment Variable"** for each of the following:

| Key | Value | Example |
|-----|-------|---------|
| `CLOUDINARY_CLOUD_NAME` | Your cloud name from Cloudinary | `my-cloud-name` |
| `CLOUDINARY_API_KEY` | Your API key from Cloudinary | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Your API secret from Cloudinary | `abcdefghijklmnopqrstuvwxyz` |

5. Click **"Save Changes"**
6. Render will automatically redeploy your application

## Step 3: Verify Setup

After deployment completes:

1. Check the Render logs for: `☁️  Cloudinary configured for image uploads`
2. Try uploading a new image through your application
3. Check your Cloudinary Media Library to confirm the image appears there

## Step 4: Migrate Existing Images (Optional)

If you have existing images stored locally that you want to migrate to Cloudinary:

### Option A: Run Migration Script Locally

```bash
# Make sure you have .env file with Cloudinary credentials
node server/migrate-to-cloudinary.js
```

### Option B: Run Migration on Render

1. Go to your Render Dashboard
2. Click on your service
3. Go to the "Shell" tab
4. Run:
```bash
node server/migrate-to-cloudinary.js
```

**Note:** The migration script will:
- Upload all existing images to Cloudinary
- Update database records with Cloudinary URLs
- Keep local files intact (you can delete them manually after verifying)

## How It Works

### Upload Flow

1. User selects an image in the frontend
2. Frontend sends the image via multipart/form-data
3. Server receives the image through multer middleware
4. multer-storage-cloudinary automatically uploads to Cloudinary
5. Server stores the Cloudinary URL in PostgreSQL
6. Frontend displays the image using the Cloudinary URL

### Database Schema

Images are stored in the `screenshots` table:

```sql
CREATE TABLE screenshots (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES eod_reports(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,           -- Original filename
  filepath TEXT NOT NULL,            -- Cloudinary URL (e.g., https://res.cloudinary.com/...)
  caption TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Code Implementation

**Server-side (`server/index.js`):**
```javascript
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eod-monitoring',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
  }
});

const upload = multer({ storage: storage });
```

**API Endpoints:**

- `POST /api/reports` - Upload report with screenshots
- `PUT /api/reports/:id` - Update report and add/delete screenshots
- `DELETE /api/reports/:id` - Delete report and associated images

**Frontend (`client/src/App.js`):**
```javascript
const getImageURL = (filepath) => {
  // If filepath is a Cloudinary URL, return as-is
  if (filepath && (filepath.startsWith('http://') || filepath.startsWith('https://'))) {
    return filepath;
  }
  // Otherwise, construct local URL (backwards compatibility)
  const baseURL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
  return `${baseURL}/uploads/${filepath}`;
};

// Usage in JSX
<img src={getImageURL(screenshot.filepath)} alt={screenshot.filename} />
```

## Troubleshooting

### Images not uploading

1. Check Render logs for errors
2. Verify environment variables are set correctly
3. Ensure Cloudinary credentials are valid
4. Check Cloudinary dashboard for failed uploads

### Old images not showing

This is expected if:
- Images were uploaded before Cloudinary setup
- Images are stored locally on ephemeral storage
- Solution: Run the migration script to move them to Cloudinary

### Mixed content errors (HTTP/HTTPS)

Cloudinary serves images over HTTPS by default. If you see mixed content warnings:
- Cloudinary URLs should already use `https://`
- Check that `file.path` in the server contains the secure_url

## API Endpoints Reference

### Upload Images with Report

```javascript
POST /api/reports
Content-Type: multipart/form-data

Body:
- employee_id: number
- date: string (YYYY-MM-DD)
- hours: number
- project: string
- description: string
- screenshots: File[] (max 10 files, 10MB each)
- captions: string (JSON array of captions)

Response:
{
  id: number,
  employee_id: number,
  date: string,
  hours: number,
  project: string,
  description: string,
  created_at: timestamp,
  screenshots: [{
    id: number,
    report_id: number,
    filename: string,
    filepath: string (Cloudinary URL),
    caption: string,
    uploaded_at: timestamp
  }]
}
```

### Delete Images

When a report or screenshot is deleted:
1. Server extracts public_id from Cloudinary URL
2. Calls `cloudinary.uploader.destroy(public_id)`
3. Deletes database record
4. Returns success response

## Benefits of Cloudinary

✅ **Persistent Storage** - Images never disappear (unlike Render's ephemeral storage)
✅ **Automatic Optimization** - Images are compressed and optimized automatically
✅ **Fast CDN Delivery** - Images load quickly from global CDN
✅ **Free Tier** - 25GB storage + 25GB bandwidth/month
✅ **Transformations** - Resize, crop, format conversion on-the-fly
✅ **No Server Load** - Images served directly from Cloudinary, not your server

## Cost Considerations

**Free Tier Limits:**
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month

**When you might exceed:**
- If you upload 5MB images and store 5,000+ images (unlikely for typical use)
- If you have 5,000+ page views per day (each viewing multiple images)

**Solution if exceeded:**
- Upgrade to paid plan (starts at $89/month for 87GB storage)
- Or optimize images before upload (reduce file size)
- Or implement pagination/lazy loading to reduce bandwidth

## Security Notes

- ⚠️ **Never commit** `.env` file with real credentials
- ⚠️ **Use environment variables** for all sensitive data
- ⚠️ **Validate file types** on both frontend and backend
- ⚠️ **Limit file sizes** to prevent abuse (currently 10MB max)
- ⚠️ **Use signed uploads** for additional security (optional, advanced)

## Support

For issues:
1. Check Render deployment logs
2. Check Cloudinary Media Library
3. Verify environment variables are set
4. Check browser console for frontend errors

For Cloudinary-specific help:
- Documentation: https://cloudinary.com/documentation
- Support: https://support.cloudinary.com
