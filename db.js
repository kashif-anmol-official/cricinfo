const mysql = require('mysql2/promise');

const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cricinfo',
  port: Number(process.env.DB_PORT || 3306),
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };
