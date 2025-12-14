# EOD Employee Monitor

A comprehensive full-stack employee monitoring system for tracking End-of-Day (EOD) reports, hours worked, and activity screenshots.

## Features

✅ **Employee Management**
- Add, view, and delete employees
- Assign roles to team members
- Track employee information

✅ **EOD Report Tracking**
- Submit daily reports with hours worked
- Upload activity screenshots (multiple images per report)
- Add detailed descriptions of work done
- View all reports with detailed information

✅ **Advanced Filtering**
- Filter by employee
- Filter by date range (start and end dates)
- Real-time filtering updates

✅ **Data Export**
- Export reports to CSV format
- Filtered exports (only export what you see)

✅ **Dashboard Analytics**
- Total employees count
- Total reports submitted
- Total hours tracked
- Today's report count

✅ **Modern UI**
- Responsive design (works on all devices)
- Dark theme with professional aesthetics
- Smooth animations and transitions
- Intuitive user interface

## Tech Stack

### Frontend
- **React** 18.2 - UI library
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **CSS3** - Styling with custom animations

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **SQLite3** - Database
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**
```bash
cd eod-monitor
```

2. **Install dependencies**
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

4. **Start the application**

**Development Mode (Recommended for testing):**

Open two terminal windows:

Terminal 1 - Start Backend:
```bash
npm run dev
```

Terminal 2 - Start Frontend:
```bash
npm run client
```

The backend will run on `http://localhost:5000`
The frontend will run on `http://localhost:3000`

**Production Mode:**
```bash
# Build the frontend
npm run build

# Set NODE_ENV to production
export NODE_ENV=production  # For Mac/Linux
set NODE_ENV=production     # For Windows

# Start the server
npm start
```

The app will run on `http://localhost:5000`

## Usage Guide

### 1. Add Employees
- Click on the "Employees" tab
- Click "Add Employee" button
- Fill in Name, Email, and Role
- Click "Add Employee" to save

### 2. Submit EOD Reports
- Go to Dashboard or Reports tab
- Click "New Report" button
- Select the employee from dropdown
- Choose the date
- Enter hours worked (can use decimals like 8.5)
- Add a description of work done
- Upload screenshots (optional, multiple files allowed)
- Click "Submit Report"

### 3. View and Filter Reports
- Navigate to "Reports" tab
- Use filters:
  - Select specific employee
  - Set start date
  - Set end date
- Click "Clear Filters" to reset
- Click on the eye icon to view full report details
- Click screenshots to view in full size

### 4. Export Reports
- Apply any filters you want (optional)
- Click "Export CSV" button
- CSV file will download with filtered data

### 5. Delete Records
- Use the trash icon on any card to delete
- Confirm deletion in the dialog
- Note: Deleting employees won't delete their reports

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get single employee
- `GET /api/employees/:id/last-report` - Get last report for employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Reports
- `GET /api/reports` - Get all reports (with filters)
- `GET /api/reports/:id` - Get single report
- `POST /api/reports` - Create report (multipart/form-data)
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report
- `POST /api/reports/bulk-delete` - Bulk delete reports

### Projects
- `GET /api/projects` - Get all distinct project names

### Analytics
- `GET /api/missing-eods` - Get employees who haven't submitted EODs
- `GET /api/costs` - Get cost calculations by employee/project

### Statistics
- `GET /api/stats` - Get dashboard statistics

### Export
- `GET /api/reports/export/csv` - Export reports as CSV

### Health Check
- `GET /api/health` - Check server status

## Project Structure

```
eod-monitor/
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Global styles
│   └── package.json
├── server/
│   └── index.js           # Express server & API
├── uploads/               # Uploaded screenshots (auto-created)
├── eod_reports.db         # SQLite database (auto-created)
├── package.json           # Server dependencies
├── .env                   # Environment variables
└── README.md
```

## Database Schema

### employees
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- email (TEXT UNIQUE)
- role (TEXT)
- hourly_rate (REAL) - Default: 0
- created_at (DATETIME)

### eod_reports
- id (INTEGER PRIMARY KEY)
- employee_id (INTEGER)
- date (DATE)
- hours (REAL)
- project (TEXT) - Project/app name
- description (TEXT)
- created_at (DATETIME)

### screenshots
- id (INTEGER PRIMARY KEY)
- report_id (INTEGER)
- filename (TEXT)
- filepath (TEXT)
- caption (TEXT) - Optional caption for screenshot
- uploaded_at (DATETIME)

## Configuration

### Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

Available environment variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend API URL (used by React app in production)
REACT_APP_API_URL=http://localhost:5000/api

# CORS Configuration
# Leave empty for development (allows all origins)
# In production, set to your frontend URL(s) - comma-separated
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000     # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window
```

### File Upload Limits
- Max file size: 10MB per image
- Supported formats: JPEG, JPG, PNG, GIF
- Max files per report: 10 images

## Security Considerations

### Implemented
✅ **Rate limiting** - Protects against DoS attacks (configurable via env vars)
✅ **CORS policies** - Configurable for production environments
✅ **Environment variables** - Sensitive configuration externalized
✅ **Input validation** - File upload restrictions and data validation

### Still Needed for Production
⚠️ **Authentication/Authorization** - No user authentication currently
⚠️ **HTTPS** - Must be configured at deployment level
⚠️ **Request logging** - Add logging middleware for audit trails
⚠️ **Input sanitization** - Enhanced SQL injection prevention
⚠️ **Security headers** - Add helmet.js for security headers
⚠️ **Database encryption** - Encrypt sensitive data at rest

## Troubleshooting

### Port already in use
If port 5000 or 3000 is already in use:
```bash
# Change PORT in .env file
PORT=5001
```

### Database locked error
If you see "database is locked":
- Stop all running instances
- Delete `eod_reports.db`
- Restart the server (database will be recreated)

### File upload not working
- Check uploads directory permissions
- Verify file size is under 10MB
- Ensure file format is supported (jpg, png, gif)

### CORS errors
- Make sure both frontend and backend are running
- Check proxy setting in client/package.json
- Verify REACT_APP_API_URL in production

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Future Enhancements
- [ ] User authentication
- [ ] Email notifications
- [ ] Report templates
- [ ] Charts and analytics
- [ ] Mobile app
- [ ] Team collaboration features
- [ ] PDF export
- [ ] Advanced search
- [ ] Report comments
- [ ] Approval workflow

## License
MIT License - feel free to use this project for any purpose.

## Support
For issues or questions, please create an issue in the repository.

---

Built with ❤️ for efficient team management
