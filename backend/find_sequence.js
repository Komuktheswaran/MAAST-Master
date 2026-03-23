require('dotenv').config();
const { getPool, sql } = require('./db');
async function run() {
  const pool = await getPool();
  const result = await pool.request().query("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME LIKE '%sequence%' OR COLUMN_NAME LIKE '%seq%' OR COLUMN_NAME LIKE '%stage%'");
  console.log(result.recordset.map(r => r.TABLE_NAME + '.' + r.COLUMN_NAME).join('\\n'));
  process.exit(0);
}
run();
