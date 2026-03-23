# MAAST Developer Guide

## Adding a New API Endpoint

### 1. Define the route in `backend/server.js`

All routes live in the single `server.js` file. Find an appropriate location (group by feature) and add:

```javascript
// GET /api/my-new-endpoint
app.get("/api/my-new-endpoint", async (req, res) => {
  const { someParam } = req.query;
  
  if (!someParam) {
    return res.status(400).json({ error: "someParam is required" });
  }
  
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("param", sql.NVarChar, someParam)
      .query("SELECT * FROM SomeTable WHERE Col = @param");
    
    res.json(result.recordset);
  } catch (error) {
    console.error("Error in /api/my-new-endpoint:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});
```

**Rules:**
- Always use parameterized queries (`.input("name", type, value)`) — never string-concatenate user input directly into SQL.
- Always log errors with `console.error`.
- Return consistent error shapes: `{ error: "message" }` or `{ error: "message", details: "..." }`.
- Use `sql.connect(config)` at the start of each handler (connection pooling is handled by `mssql`).

### 2. Create the React component or hook

In `master/src/components/MyFeature.js`:

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyFeature = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('https://192.168.2.54/api/my-new-endpoint?someParam=value');
        setData(res.data);
      } catch (err) {
        setError('Failed to load data');
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {data.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  );
};

export default MyFeature;
```

### 3. Add the route in `App.js`

```jsx
import MyFeature from './components/MyFeature';

// Inside <Routes>:
<Route path="/my-feature" element={<ProtectedRoute element={<MyFeature />} />} />
```

### 4. Add it to the sidebar navigation

In `master/src/pages/HomePage.js`, add to the navigation menu list.

---

## Adding a New Database Table

### 1. Write the CREATE TABLE script

```sql
-- Run this directly in SQL Server Management Studio
CREATE TABLE Mx_NewTable (
    NewID     INT IDENTITY(1,1) PRIMARY KEY,
    Name      NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    IsActive  BIT DEFAULT 1
);

-- Add recommended indexes
CREATE INDEX IX_NewTable_Name ON Mx_NewTable (Name);
```

### 2. Create API CRUD routes in `server.js`

Follow the existing Stage Master or Skill Master pattern — GET all, GET by ID, POST, PUT, DELETE.

### 3. Update `database-schema.md`

Add the new table to the Database Schema documentation.

---

## Code Style Guide

### JavaScript (Node.js backend)

- **No semicolons** (project uses ESLint with no-semicolons style)  
- Use `const`/`let`, never `var`
- Arrow functions for callbacks and handlers
- `async/await` over Promises
- Always use parameterized SQL queries to prevent injection
- Log with `console.log` (info) and `console.error` (errors)

### React (Frontend)

- Functional components only (no class components)
- Use `useState` and `useEffect` hooks
- Use MUI components consistently (`Button`, `Table`, `TextField`, etc.)
- CSS in separate files in `src/styles/` — one file per component
- Component files: PascalCase (`UserShiftReport.js`)
- Variable names: camelCase
- Avoid inline styles; use className and CSS files

### SQL Queries

- Use CTEs (`WITH ... AS`) for complex multi-step queries
- Always add `DISTINCT` when joining tables that may produce duplicate rows
- Use `ISNULL(col, default)` for null handling
- Use `RTRIM()` when comparing string columns from biometric tables (they often have trailing spaces)
- Add comments on CTEs explaining their purpose

---

## Git Branching Strategy

```
main           ← Production-ready code
│
├── develop    ← Integration branch for completed features
│   │
│   ├── feature/attendance-overtime    ← New feature branch
│   ├── feature/leave-approval
│   └── fix/punch-report-night-shift   ← Bug fix branch
│
└── hotfix/critical-login-bug          ← Emergency production fixes
```

**Branch naming:**
- Features: `feature/short-description`
- Bug fixes: `fix/short-description`
- Hotfixes: `hotfix/short-description`

**Commit message format:**
```
feat(attendance): add overtime calculation with 30-min grace period
fix(shifts): handle null LINE in getUserShifts filter
docs(api): update punch_report endpoint documentation
```

---

## Running Tests

Currently the project has no automated test suite. To add tests:

```bash
cd master
npm test   # Runs React Testing Library tests (src/App.test.js)
```

**Manual verification checklist for new features:**
1. Login as Admin → verify full access
2. Login as Employee → verify restricted access
3. Test the new endpoint with valid data
4. Test with missing/invalid data (check 400 responses)
5. Test with DB connection removed (check 500 response)
6. Verify Excel uploads process without errors
7. Check browser console for React errors

---

## Common Errors & Solutions

### `Error: Connection is closed`

The `mssql` connection was closed before the query completed.

**Fix:** Ensure you're using `poolConnection` or reconnecting with `await sql.connect(config)` at the start of each handler. Don't call `await sql.close()` inside handlers unless it's an isolated one-shot request handler.

---

### `Invalid object name 'Mx_StageMaster'`

Usually a case-sensitivity or schema issue. SQL Server on some configurations is case-sensitive.

**Fix:** Verify the exact table name in SQL Server Management Studio. The codebase mixes `Mx_StageMaster` and `MX_STAGEMASTER` — use the exact casing that exists in your DB.

---

### `CORS error in browser` (development only)

The React dev server (port 3000) can't reach the API (port 5000).

**Fix:** Add proxy to `master/package.json`:
```json
{
  "proxy": "http://localhost:5000"
}
```

---

### `ExcelJS: Cannot set headers after they are sent`

Happens when an error occurs after `res.setHeader` is called during Excel export.

**Fix:** Wrap the entire workbook generation in a try-catch and return before calling `workbook.xlsx.write(res)` if any data validation fails.

---

### `iisnode: The iisnode module is not installed`

IIS can't find the iisnode module.

**Fix:** 
1. Download and install iisnode from https://github.com/azure/iisnode/releases
2. Run `%systemroot%\system32\inetsrv\appcmd.exe list module | findstr iisnode` to verify installation
3. Restart IIS: `iisreset`

---

### Attendance Shows Zero Present Even With Punches

**Checklist:**
1. Check `Mx_UserShifts` — the employee must have a shift record for that exact date
2. Check `Mx_ShiftMst` — the `SFTID` must exist
3. Verify `Mx_ATDEventTrn.EDateTime` is within the `±45 min` window of `SFTSTTime`
4. Check `MX_USERMST.UserIDEnbl = 1` — inactive employees are excluded
5. The `SHIFT_ID` in `Mx_UserShifts` must have trailing spaces trimmed (use `RTRIM()` in your test queries)
