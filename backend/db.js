const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Usuário do seu MySQL
    password: '',      // Senha do seu MySQL (vazio se for XAMPP)
    database: 'tsea_rastreabilidade',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();