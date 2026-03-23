# MAAST — Manpower, Allotment, Attendance & Skill Tracking

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-v18.3-61DAFB?logo=react&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server-MSSQL-CC2927?logo=microsoftsqlserver&logoColor=white)
![Express](https://img.shields.io/badge/Express-v4.19-000000?logo=express&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)
![Platform](https://img.shields.io/badge/Platform-Windows_Server_/_IIS-0078D6?logo=windows&logoColor=white)

---

## 📋 Overview

**MAAST** is a full-stack internal workforce management platform built for manufacturing & production environments. It enables supervisors and administrators to track employee shift allocations, monitor real-time attendance (via biometric punch data), manage skill ratings per production stage, handle leave requests, and generate detailed manpower reports — all from a single web dashboard.

The system bridges an existing MS SQL Server biometric database with a modern React UI, making it the central hub for day-to-day manpower operations across multiple production lines and shifts.

**Who it's for:** Plant managers, HR, supervisors, and line administrators in manufacturing units.

---

## ✨ Features

- **Authentication & Access Control** — Role-based login (Admin / Employee). Admins see the full dashboard; employees are directed to their own shift upload screen.
- **Stage Master** — CRUD management of production stages with drag-to-reorder serial numbering and export to Excel.
- **Skill Master** — Define skill ratings (A/B/C etc.) with descriptions; enforce unique skill definitions.
- **User Skills Management** — Assign skill ratings to employees per stage, with bulk Excel upload support and validation against existing stages.
- **Shift Management** — Upload employee shift schedules via Excel (per-date columns), view/filter shift reports, and manage production lines.
- **Attendance Dashboard** — Real-time attendance board: see Allotted vs Present vs Absent per stage/shift/line. Supports multi-shift, night-shift overnight punch logic, 45-min early grace and 30-min late grace.
- **Swap Management** — Record employee swap assignments when someone covers an absent colleague's slot.
- **Unassigned Manpower Detection** — Automatically flag employees punching in for wrong shifts or without any shift assignment on a given day.
- **Employee History** — Full date-range attendance history per employee including source (direct shift / swap / punch-only).
- **N-Punch Report** — Detailed punch-in/punch-out tracking with break time analysis, overtime calculation, and auto-detected shift identification.
- **Employee Punctuality** — Per-employee punctuality scoring with late-minutes calculation.
- **Job Card Upload/Download** — Upload daily job card data (targets, actuals, rejections, 5S, PPE, discipline scores) with Excel export.
- **Leave Management** — Record and manage employee leave data.
- **Carousel / Image Upload** — Upload and manage dashboard announcement images with ordering.
- **Weightage Master** — Configure scoring weightages for evaluation criteria.
- **Summary Reports** — Aggregate manpower and attendance summaries across date ranges.
- **Dark/Light Theme** — System-wide theme toggle.

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | v18.3.1 |
| UI Library | Material UI (MUI) | v5.15.21 |
| Routing | React Router DOM | v6 |
| HTTP Client | Axios | v1.7.2 |
| Backend Runtime | Node.js | v18+ |
| Backend Framework | Express.js | v4.19.2 |
| Database | Microsoft SQL Server | 2019+ |
| DB Client (Node) | mssql | v11.0.0 |
| File Processing | ExcelJS | v4.4.0 |
| File Upload | Multer | v2.0.2 |
| Process Manager | nodemon (dev) / IIS Node (prod) | — |
| Deployment | Windows Server + IIS + iisnode | — |

---

## ✅ Prerequisites

- **Node.js** v18 or higher ([nodejs.org](https://nodejs.org))
- **npm** v9+
- **Microsoft SQL Server 2019+** with an existing biometric/ERP database (schema described in DB docs)
- **Windows Server with IIS** (for production; iisnode module required)
- Access to the SQL Server instance (`msnodesqlv8` driver used — Windows Authentication supported)

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Komuktheswaran/MAAST-Master.git
cd MAAST-Master
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../master
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_SERVER=192.168.x.x          # SQL Server IP or hostname
DB_DATABASE=YOUR_DATABASE_NAME
DB_PORT=1433                   # Default SQL Server port
PORT=5000                      # Express server port
```

> ⚠️ **Never commit `.env` to version control.**

### 5. Build the Frontend (Production)

```bash
cd master
npm run build
```

The build output lands in `master/build/` and is served statically by the Express backend.

---

## 🔧 Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `DB_USER` | SQL Server login username | `sa` |
| `DB_PASSWORD` | SQL Server login password | `StrongP@ss!` |
| `DB_SERVER` | SQL Server hostname/IP | `192.168.2.54` |
| `DB_DATABASE` | Target database name | `MSSCOSEC` |
| `DB_PORT` | SQL Server port | `1433` or custom |
| `PORT` | Express server port (default: 5000) | `5000` |

---

## 🚀 Running the Application

### Development Mode

**Backend (with hot reload):**
```bash
cd backend
npm start          # uses nodemon
```

**Frontend (React dev server):**
```bash
cd master
npm start          # starts on http://localhost:3000
```

> In development, the React frontend proxies API calls to `http://localhost:5000`. Make sure `proxy` is set in `master/package.json`.

### Production Mode (IIS + iisnode)

1. Build the React app: `cd master && npm run build`
2. Configure `web.config` in the `backend/` folder (already included)
3. Deploy both `backend/` and `master/build/` to IIS
4. The Express server serves the React static files automatically from `../master/public`

---

## 📁 Folder Structure

```
MAAST-Master/
├── backend/                   # Node.js + Express API server
│   ├── server.js              # Main server file (all routes, 5400+ lines)
│   ├── db.js                  # Database connection helper (secondary)
│   ├── .env                   # Environment variables (not committed)
│   ├── package.json
│   ├── web.config             # IIS + iisnode configuration
│   └── iisnode/               # IIS Node logs
│
├── master/                    # React frontend application
│   ├── public/                # Static assets (templates, images)
│   ├── src/
│   │   ├── App.js             # Root component + routing
│   │   ├── components/        # Feature components (18 total)
│   │   │   ├── Attendance.js
│   │   │   ├── Summary.js
│   │   │   ├── UserSkills.js
│   │   │   ├── UserShiftUpload.js
│   │   │   ├── UserShiftReport.js
│   │   │   ├── StageMaster.js
│   │   │   ├── SkillMaster.js
│   │   │   ├── EmployeeHistory.js
│   │   │   ├── EmployeePunctuality.js
│   │   │   ├── NPunchReport.js
│   │   │   ├── LeaveManagement.js
│   │   │   ├── WeightageMaster.js
│   │   │   ├── EmployeeJobCardUpload.js
│   │   │   ├── EmployeeJobCardDownload.js
│   │   │   ├── UserSkillsUpload.js
│   │   │   ├── ImageUpload.js
│   │   │   ├── AddUsers.js
│   │   │   └── ThemeToggle.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   └── HomePage.js
│   │   ├── context/
│   │   │   └── ThemeContext.js
│   │   ├── hooks/
│   │   └── styles/            # CSS files per component
│   └── package.json
│
├── database_indexing_strategy.sql   # SQL indexing scripts
├── web.config                       # Root-level IIS config
└── README.md
```

---

## 📸 Screenshots

> _Screenshots to be added after deployment._

| Screen | Description |
|---|---|
| Login Page | Dark-themed login with role-based routing |
| Attendance Dashboard | Real-time grid showing Allotted/Present/Absent |
| Stage Master | Draggable stage list with serial reordering |
| Skill Matrix | Employee-stage skill rating matrix |
| Shift Upload | Excel upload with validation feedback |
| N-Punch Report | Detailed per-day punch timeline |

---

*For full API documentation, database schema, architecture diagrams, and deployment guide, see the [`/docs`](./docs/) folder.*