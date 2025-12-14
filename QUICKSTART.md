# 🚀 Quick Start Guide

Get your EOD Monitor up and running in 5 minutes!

## Prerequisites Check
- [ ] Node.js installed (v14+)
- [ ] npm installed
- [ ] Terminal/Command Prompt access

## Installation (Copy-Paste Method)

### Step 1: Install Dependencies

Open terminal in the project root and run:

```bash
# Install server dependencies
npm install

# Install client dependencies  
cd client && npm install && cd ..
```

### Step 2: Start the Application

**Option A: Development Mode (Recommended for testing)**

Open TWO terminal windows:

Terminal 1 (Backend):
```bash
npm run dev
```
*Server runs on http://localhost:5000*

Terminal 2 (Frontend):
```bash
npm run client
```
*Client runs on http://localhost:3000*

**Option B: Production Mode**
```bash
# Build frontend
npm run build

# Start server
NODE_ENV=production npm start
```
*Full app runs on http://localhost:5000*

### Step 3: Open in Browser

Navigate to:
- Development: http://localhost:3000
- Production: http://localhost:5000

## First Steps in the App

1. **Add an Employee**
   - Click "Employees" tab
   - Click "Add Employee"
   - Fill: John Doe, john@example.com, Developer
   - Submit

2. **Submit First Report**
   - Click "New Report"
   - Select employee
   - Enter hours: 8
   - Add description (optional)
   - Upload screenshots (optional)
   - Submit

3. **Explore Features**
   - View dashboard stats
   - Filter reports by date/employee
   - Export to CSV
   - View report details

## Troubleshooting

### "Port already in use"
```bash
# Kill process on port 5000
# Mac/Linux:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules client/node_modules
npm install
cd client && npm install
```

### "ECONNREFUSED" error
- Make sure backend is running first (npm run dev)
- Check if port 5000 is accessible
- Restart both frontend and backend

## What's Next?

- Read full README.md for detailed documentation
- Check DEPLOYMENT.md for production deployment
- Start tracking your team's work!

## Need Help?

Common issues and solutions in README.md's Troubleshooting section.

---

Happy monitoring! 🎉
