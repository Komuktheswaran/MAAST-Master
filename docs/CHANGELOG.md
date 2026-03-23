# Changelog

All notable changes to **MAAST** are documented here.

---

## [1.0.0] — 2025-12-01

### Initial Release

This is the first production-ready release of the MAAST platform. It covers the complete manpower management workflow for manufacturing production environments.

---

### 🔐 Authentication
- User login with User ID + Password
- Role-based access: Admin (full dashboard) vs Employee (shift upload only)
- Change password from login screen
- Session-based auth stored in sessionStorage

---

### 🏗️ Master Data Management
- **Stage Master** — Full CRUD for production stages with auto-resequencing of serial numbers on add/delete/reorder
- **Skill Master** — CRUD for skill rating categories (A/B/C etc.) with uniqueness enforcement
- **User Master** — Manage MAAST login users, assign admin flag and line access
- Export Stage Master to Excel (`.xlsx`)

---

### 🎯 User Skills
- Assign skill ratings to employees per production stage via interactive grid UI
- Bulk upload skills via Excel — validates stage names against master, reports invalid rows
- View all employee-skill mappings with stage and employee name resolved

---

### 📅 Shift Management
- Upload employee shift schedules from Excel with dynamic per-date columns
- Validates stage names, shift IDs, and user active/inactive status during upload
- Overwrites existing records for the same user+date (last upload wins)
- Handles employee swap records — clears conflicting swaps when new schedule uploaded
- View and filter shift report by date range, shift, stage, and line
- Download dynamic Excel template with dropdown validation for stage names

---

### 📊 Attendance Dashboard
- Real-time per-stage/shift/line attendance board (Allotted vs Present vs Absent)
- Detailed employee-level attendance view with:
  - Punch In / Punch Out times
  - Punctuality status (On Time / Late)
  - Late minutes
  - Worked minutes
  - Overtime minutes (with 30-minute grace period after shift end)
  - Total punch count
- Night shift support (handles shifts crossing midnight)
- 45-minute early punch grace window for punch-in detection
- Smart punch-in detection: uses pre-shift punch if available, else post-start punch
- Swap awareness: swapped employees shown in their assigned position
- Unassigned manpower detection: flags employees punching in wrong shifts or without shift assignments
- Overall attendance summary by date/shift/line (aggregate view)

---

### 🔄 Swap Management
- Record swap assignments (who covered for whom) from the attendance screen
- Swaps reflected in attendance board for accurate headcount and status

---

### 👤 Employee Reports
- **Employee History** — Full date-range attendance history per employee (shift, swap, and punch-only records)
- **N-Punch Report** — Detailed per-day punch timeline including:
  - Auto shift detection (even without assignment)
  - All punch times as list
  - Break time analysis
  - Worked hours calculation
  - Overtime per day
- **Employee Punctuality** — Per-employee punctuality scoring over date range with late-minute detail
- **Employee Job Card Download** — Download performance score data per employee
- **Employee Job Card Upload** — Bulk upload daily job targets, actuals, rejections, 5S, PPE, discipline scores

---

### 📋 Leave Management
- Record and view employee leave data

---

### 📈 Summary Reports
- Aggregate attendance summary across date ranges, shifts, and lines

---

### 🖼️ Image Management
- Upload announcement/notice images for dashboard carousel
- Manage display order via drag-and-drop
- Soft-delete images (they remain in DB but hidden)
- Supports JPEG, PNG, GIF, WebP up to 500MB

---

### ⚖️ Weightage Master
- Configure weightage scores for evaluation criteria

---

### 🎨 UI / UX
- Dark-themed sidebar navigation with Material UI (MUI v5)
- Light/Dark theme toggle
- Role-based menu visibility
- Responsive React SPA
- Excel upload with inline validation error display
- Mobile-aware layout

---

### 🛠️ Infrastructure
- Node.js + Express backend with single `server.js` architecture
- Microsoft SQL Server via `mssql` driver (msnodesqlv8 for Windows Authentication)
- File uploads via Multer (in-memory storage)
- Excel generation via ExcelJS
- Deployed on Windows Server + IIS + iisnode
- 500MB request body limit for large Excel uploads

---

## [Unreleased] — Future Enhancements

- JWT-based API authentication (currently session-only auth at frontend)
- Password hashing (currently stored in plain text — **needs urgent attention for production**)
- Unit and integration tests
- Mobile app (React Native) for field supervisors
- Real-time attendance push via WebSocket
- Email/SMS alerts for absenteeism threshold
- Multi-tenant support
