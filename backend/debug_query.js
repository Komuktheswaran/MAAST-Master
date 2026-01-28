require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    useUTC: true,
    enableArithAbort: true,
    encrypt: false,
    driver: "msnodesqlv8",
  },
  requestTimeout: 600000, 
};

// Params from user screenshot
const FromDate = '2025-04-01';
const ToDate = '2025-06-30';
const EmployeeId = null; // Unit wise means all

async function runDebug() {
    try {
        await sql.connect(config);
        console.log("Connected to DB");

        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        const request = pool.request();

        request.input("FromDate", sql.Date, FromDate);
        request.input("ToDate", sql.Date, ToDate);

        // 1. Raw Counts
        const countShifts = await pool.request()
            .input("FromDate", sql.Date, FromDate)
            .input("ToDate", sql.Date, ToDate)
            .query(`
                SELECT COUNT(*) as Cnt FROM Mx_UserShifts 
                WHERE Shift_date_from BETWEEN @FromDate AND @ToDate
            `);
        console.log("Rows in Mx_UserShifts for range:", countShifts.recordset[0].Cnt);

        const countSwaps = await pool.request()
             .input("FromDate", sql.Date, FromDate)
             .input("ToDate", sql.Date, ToDate)
             .query(`
                SELECT COUNT(*) as Cnt FROM Mx_Userswap 
                WHERE Shift_date BETWEEN @FromDate AND @ToDate
            `);
        console.log("Rows in Mx_Userswap for range:", countSwaps.recordset[0].Cnt);


        // 2. Run the Main Query (Reduced to CTE part)
        const query = `
        WITH EffectiveShifts AS (
            -- 1. Swaps (Highest Priority)
            SELECT 
                Swap_userid AS USERID,
                Shift_date AS [DATE],
                Shift_id AS SHIFTNAME,
                stage_id,
                Line_name AS LINE,
                1 AS Priority
            FROM Mx_Userswap SW WITH (NOLOCK)
            WHERE Shift_date BETWEEN @FromDate AND @ToDate
            
            UNION ALL
        
            -- 2. Regular Shifts (If no swap)
            SELECT 
                USERID,
                Shift_date_from AS [DATE],
                SHIFT_ID AS SHIFTNAME,
                stage_id,
                LINE,
                2 AS Priority
            FROM Mx_UserShifts S WITH (NOLOCK)
            WHERE Shift_date_from BETWEEN @FromDate AND @ToDate
              AND NOT EXISTS (
                  SELECT 1 FROM Mx_Userswap SW WITH (NOLOCK)
                  WHERE SW.Swap_userid = S.USERID 
                    AND SW.Shift_date = S.Shift_date_from
              )
        )
        SELECT * FROM EffectiveShifts ORDER BY [DATE]
        `;

        const result = await request.query(query);
        console.log(`EffectiveShifts returned ${result.recordset.length} rows.`);

        // Analyze unique users
        const uniqueUsers = new Set(result.recordset.map(r => r.USERID));
        console.log(`Unique Users found: ${uniqueUsers.size}`);
        console.log(`User IDs:`, Array.from(uniqueUsers).slice(0, 10));

        process.exit(0);

    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

runDebug();
