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
  "role": "Product Manager"
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

Currently no rate limiting is implemented. For production:
- Implement rate limiting (e.g., express-rate-limit)
- Recommended: 100 requests per 15 minutes per IP

---

## CORS

CORS is enabled for all origins in development. For production:
- Whitelist specific origins
- Update CORS configuration in server/index.js

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
