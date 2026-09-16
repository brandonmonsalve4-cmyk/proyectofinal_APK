const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let dbInstance = null;
let mysqlPool = null;

if (DB_TYPE === 'mysql') {
  const mysql = require('mysql2/promise');
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gym_sync_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00'
  });
  console.log(`[Database] Configured for MySQL (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`);
} else {
  const Database = require('better-sqlite3');
  const dbPath = path.resolve(__dirname, '../../gym_sync_server.db');
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  console.log(`[Database] Configured for SQLite (${dbPath})`);
}

/**
 * Execute a query that returns multiple rows
 */
async function query(sql, params = []) {
  if (DB_TYPE === 'mysql') {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows;
  } else {
    const stmt = dbInstance.prepare(sql);
    return stmt.all(...params);
  }
}

/**
 * Execute a query that returns a single row
 */
async function queryOne(sql, params = []) {
  if (DB_TYPE === 'mysql') {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } else {
    const stmt = dbInstance.prepare(sql);
    return stmt.get(...params) || null;
  }
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 */
async function execute(sql, params = []) {
  if (DB_TYPE === 'mysql') {
    const [result] = await mysqlPool.execute(sql, params);
    return { changes: result.affectedRows, insertId: result.insertId };
  } else {
    const stmt = dbInstance.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  }
}

module.exports = {
  DB_TYPE,
  query,
  queryOne,
  execute
};
