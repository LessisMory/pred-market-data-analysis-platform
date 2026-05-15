/**
 * Programmatic DB initializer — creates all tables if they don't exist.
 * Usage:  node db/init.js
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

const SQL_DIR = __dirname;

const FILES = [
  '00_extensions.sql',
  '01_users.sql',
  '02_activity.sql',
  '03_subscriptions.sql',
  '04_admin.sql',
  '05_events.sql',
  '06_metrics.sql',
  '07_roles.sql',
];

async function init() {
  const client = await pool.connect();
  try {
    for (const file of FILES) {
      const sql = fs.readFileSync(path.join(SQL_DIR, file), 'utf8');
      console.log(`Running ${file}...`);
      await client.query(sql);
    }
    console.log('Database initialized successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch((err) => {
  console.error('DB init failed:', err);
  process.exit(1);
});
