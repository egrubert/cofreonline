const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'cofre',
    password: '@Cofre2025',
    database: 'cofreonline',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
//mysql -u cofre -p'@Cofre2025'

module.exports = pool;