const mysql = require('mysql');
const util = require('util');

var pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    port:3306,
    database: process.env.DATABASE_NAME,
});

pool.query = util.promisify(pool.query);
module.exports = pool;