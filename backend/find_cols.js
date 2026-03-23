require('dotenv').config();
const { getPool } = require('./db');
async function run() {
  const pool = await getPool();
  const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Mx_StageMaster'");
  console.log(result.recordset.map(r => r.COLUMN_NAME).join(', '));
  process.exit(0);
}
run();
