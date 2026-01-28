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

async function checkColumns() {
  try {
    await sql.connect(config);
    
    const tables = ['MX_USERMST', 'Mx_JobCardWeightage', 'Mx_UserJobCard'];
    
    for (const table of tables) {
      const result = await sql.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${table}'
      `);
      console.log(`Columns in ${table}:`, result.recordset.map(row => row.COLUMN_NAME));
    }
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await sql.close();
  }
}

checkColumns();
