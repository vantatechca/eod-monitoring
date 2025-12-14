# API Documentation

Complete API reference for the EOD Monitor application.

**Base URL**: `http://localhost:5000/api`

## Authentication
Currently, the API does not require authentication. For production use, implement JWT or session-based authentication.

---

## Employees

### Get All Employees
```http
GET /api/employees
```

**Response**:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Software Engineer",
    "hourly_rate": 50.00,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

### Get Single Employee
```http
GET /api/employees/:id
```

**Response**:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Software Engineer",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### Create Employee
```http
POST /api/employees
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "Product Manager",
  "hourly_rate": 55.00
}
```

**Response**:
```json
{
  "id": 2,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "Product Manager"
}
```

**Validation**:
- All fields required
- Email must be unique
- Email must be valid format

### Update Employee
```http
PUT /api/employees/:id
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "role": "Senior Product Manager"
}
```

**Response**:
```json
{
  "id": 2,
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "role": "Senior Product Manager"
}
```

### Delete Employee
```http
DELETE /api/employees/:id
```

**Response**:
```json
{
  "message": "Employee deleted successfully"
}
```

---

## EOD Reports

### Get All Reports
```http
GET /api/reports?employee_id=1&start_date=2024-01-01&end_date=2024-01-31
```

**Query Parameters**:
- `employee_id` (optional): Filter by employee ID
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)
- `project` (optional): Filter by project name

**Response**:
```json
[
  {
    "id": 1,
    "employee_id": 1,
    "employee_name": "John Doe",
    "employee_email": "john@example.com",
    "employee_role": "Software Engineer",
    "date": "2024-01-15",
    "hours": 8.5,
    "description": "Worked on authentication module and bug fixes",
    "created_at": "2024-01-15T18:30:00.000Z",
    "screenshots": [
      {
        "id": 1,
        "report_id": 1,
        "filename": "screenshot1.png",
        "filepath": "1705339800000-123456789.png",
        "uploaded_at": "2024-01-15T18:30:00.000Z"
      }
    ]
  }
]
```

### Get Single Report
```http
GET /api/reports/:id
```

**Response**: Same structure as single report in array above

### Create Report
```http
POST /api/reports
Content-Type: multipart/form-data
```

**Form Data**:
- `employee_id` (required): Employee ID
- `date` (required): Report date (YYYY-MM-DD)
- `hours` (required): Hours worked (number)
- `description` (optional): Work description (text)
- `screenshots` (optional): Image files (multiple allowed)

**Example using cURL**:
```bash
curl -X POST http://localhost:5000/api/reports \
  -F "employee_id=1" \
  -F "date=2024-01-15" \
  -F "hours=8.5" \
  -F "description=Worked on authentication" \
  -F "screenshots=@screenshot1.png" \
  -F "screenshots=@screenshot2.png"
```

**Response**:
```json
{
  "id": 1,
  "employee_id": 1,
  "date": "2024-01-15",
  "hours": 8.5,
  "description": "Worked on authentication",
  "screenshots": 2
}
```

**File Upload Constraints**:
- Max file size: 10MB per file
- Max files: 10 per report
- Allowed formats: JPEG, JPG, PNG, GIF

### Update Report
```http
PUT /api/reports/:id
Content-Type: application/json
```

**Request Body**:
```json
{
  "employee_id": 1,
  "date": "2024-01-15",
  "hours": 9,
  "description": "Updated description"
}
```

**Note**: Screenshots cannot be updated via PUT. Delete and create new report if needed.

### Delete Report
```http
DELETE /api/reports/:id
```

**Response**:
```json
{
  "message": "Report deleted successfully"
}
```

**Note**: Deleting a report also deletes associated screenshots from the database and file system.

### Bulk Delete Reports
```http
POST /api/reports/bulk-delete
Content-Type: application/json
```

**Request Body**:
```json
{
  "report_ids": [1, 2, 3, 4, 5]
}
```

**Response**:
```json
{
  "deleted": 5,
  "report_ids": [1, 2, 3, 4, 5]
}
```

---

## Projects

### Get All Projects
```http
GET /api/projects
```

**Response**:
```json
["Project Alpha", "Project Beta", "Internal Tools"]
```

Returns a list of distinct project names from all reports.

---

## Employee Reports

### Get Last Report for Employee
```http
GET /api/employees/:id/last-report
```

**Response**:
```json
{
  "id": 42,
  "employee_id": 1,
  "date": "2024-01-15",
  "hours": 8.5,
  "project": "Project Alpha",
  "description": "Worked on authentication module",
  "created_at": "2024-01-15T18:30:00.000Z"
}
```

Returns the most recent report for the specified employee, useful for pre-filling forms.

---

## Analytics

### Get Missing EODs
```http
GET /api/missing-eods?date=2024-01-15
```

**Query Parameters**:
- `date` (optional): Target date (YYYY-MM-DD). Defaults to today.

**Response**:
```json
{
  "date": "2024-01-15",
  "total_employees": 10,
  "reported": 7,
  "missing": 3,
  "missing_employees": [
    {
      "id": 3,
      "name": "Jane Smith",
      "role": "Product Manager"
    },
    {
      "id": 5,
      "name": "Bob Johnson",
      "role": "Designer"
    },
    {
      "id": 8,
      "name": "Alice Williams",
      "role": "QA Engineer"
    }
  ]
}
```

### Get Cost Calculations
```http
GET /api/costs?employee_id=1&project=ProjectAlpha&start_date=2024-01-01&end_date=2024-01-31
```

**Query Parameters**:
- `employee_id` (optional): Filter by employee ID
- `project` (optional): Filter by project name
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)

**Response**:
```json
{
  "employees": [
    {
      "employee_id": 1,
      "employee_name": "John Doe",
      "hourly_rate": 50.00,
      "total_hours": 168.5,
      "report_count": 21,
      "total_cost": 8425.00
    },
    {
      "employee_id": 2,
      "employee_name": "Jane Smith",
      "hourly_rate": 55.00,
      "total_hours": 160.0,
      "report_count": 20,
      "total_cost": 8800.00
    }
  ],
  "summary": {
    "total_cost": 17225.00,
    "total_hours": 328.5,
    "average_rate": 52.42
  }
}
```

---

## Statistics

### Get Dashboard Stats
```http
GET /api/stats
```

**Response**:
```json
{
  "totalEmployees": 5,
  "totalReports": 42,
  "totalHours": 336,
  "reportsToday": 3
}
```

---

## Export

### Export Reports to CSV
```http
GET /api/reports/export/csv?employee_id=1&start_date=2024-01-01&end_date=2024-01-31
```

**Query Parameters**: Same as Get All Reports

**Response**: CSV file download
```csv
Date,Employee Name,Email,Role,Hours,Description
"2024-01-15","John Doe","john@example.com","Software Engineer",8.5,"Worked on authentication"
```

---

## Uploads

### Access Uploaded Screenshot
```http
GET /uploads/:filename
```

**Example**:
```
GET http://localhost:5000/uploads/1705339800000-123456789.png
```

Returns the image file.

---

## Health Check

### Server Health
```http
GET /api/health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T18:30:00.000Z"
}
```

---

## Error Responses

All endpoints return appropriate HTTP status codes:

### 400 Bad Request
```json
{
  "error": "Name, email, and role are required"
}
```

### 404 Not Found
```json
{
  "error": "Employee not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database error message"
}
```

---

## Rate Limiting

Rate limiting is now implemented using `express-rate-limit`:
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables:
  - `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 900000 = 15 minutes)
  - `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)
- Returns 429 status code when limit exceeded
- Response headers include rate limit info

**Rate Limit Response**:
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```

---

## CORS

CORS is configured to support both development and production:
- **Development**: All origins allowed (ALLOWED_ORIGINS not set)
- **Production**: Restricted to specific origins via `ALLOWED_ORIGINS` environment variable
- Set `ALLOWED_ORIGINS` in `.env` as comma-separated list:
  ```
  ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
  ```

---

## Testing Examples

### Using JavaScript (Fetch API)

```javascript
// Get all employees
const employees = await fetch('http://localhost:5000/api/employees')
  .then(res => res.json());

// Create employee
const newEmployee = await fetch('http://localhost:5000/api/employees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Developer'
  })
}).then(res => res.json());

// Submit report with screenshots
const formData = new FormData();
formData.append('employee_id', '1');
formData.append('date', '2024-01-15');
formData.append('hours', '8');
formData.append('description', 'Work description');
formData.append('screenshots', fileInput.files[0]);

const report = await fetch('http://localhost:5000/api/reports', {
  method: 'POST',
  body: formData
}).then(res => res.json());
```

### Using cURL

```bash
# Get all employees
curl http://localhost:5000/api/employees

# Create employee
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","role":"Developer"}'

# Get filtered reports
curl "http://localhost:5000/api/reports?employee_id=1&start_date=2024-01-01"

# Export to CSV
curl "http://localhost:5000/api/reports/export/csv" -o reports.csv
```

### Using Postman

1. Import the collection (if provided)
2. Set base URL variable: `{{baseUrl}}` = `http://localhost:5000/api`
3. Use the predefined requests
4. For file uploads, use form-data body type

---

## Webhooks (Future Feature)

For future implementation, webhooks could notify external systems when:
- New report submitted
- Employee added
- Daily report deadline missed

---

## Best Practices

1. **Always validate input** on client and server
2. **Handle errors gracefully** with proper status codes
3. **Use pagination** for large datasets (not currently implemented)
4. **Implement authentication** for production
5. **Cache responses** where appropriate
6. **Log all requests** for debugging and monitoring

---

Need help? Check the main README.md or create an issue!
