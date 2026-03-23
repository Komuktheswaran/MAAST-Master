# MAAST API Documentation

## Base URL

```
Production:  https://192.168.2.54/api
Development: http://localhost:5000/api
```

## Authentication

MAAST uses **session-based token authentication**. After login, the server returns a token that the frontend stores in `sessionStorage`. The `AdminFlag` field controls role-based access.

| AdminFlag | Role | Access |
|---|---|---|
| `1` | Admin | Full dashboard, all modules |
| `0` | Employee | Shift upload only |

> **Note:** Currently, API endpoints do NOT require a Bearer token in headers — authentication is enforced at the React route level via `sessionStorage`. For production hardening, add middleware token validation on the Express side.

---

## Health Check

### GET /api/test

Verify the server is running.

**Success Response — 200**
```json
{ "message": "Server is working!" }
```

**curl:**
```bash
curl https://192.168.2.54/api/test
```

---

## Authentication

### POST /api/login

Authenticate a user and return role information.

**Request Body:**
```json
{
  "userId": "admin01",
  "password": "Pass@1234"
}
```

**Success Response — 200:**
```json
{
  "success": true,
  "user": {
    "user_id": "admin01",
    "Adminflag": "1",
    "LINE": "L1,L2"
  }
}
```

**Error Responses:**

| Status | Body |
|---|---|
| 401 | `{ "success": false, "message": "Invalid user ID or password" }` |
| 500 | `{ "success": false, "message": "Internal server error" }` |

**curl:**
```bash
curl -X POST https://192.168.2.54/api/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin01","password":"Pass@1234"}'
```

---

### POST /api/change-password

Change a user's password. Requires current password verification.

**Request Body:**
```json
{
  "userId": "admin01",
  "oldPassword": "OldPass@1",
  "newPassword": "NewPass@2"
}
```

**Success Response — 200:**
```json
{ "success": true, "message": "Password changed successfully!" }
```

**Error Responses:**

| Status | Body |
|---|---|
| 401 | `{ "success": false, "message": "Old password is incorrect" }` |
| 500 | `{ "success": false, "message": "Internal server error" }` |

---

## User Master

### GET /api/User-master

Fetch all users.

**Success Response — 200:**
```json
[
  { "user_id": "admin01", "password": "****", "Adminflag": "1", "LINE": "L1,L2" }
]
```

---

### GET /api/User-master/:id

Fetch a single user by ID.

**Success Response — 200:**
```json
{ "user_id": "admin01", "password": "****", "Adminflag": "1", "LINE": "L1" }
```

**Error:** `404 null` if not found.

---

### POST /api/User-master

Create a new user.

**Request Body:**
```json
{
  "user_id": "emp001",
  "password": "Emp@1234",
  "Adminflag": "0",
  "lines": ["L1", "L2"]
}
```

**Success Response — 201:**
```json
{ "message": "User added" }
```

**Error Responses:**

| Status | Body |
|---|---|
| 400 | `{ "error": "user_id, password, Adminflag ('0' or '1'), and LINE are required" }` |
| 409 | `{ "error": "User already exists" }` |

---

### PUT /api/User-master/:id

Update an existing user.

**Request Body:**
```json
{
  "password": "NewPass@1",
  "Adminflag": "1",
  "lines": ["L3"]
}
```

**Success — 200:** `{ "message": "User updated" }`

**Error:** `404 { "error": "User not found" }`

---

### DELETE /api/User-master/:id

Delete a user.

**Success — 200:** `{ "message": "User deleted successfully" }`

**Error:** `404 { "error": "User not found" }`

---

## Stage Master

### GET /api/stage-master

Get all stages.

**Response — 200:**
```json
[
  { "Stage_id": 1, "Stage_name": "Assembly", "Stage_Type": "Primary", "Stage_Serial": 1 }
]
```

---

### GET /api/stage-master/types

Get distinct stage types.

**Response — 200:**
```json
["Primary", "Secondary", "Inspection"]
```

---

### POST /api/stage-master

Create a new stage. Automatically shifts existing serials to insert at the given position.

**Request Body:**
```json
{
  "Stage_name": "Quality Check",
  "Stage_Type": "Inspection",
  "Stage_Serial": 3
}
```

**Success — 201:**
```json
{
  "Stage_id": 5,
  "Stage_name": "Quality Check",
  "Stage_Type": "Inspection",
  "Stage_Serial": 3,
  "message": "Stage inserted successfully, serials normalized"
}
```

---

### PUT /api/stage-master/:id

Update a stage. Reorders all serial numbers after update.

**Request Body:**
```json
{
  "Stage_name": "QC Updated",
  "Stage_Type": "Inspection",
  "Stage_Serial": 2
}
```

**Success — 200:** `{ "message": "Stage updated and serials reordered successfully" }`

---

### DELETE /api/stage-master/:id

Delete a stage. Decrements serial numbers for all subsequent stages atomically.

**Success — 200:** `{ "message": "Stage deleted and serials updated successfully" }`

**Error:** `404 { "message": "Stage not found" }`

---

### GET /api/export-stage-master

Download Stage Master data as an Excel (.xlsx) file.

**Response:** Binary XLSX file download.

---

## Skill Master

### GET /api/skill-master

Get all skills.

**Response — 200:**
```json
[
  { "Skill_id": 1, "Skill_Rating": "A", "Skill_Description": "Expert" }
]
```

---

### GET /api/skill-master/:id

Get a skill by ID.

---

### POST /api/skill-master

Create a new skill. `Skill_Description` must be unique.

**Request Body:**
```json
{
  "Skill_Rating": "B",
  "Skill_Description": "Intermediate"
}
```

**Success — 201:**
```json
{
  "Skill_id": 3,
  "Skill_Rating": "B",
  "Skill_Description": "Intermediate",
  "message": "Skill inserted successfully"
}
```

**Error:** `400 "Skill_Description must be unique."`

---

### PUT /api/skill-master/:id

Update a skill.

**Request Body:** Same as POST.

**Success — 200:** `{ "message": "Skill updated successfully" }`

---

## Employees & Departments

### GET /api/departments

Get all departments.

**Response — 200:**
```json
[{ "dptid": 1, "DeptName": "Production" }]
```

---

### POST /api/employees

Get employees filtered by department IDs.

**Request Body:**
```json
{ "departments": [1, 2] }
```

**Response — 200:**
```json
[
  { "userid": "100009", "name": "Ranjith M C-100009", "Enrolldt": "2020-01-01T00:00:00.000Z", "designation": "Operator" }
]
```

---

### GET /api/employees

Get all active employees.

**Response — 200:**
```json
[{ "userid": "100009", "name": "Ranjith M C", "UserIDEnbl": 1 }]
```

---

### GET /api/employees-inactive

Get all inactive employees.

---

### GET /api/user-details

Get detailed employee info (DOJ, Education, Designation, Unit, Department).

**Response — 200:**
```json
[
  {
    "UserID": "100009",
    "Name": "Ranjith M C",
    "DOJ": "2020-01-15T00:00:00.000Z",
    "Education": "B.E.",
    "Designation": "Operator",
    "Unit": "Unit 3",
    "Department": "Assembly"
  }
]
```

---

## User Skills

### GET /api/user-skills

Get all user-skill mappings with employee and stage details.

**Response — 200:**
```json
[
  {
    "NAME": "Ranjith M C",
    "STAGE_NAME": "Assembly",
    "Skill_Description": "Expert",
    "Skill_Rating": "A",
    "USERID": "100009"
  }
]
```

---

### POST /api/save-skills

Save skill assignments for multiple employees (replaces existing assignments).

**Request Body:**
```json
{
  "data": [
    {
      "employeeId": "100009",
      "stages": [
        { "stageId": 1, "rating": 1 },
        { "stageId": 3, "rating": 2 }
      ]
    }
  ]
}
```

**Success — 200:** `"Skills saved successfully"`

---

### POST /api/saveUserSkills

Bulk upload user skills from parsed Excel data. Validates stage names against master.

**Request Body:** Array of skill rows
```json
[
  { "userid": "100009", "STAGE_NAME": "Assembly", "Skill_Description": "Expert", "Skill_Rating": "A" }
]
```

**Success Response:**
```json
{
  "success": true,
  "invalidRows": [
    { "userid": "100010", "STAGE_NAME": "Unknown Stage", "Status": "Invalid Stage Name" }
  ]
}
```

---

### DELETE /api/user-skills/:userId

Delete all skill records for a specific employee.

**Success — 200**

---

## Shift Management

### GET /api/shifts_master_details

Get all shift definitions with start/end times.

**Response — 200:**
```json
[{ "SFTID": "S1", "SFTName": "Shift 1", "SFTSTTime": "06:00:00", "SFTEDTime": "14:00:00" }]
```

---

### GET /api/stages_list

Get all stages (for dropdown).

---

### GET /api/shifts_list

Get all shift IDs and names.

---

### POST /api/saveUserShifts

Upload shift schedules from Excel. Validates stage names, shift IDs, and user active status. Overwrites existing records for the same user+date.

**Request Body:** Array of shift rows
```json
[
  {
    "userid": "100009",
    "STAGE_NAME": "Assembly",
    "SHIFT_ID": "S1",
    "LINE": "L1",
    "Shift_date_from": "2025-12-01",
    "Shift_date_to": "2025-12-01"
  }
]
```

**Success Response:**
```json
{
  "success": true,
  "invalidRows": [],
  "duplicates": [],
  "failedRows": [],
  "processedCount": 50,
  "totalCount": 50
}
```

**Error Response:**
```json
{
  "success": false,
  "invalidRows": [
    { "userid": "100010", "STAGE_NAME": "Bad Stage", "reason": "Stage not found in DB" }
  ]
}
```

---

### GET /api/getUserShifts

Get user shift records with optional filters.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `fromDate` | Date | Filter start date (YYYY-MM-DD) |
| `toDate` | Date | Filter end date |
| `shifts` | String | Comma-separated shift IDs |
| `stages` | String | Comma-separated stage names |
| `lines` | String | Comma-separated line names |

**Response — 200:**
```json
[
  {
    "Shift_date_from": "2025-12-01T00:00:00.000Z",
    "Shift_date_to": "2025-12-01T00:00:00.000Z",
    "userid": "100009",
    "SHIFT_ID": "S1",
    "LINE": "L1",
    "Stage_name": "Assembly",
    "user_name": "Ranjith M C"
  }
]
```

---

### GET /api/download-sample-user-shift

Download an Excel template for shift upload with dynamic stage dropdown validation.

**Response:** Binary XLSX download (`UserShiftUpload_Template.xlsx`)

---

## Lines Management

### GET /api/lines

Get all distinct line names from shift records.

**Response — 200:**
```json
[{ "LINE": "L1" }, { "LINE": "L2" }]
```

---

### GET /api/lines/master

Get lines from the lines master table.

---

### POST /api/lines

Create a new line.

**Request Body:**
```json
{ "lineName": "L3" }
```

**Success — 201:**
```json
{ "LineID": 3, "LineName": "L3", "message": "Line added successfully" }
```

**Error:** `409 "Line already exists"`

---

### PUT /api/lines/:oldLineName

Rename a line across shift and swap records.

**Request Body:**
```json
{ "newLineName": "LineA" }
```

---

### DELETE /api/lines/:id

Delete a line (only if not in use by shift records).

**Error:** `400 "Cannot delete line as it is currently in use"`

---

## Attendance

### GET /api/attendance/overall-summary

Get aggregate attendance summary by date/shift/line.

**Required Query Params:** `fromDate`, `toDate`

**Optional:** `shifts` (comma-separated), `lines` (comma-separated)

**Response — 200:**
```json
[
  {
    "DATE": "2025-12-01T00:00:00.000Z",
    "SHIFT": "S1",
    "LINE": "L1",
    "ALLOTTED": 20,
    "PRESENT": 18,
    "ABSENT": 2
  }
]
```

---

### GET /api/attendance

Get attendance summary grouped by stage/shift/line for a specific date.

**Required Query Params:** `date`, `shifts`, `lines`

**Response — 200:**
```json
[
  {
    "Stage_name": "Assembly",
    "Stage_Serial": 1,
    "LINE": "L1",
    "SHIFT_ID": "S1",
    "ALLOT": 10,
    "PRESENT": 9,
    "ABSENT": 1
  }
]
```

---

### GET /api/attendance/showAll

Get detailed per-employee attendance for a date with punch-in/out times, punctuality, late minutes, worked minutes, and overtime.

**Required Query Params:** `date`, `shifts`, `lines`

**Optional:** `stageId`

**Response — 200:**
```json
[
  {
    "USERID": "100009",
    "NAME": "Ranjith M C",
    "SwapStatus": "Original",
    "SHIFT_ID": "S1",
    "Stage_name": "Assembly",
    "LINE": "L1",
    "PUNCHIN": "2025-12-01T06:12:00.000Z",
    "PunchInTimeOnly": "06:12:00",
    "PUNCHOUT": "2025-12-01T14:05:00.000Z",
    "PunchOutTimeOnly": "14:05:00",
    "TotalPunches": 4,
    "STATUS": "Present",
    "PunctualityStatus": "On Time",
    "LateByMinutes": 0,
    "WorkedMinutes": 473,
    "OvertimeMinutes": 0
  }
]
```

---

### GET /api/attendance/unassignedManpower

Detect employees punching in for wrong shifts or employees without shift assignments who have punched.

**Required Query Param:** `date`

**Response — 200:** Array with same structure as `showAll` but includes only wrong-shift and no-shift employees.

---

## Employee Reports

### GET /api/getEmployees

Get list of present employees for a shift/stage/line on a given date (for swap selection).

**Required Query Params:** `date`, `shiftId`, `Stage_name`, `Line`

---

### POST /api/employee-history

Get full attendance/shift history for an employee over a date range.

**Request Body:**
```json
{
  "employeeId": "100009",
  "fromDate": "2025-11-01",
  "toDate": "2025-11-30"
}
```

**Response — 200:**
```json
{
  "employeeId": "100009",
  "fromDate": "2025-11-01",
  "toDate": "2025-11-30",
  "records": [
    {
      "SL_NO": 1,
      "DATE": "01/11/2025",
      "SHIFT": "S1",
      "LINE": "L1",
      "STAGE": "Assembly",
      "ATTENDANCE": "Present",
      "PUNCTUALITY": "On Time"
    }
  ]
}
```

---

### POST /api/employee-punctuality

Get punctuality analysis for an employee.

**Request Body:**
```json
{ "employeeId": "100009", "fromDate": "2025-11-01", "toDate": "2025-11-30" }
```

**Response:** Array of daily punctuality records with `PUNCTUALITY` like `"Late (12 mins late)"` or `"On Time"`.

---

### GET /api/punch_report

Get detailed per-day punch timeline with break analysis and worked/overtime minutes.

**Required Query Params:** `userid`, `fromDate`, `toDate`

**Optional:** `earlyGrace` (default 45 min), `lateGrace` (default 15 min)

---

### GET /api/shifts

Get all distinct shift IDs from shift records.

### GET /api/lines

Get all distinct lines from shift records.

---

## Swap Management

### POST /api/saveUserSwap

Record an employee swap assignment.

**Request Body:**
```json
[
  {
    "shiftDate": "2025-12-01",
    "Stage_name": "Assembly",
    "shiftId": "S1",
    "line": "L1",
    "absentUserId": "100010",
    "swapUserId": "100009"
  }
]
```

**Success — 200:** `"All swap details saved successfully"`

---

## Job Cards

### POST /api/jobcard-upload

Bulk upload job card data (daily performance scores per employee).

**Request Body:**
```json
[
  {
    "Edatetime": "2025-12-01",
    "UserID": "100009",
    "Job_Target": 100,
    "Job_Actual": 95,
    "Job_Rejns": 2,
    "job_5S": 3,
    "PPE": 3,
    "Job_Disclipline": 3
  }
]
```

---

## Carousel Images

### POST /api/create-carousel-table

Initialize the `CarouselImages` table (run once).

### POST /api/carousel-images/upload

Upload a new carousel image (JPEG/PNG/GIF/WEBP, max 500MB).

**Form Data:** `image` (file), `displayOrder` (int), `description` (string)

### GET /api/carousel-images

Get all active carousel images ordered by display_order.

### GET /api/carousel-images/:id

Get a single image by ID.

### DELETE /api/carousel-images/:id

Soft-delete an image (sets `is_active = 0`).

### PUT /api/carousel-images/:id/order

Update display order for a single image.

### PUT /api/carousel-images/bulk-order

Bulk update display orders for multiple images.

**Request Body:**
```json
{
  "images": [
    { "id": 1, "displayOrder": 2 },
    { "id": 2, "displayOrder": 1 }
  ]
}
```

---

## Template Downloads

### GET /download-template

Download the skill upload Excel template (`sample_template.xlsx`).

### GET /api/download-sample-user-shift

Download the shift upload Excel template with stage dropdown validation.

---

## Common Error Response Format

| Status | Meaning |
|---|---|
| `400` | Bad Request — missing/invalid parameters |
| `401` | Unauthorized — wrong credentials |
| `404` | Not Found — resource doesn't exist |
| `409` | Conflict — duplicate resource |
| `500` | Internal Server Error — DB or server failure |

All 500 errors return:
```json
{ "error": "Internal Server Error", "details": "..." }
```
