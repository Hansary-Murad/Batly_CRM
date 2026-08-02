const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  client_encoding: 'utf8',
});

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error', (err) => console.error('❌ PostgreSQL error:', err.message));

module.exports = pool;