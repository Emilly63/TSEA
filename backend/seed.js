const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'tsea_rastreabilidade'
});

db.query("INSERT IGNORE INTO usuarios (nome, codBarras, isAdmin) VALUES ('Emilly Sabrina', '12345', 1)", (err) => {
    if (err) throw err;
    console.log("✅ Usuário Admin inserido!");
});

db.query("INSERT IGNORE INTO ferramentas (nome, codBarras, status) VALUES ('Multímetro Digital', 'F001', 'disponivel')", (err) => {
    if (err) throw err;
    console.log("✅ Ferramenta de teste inserida!");
    process.exit();
});