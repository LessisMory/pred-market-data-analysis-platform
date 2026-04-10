const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

const SQL_FILES = [
  '00_extensions.sql',
  '01_users.sql',
  '02_activity.sql',
  '03_subscriptions.sql',
  '04_admin.sql',
  '05_events.sql',
  '06_metrics.sql',
  '07_roles.sql',
];

async function migrate() {
  try {
    for (const file of SQL_FILES) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await pool.query(sql);
      console.log(`  ✓ ${file}`);
    }
    console.log('Database migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
