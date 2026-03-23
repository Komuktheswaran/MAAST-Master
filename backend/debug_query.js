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


        // 2. Run the Main Query to find columns
        const query = `SELECT Stage_name, Stage_Serial FROM Mx_StageMaster ORDER BY Stage_name`;
        const result = await request.query(query);
        console.log("Results:");
        result.recordset.forEach(r => console.log(`${r.Stage_name.substring(0,25)}: ${r.Stage_Serial}`));

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
