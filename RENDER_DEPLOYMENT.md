# Deploying to Render.com

This guide will help you deploy the EOD Monitoring application to Render.com with PostgreSQL database.

## Prerequisites

1. A GitHub account with this repository
2. A Render.com account (sign up at https://render.com)

## Deployment Steps

### Option 1: Deploy Using render.yaml (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Create a new Blueprint Instance on Render**
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing this code
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to create all services

3. **Set Environment Variables**
   - Once deployed, go to your web service settings
   - Add the `ALLOWED_ORIGINS` environment variable:
     ```
     ALLOWED_ORIGINS=https://your-app-name.onrender.com
     ```

4. **Access Your Application**
   - Your app will be available at: `https://your-service-name.onrender.com`
   - The database is automatically connected via the `DATABASE_URL` environment variable

### Option 2: Manual Deployment

#### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → "New" → "PostgreSQL"
2. Configure:
   - **Name**: `eod-monitoring-db`
   - **Database**: `eod_monitor`
   - **User**: `eod_user` (or leave default)
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
3. Click "Create Database"
4. Copy the **Internal Database URL** (starts with `postgresql://`)

#### Step 2: Create Web Service

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `eod-monitoring`
   - **Region**: Same as database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install && cd client && npm install && npm run build && cd ..
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: Free (or paid for production)

4. **Add Environment Variables**:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Paste the Internal Database URL from Step 1
   - `PORT` = `5000` (Render automatically provides this)
   - `ALLOWED_ORIGINS` = `https://your-service-name.onrender.com`
   - `RATE_LIMIT_WINDOW_MS` = `900000` (optional)
   - `RATE_LIMIT_MAX_REQUESTS` = `100` (optional)

5. Click "Create Web Service"

## Post-Deployment

### Verify Deployment

1. **Check Build Logs**
   - Monitor the build process in Render dashboard
   - Ensure no errors during build

2. **Check Application Logs**
   - Look for "Connected to PostgreSQL database"
   - Look for "Server running on port 5000"

3. **Test the Application**
   - Visit your app URL
   - Try creating an employee
   - Try submitting an EOD report

### Database Initialization

The database tables are created automatically on first run. If you need to manually initialize:

1. Go to your database on Render
2. Click "Shell" to access psql
3. Run:
   ```sql
   \dt
   ```
   You should see `employees`, `eod_reports`, and `screenshots` tables

## Updating Your Deployment

### Automatic Deploys

Render automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Update application"
git push origin main
```

### Manual Deploy

From Render dashboard:
1. Go to your web service
2. Click "Manual Deploy" → "Deploy latest commit"

## Important Configuration

### File Uploads

File uploads work on Render's free tier but are stored in ephemeral storage:
- Files are lost when the service restarts
- For production, consider using:
  - AWS S3
  - Cloudinary
  - Render Disk (paid feature)

### Database Backups

Free PostgreSQL on Render:
- **Retention**: 7 days
- **Frequency**: Daily automatic backups
- Access backups from database dashboard

For production:
- Upgrade to paid plan for:
  - Longer retention
  - Point-in-time recovery
  - Multiple backups per day

### Environment Variables

Always set via Render dashboard, never commit to Git:
- `DATABASE_URL` - Auto-populated by Render
- `ALLOWED_ORIGINS` - Your frontend URL
- Add any API keys or secrets here

## Monitoring

### View Logs

From Render dashboard:
1. Select your web service
2. Click "Logs" tab
3. Filter by timeframe or search

### Metrics

Available in Render dashboard:
- CPU usage
- Memory usage
- Request count
- Response times

## Troubleshooting

### Build Failures

**Problem**: Build fails with "Module not found"
**Solution**: Ensure all dependencies are in `package.json`, run `npm install` locally first

**Problem**: Build timeout
**Solution**: Optimize build process or upgrade to paid plan

### Runtime Errors

**Problem**: "Database connection failed"
**Solution**:
- Check `DATABASE_URL` is set correctly
- Verify database is running
- Check database region matches web service

**Problem**: "Cannot find module 'pg'"
**Solution**: Ensure `pg` is in dependencies, not devDependencies

### CORS Errors

**Problem**: CORS errors in browser console
**Solution**:
- Set `ALLOWED_ORIGINS` to your Render URL
- Format: `https://your-app-name.onrender.com` (no trailing slash)

## Costs

### Free Tier Limitations

**Web Service (Free)**:
- 750 hours/month shared across services
- Spins down after 15 minutes of inactivity
- 512 MB RAM
- Shared CPU

**PostgreSQL (Free)**:
- 1 GB storage
- 90 days data retention
- Expires after 90 days

### Upgrading to Paid

For production use, consider:
- **Web Service**: $7/month (always-on, more resources)
- **PostgreSQL**: $7/month (10 GB storage, no expiration)
- **Disk Storage**: $0.25/GB/month for persistent file uploads

## Security Checklist

Before going to production:

- [ ] Set `ALLOWED_ORIGINS` to specific domains
- [ ] Use strong database password (auto-generated by Render)
- [ ] Enable Render's automatic HTTPS (enabled by default)
- [ ] Review rate limiting settings
- [ ] Set up monitoring and alerts
- [ ] Configure database backups
- [ ] Add authentication to your app
- [ ] Review and limit database permissions

## Support

- **Render Documentation**: https://render.com/docs
- **Render Community**: https://community.render.com
- **App Issues**: Create an issue in your GitHub repository

## Advanced: Custom Domain

1. Go to your web service settings
2. Click "Custom Domains"
3. Add your domain (e.g., `app.yourdomain.com`)
4. Update DNS records as instructed by Render
5. Update `ALLOWED_ORIGINS` to include your custom domain

## Migration from SQLite

If you have existing SQLite data to migrate:

1. Export data from SQLite:
   ```bash
   sqlite3 eod_reports.db .dump > backup.sql
   ```

2. Convert to PostgreSQL format (may need manual adjustments)

3. Import to Render PostgreSQL via Shell

Note: This migration is complex. Start fresh on Render is recommended.
