# MAAST Architecture Documentation

## System Overview

MAAST is a 3-tier web application:

```
Browser (React SPA)
       ↕ HTTPS (Axios)
Express.js API Server (Node.js / IIS + iisnode)
       ↕ mssql driver (TCP)
Microsoft SQL Server 2019+
       ↑
Biometric System (populates Mx_ATDEventTrn, Mx_UserMst)
```

The frontend is a **React Single Page Application** served as static files by the Express backend. All API calls go to the same origin, avoiding CORS issues in production.

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client ["Browser (React SPA)"]
        Login["LoginPage"]
        HomePage["HomePage / Sidebar Nav"]
        Components["18 Feature Components"]
        SessionStorage["sessionStorage\n(authToken, AdminFlag, Line)"]
    end

    subgraph Server ["Windows Server / IIS + iisnode"]
        IIS["IIS Web Server"]
        NodeServer["Express.js (server.js)\nPort 5000"]
        StaticFiles["React Build Files\n/master/build"]
        Multer["Multer\n(File Upload Handler)"]
        ExcelJS["ExcelJS\n(Excel Generation)"]
    end

    subgraph Database ["Microsoft SQL Server"]
        AppTables["App Tables\n(UserLogin, StageMaster,\nSkillMaster, UserSkills,\nUserShifts, Userswap,\nLinesMaster, CarouselImages)"]
        ERPTables["ERP/Biometric Tables\n(UserMst, ATDEventTrn,\nShiftMst, DepartmentMst,\nDesignationMst)"]
    end

    subgraph External ["External Systems"]
        Biometric["Biometric Device\n(Punch Reader)"]
        ERPSystem["ERP System\n(Employee Records)"]
    end

    Client -- "HTTPS API Calls\n/api/*" --> Server
    Client -- "Static Assets" --> StaticFiles
    IIS --> NodeServer
    NodeServer --> AppTables
    NodeServer --> ERPTables
    NodeServer --> Multer
    NodeServer --> ExcelJS
    Biometric --> ERPTables
    ERPSystem --> ERPTables
```

---

## Component Interaction Diagram

```mermaid
flowchart LR
    subgraph Frontend ["React Frontend"]
        direction TB
        App["App.js\n(Router)"]
        Auth["LoginPage\n/api/login"]
        Attend["Attendance.js\n/api/attendance/*"]
        Shifts["UserShiftUpload.js\n/api/saveUserShifts"]
        ShiftReport["UserShiftReport.js\n/api/getUserShifts"]
        Skills["UserSkills.js\n/api/save-skills"]
        SkillsUp["UserSkillsUpload.js\n/api/saveUserSkills"]
        EmpHist["EmployeeHistory.js\n/api/employee-history"]
        NPunch["NPunchReport.js\n/api/punch_report"]
        Punct["EmployeePunctuality.js\n/api/employee-punctuality"]
        Summary["Summary.js\n/api/attendance/overall-summary"]
        JobUp["EmployeeJobCardUpload.js\n/api/jobcard-upload"]
        JobDown["EmployeeJobCardDownload.js\n/api/jobcard-download"]
        Stages["StageMaster.js\n/api/stage-master"]
        SkillM["SkillMaster.js\n/api/skill-master"]
        Users["AddUsers.js\n/api/User-master"]
        Leave["LeaveManagement.js\n/api/leave-*"]
        Img["ImageUpload.js\n/api/carousel-images"]
        Weight["WeightageMaster.js"]
    end

    subgraph Backend ["Express API (server.js)"]
        Auth2["Auth Routes"]
        AttendRoutes["Attendance Routes"]
        ShiftRoutes["Shift Routes"]
        SkillRoutes["Skill Routes"]
        EmpRoutes["Employee Routes"]
        Master["Master Data Routes"]
        Media["Media Routes"]
    end

    App --> Auth & Attend & Shifts & Skills & Stages & Users
    Auth --> Auth2
    Attend --> AttendRoutes
    Shifts & ShiftReport --> ShiftRoutes
    Skills & SkillsUp --> SkillRoutes
    EmpHist & NPunch & Punct & Summary --> AttendRoutes
    JobUp & JobDown --> EmpRoutes
    Stages & SkillM & Users & Leave & Weight --> Master
    Img --> Media
```

---

## Data Flow Diagram

### Login Flow
```mermaid
sequenceDiagram
    participant U as Browser
    participant E as Express API
    participant DB as SQL Server

    U->>E: POST /api/login {userId, password}
    E->>DB: SELECT FROM Mx_UserLogin WHERE user_id=? AND password=?
    DB-->>E: {user_id, Adminflag, LINE} or empty
    alt Valid Credentials
        E-->>U: 200 {success:true, user:{user_id, Adminflag, LINE}}
        U->>U: sessionStorage.setItem('authToken', token)
        U->>U: Navigate to /home (Admin) or /user-shift-upload (Employee)
    else Invalid
        E-->>U: 401 {success:false, message:"Invalid user ID or password"}
    end
```

---

### Attendance Query Flow
```mermaid
sequenceDiagram
    participant U as Browser
    participant E as Express API
    participant DB as SQL Server

    U->>E: GET /api/attendance/showAll?date=2025-12-01&shifts=S1&lines=L1
    E->>DB: WITH Assignments AS (...) Mx_UserShifts JOIN Mx_ShiftMst
    DB-->>E: Assigned user-shift records
    E->>DB: WITH SmartPunches AS (...) Mx_ATDEventTrn (±45 min window)
    DB-->>E: Punch-in, Punch-out, PunchCount
    E->>DB: WITH Swaps AS (...) Mx_Userswap WHERE Shift_date=?
    DB-->>E: Swap assignments
    E->>E: JOIN Assignments + SmartPunches + Swaps
    E->>E: Calculate STATUS, PunctualityStatus, LateByMinutes, WorkedMinutes, OvertimeMinutes
    E-->>U: 200 Array of detailed employee records
```

---

### Shift Upload Flow
```mermaid
sequenceDiagram
    participant U as Browser
    participant E as Express API
    participant DB as SQL Server

    U->>U: Parse Excel file in browser
    U->>E: POST /api/saveUserShifts [array of shift rows]
    E->>DB: SELECT Stage_Id, Stage_name FROM Mx_StageMaster
    DB-->>E: Stage map
    E->>DB: SELECT SFTID FROM Mx_ShiftMst
    DB-->>E: Valid shift IDs
    E->>DB: SELECT USERID, UserIDEnbl FROM MX_USERMST WHERE USERID IN (...)
    DB-->>E: Active/inactive status per user
    loop For each batch of 50 rows
        E->>E: Validate stage name + shift ID + user status
        E->>DB: DELETE FROM Mx_UserShifts WHERE userid=? AND Shift_date_from=?
        E->>DB: INSERT INTO Mx_UserShifts (date, userid, stage_id, shift_id, line)
    end
    E-->>U: {success, processedCount, invalidRows, failedRows}
```

---

## Technology Decisions

| Decision | Rationale |
|---|---|
| Single `server.js` file | Rapid development for internal tool; easy deployment on IIS via iisnode |
| mssql with msnodesqlv8 | Supports Windows authentication against on-prem SQL Server, required in the network environment |
| React session storage for auth | Simple stateless session management; sufficient for intranet tool |
| ExcelJS for Excel generation | Full XLSX support with data validation (dropdown lists in upload templates) |
| Multer in-memory storage | Images stored as base64 in SQL; avoids file system dependency |
| 500MB body limit | Required for large Excel payloads with many shift records |
| IIS + iisnode deployment | Windows Server infrastructure already available; avoids additional tooling |
