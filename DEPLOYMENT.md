# Deployment Guide

This guide covers multiple deployment options for the EOD Employee Monitor application.

## Table of Contents
1. [Heroku Deployment](#heroku-deployment)
2. [Vercel + Railway](#vercel--railway)
3. [DigitalOcean App Platform](#digitalocean-app-platform)
4. [AWS EC2](#aws-ec2)
5. [Render.com](#rendercom)

---

## Heroku Deployment

Heroku is one of the easiest platforms to deploy full-stack Node.js applications.

### Prerequisites
- Heroku account
- Heroku CLI installed
- Git initialized in your project

### Steps

1. **Login to Heroku**
```bash
heroku login
```

2. **Create a new Heroku app**
```bash
heroku create your-eod-monitor-app
```

3. **Add buildpacks**
```bash
heroku buildpacks:add heroku/nodejs
```

4. **Create a Procfile**
Create a file named `Procfile` in the root directory:
```
web: npm start
```

5. **Update package.json scripts**
Make sure your root `package.json` has:
```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "cd client && npm install && npm run build",
    "heroku-postbuild": "npm run build"
  }
}
```

6. **Set environment variables**
```bash
heroku config:set NODE_ENV=production
```

7. **Deploy**
```bash
git add .
git commit -m "Prepare for deployment"
git push heroku main
```

8. **Open your app**
```bash
heroku open
```

### Heroku Database
For persistent storage beyond SQLite, consider upgrading to PostgreSQL:
```bash
heroku addons:create heroku-postgresql:mini
```

---

## Vercel + Railway

Deploy frontend on Vercel and backend on Railway.

### Frontend on Vercel

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy Frontend**
```bash
cd client
vercel --prod
```

3. **Configure**
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

### Backend on Railway

1. **Visit** https://railway.app
2. **New Project** → **Deploy from GitHub**
3. **Select your repository**
4. **Configure**:
   - Root Directory: `/`
   - Start Command: `npm start`
5. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=5000
   ```
6. **Get your Railway URL** and update frontend API URL

7. **Update Frontend .env**
```env
REACT_APP_API_URL=https://your-app.railway.app/api
```

8. **Redeploy frontend** on Vercel with new env var

---

## DigitalOcean App Platform

1. **Go to** https://cloud.digitalocean.com/apps
2. **Create App** → **GitHub**
3. **Select repository**
4. **Configure Components**:

**Backend Component:**
- Type: Web Service
- Source Directory: `/`
- Build Command: `npm install`
- Run Command: `npm start`
- HTTP Port: `5000`

**Frontend Component:**
- Type: Static Site
- Source Directory: `/client`
- Build Command: `npm run build`
- Output Directory: `build`

5. **Environment Variables**:
```
NODE_ENV=production
REACT_APP_API_URL=${backend.PUBLIC_URL}/api
```

6. **Deploy**

---

## AWS EC2

For more control and scalability.

### Steps

1. **Launch EC2 Instance**
   - Ubuntu Server 20.04 LTS
   - t2.micro (free tier)
   - Configure security group (ports 22, 80, 443, 5000, 3000)

2. **Connect to instance**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

4. **Install nginx**
```bash
sudo apt update
sudo apt install nginx
```

5. **Clone your repository**
```bash
git clone your-repo-url
cd eod-monitor
```

6. **Install dependencies**
```bash
npm install
cd client && npm install && npm run build
cd ..
```

7. **Configure nginx**
```bash
sudo nano /etc/nginx/sites-available/eod-monitor
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /home/ubuntu/eod-monitor/client/build;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://localhost:5000;
    }
}
```

8. **Enable site**
```bash
sudo ln -s /etc/nginx/sites-available/eod-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

9. **Start app with PM2**
```bash
export NODE_ENV=production
pm2 start server/index.js --name eod-monitor
pm2 startup
pm2 save
```

10. **Setup SSL (optional but recommended)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Render.com

Render is a modern alternative to Heroku with better free tier.

### Steps

1. **Visit** https://render.com
2. **New** → **Web Service**
3. **Connect repository**
4. **Configure**:
   - Name: eod-monitor
   - Environment: Node
   - Build Command: `npm install && cd client && npm install && npm run build`
   - Start Command: `npm start`
   
5. **Environment Variables**:
```
NODE_ENV=production
```

6. **Advanced Settings**:
   - Auto-Deploy: Yes
   - Health Check Path: `/api/health`

7. **Create Web Service**

8. **Get your URL**: `https://eod-monitor.onrender.com`

---

## Environment Variables for Production

Make sure to set these for any deployment:

```env
NODE_ENV=production
PORT=5000
REACT_APP_API_URL=https://your-domain.com/api
```

---

## Post-Deployment Checklist

- [ ] Test all features (add employee, submit report, upload images)
- [ ] Verify file uploads work
- [ ] Test filtering and exports
- [ ] Check mobile responsiveness
- [ ] Monitor server logs
- [ ] Set up database backups
- [ ] Configure monitoring (e.g., UptimeRobot)
- [ ] Test with different browsers
- [ ] Verify API endpoints work
- [ ] Check CORS settings

---

## Database Considerations

### SQLite (Default)
- ✅ Simple, no setup required
- ✅ Good for small teams (<50 users)
- ❌ Not ideal for high concurrency
- ❌ File-based, harder to backup

### Upgrade to PostgreSQL (Recommended for Production)

1. **Install pg package**
```bash
npm install pg
```

2. **Update server/index.js** to use PostgreSQL instead of SQLite

3. **Use managed database**:
   - Heroku Postgres
   - AWS RDS
   - DigitalOcean Managed Database
   - Supabase (free tier available)

---

## Troubleshooting Deployment

### Build fails
- Check Node.js version compatibility
- Verify all dependencies in package.json
- Check build logs for specific errors

### 502 Bad Gateway
- Server not starting
- Check server logs
- Verify PORT environment variable

### Static files not loading
- Check build output directory
- Verify nginx/proxy configuration
- Check CORS settings

### Database errors
- Verify write permissions for SQLite
- Check database file location
- Ensure database directory exists

### File upload issues
- Check uploads directory permissions
- Verify max file size settings
- Check available disk space

---

## Monitoring & Maintenance

### Recommended tools
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Analytics**: Google Analytics, Plausible
- **Logs**: Logtail, Papertrail

### Regular maintenance
- Monitor disk usage (especially with file uploads)
- Backup database regularly
- Update dependencies monthly
- Review and clean old uploads
- Check security vulnerabilities

---

## Scaling Considerations

As your app grows:

1. **Database**: Migrate from SQLite to PostgreSQL
2. **File Storage**: Use AWS S3 or Cloudinary for uploads
3. **Caching**: Add Redis for session management
4. **CDN**: Use Cloudflare or AWS CloudFront
5. **Load Balancing**: Add multiple server instances
6. **Monitoring**: Implement comprehensive logging

---

## Cost Estimates

### Free Tier Options
- **Render.com**: Free (with limitations)
- **Railway**: $5/month credit
- **Vercel**: Free for frontend
- **Heroku**: Free tier discontinued, starts at $7/month

### Paid Options
- **DigitalOcean**: $5-10/month
- **AWS EC2**: $10-20/month
- **Heroku**: $7-25/month

---

Need help? Check the main README.md or create an issue!
