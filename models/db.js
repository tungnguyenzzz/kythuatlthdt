const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cafe_order',
  password: '2607',
  port: 5432,
});

module.exports = pool;
