const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',     // 你的 MySQL 服务器地址
  user: 'root', // 你的 MySQL 用户名
  password: '202507', // 你的 MySQL 密码
  database: 'finance_data', // 你的数据库名
});

module.exports = pool;
