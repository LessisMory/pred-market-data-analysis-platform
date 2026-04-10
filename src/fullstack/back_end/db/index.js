const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_DSN || 'postgresql://postgres:postgres@localhost:5432/postgres',
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
