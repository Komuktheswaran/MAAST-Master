require('dotenv').config();
const { getPool } = require('./db');
async function run() {
  const pool = await getPool();
  const result = await pool.request().query("SELECT TOP 10 Stage_name, Stage_Serial FROM Mx_StageMaster ORDER BY Stage_Serial ASC");
  console.log("=== ORDERED BY Stage_Serial ===");
  console.table(result.recordset);
  
  const result2 = await pool.request().query("SELECT TOP 10 Stage_name, Stage_Serial FROM Mx_StageMaster ORDER BY Stage_name ASC");
  console.log("\n=== ORDERED BY Stage_name ===");
  console.table(result2.recordset);

  process.exit(0);
}
run();
