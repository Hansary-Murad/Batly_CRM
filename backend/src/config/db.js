const { Pool } = require('pg');
require('dotenv').config();

// ✅ Добавляем логирование для отладки
console.log('🔗 Connecting to database...');
console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  client_encoding: 'utf8',
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message);
  console.error('Full error:', err);
});

// ✅ Проверка подключения при старте
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection test failed:', err.message);
  } else {
    console.log('✅ Database time:', res.rows[0].now);
  }
});

module.exports = pool;