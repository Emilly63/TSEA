const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tsea_rastreabilidade'
});

// LOGIN
app.post('/login', (req, res) => {
    const { codBarras } = req.body;
    db.query("SELECT * FROM usuarios WHERE codBarras = ?", [codBarras], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length > 0) res.json(results[0]);
        else res.status(404).send("Usuário não cadastrado.");
    });
});

// RETIRADA
app.post('/emprestimo/retirada', (req, res) => {
    const { usuarioId, ferramentacod } = req.body;
    db.query("SELECT id, status FROM ferramentas WHERE codigoBarras = ?", [ferramentacod], (err, tool) => {
        if (err || tool.length === 0) return res.status(404).send("Ferramenta não encontrada.");
        if (tool[0].status === 'em_uso') return res.status(400).send("Ferramenta já está em uso.");
        if (tool[0].status === 'manutencao') return res.status(400).send("Ferramenta em MANUTENÇÃO.");

        const toolId = tool[0].id;
        db.query("INSERT INTO emprestimos (usuarioId, ferramentaId, status) VALUES (?, ?, 'ativo')", [usuarioId, toolId], () => {
            db.query("UPDATE ferramentas SET status = 'em_uso' WHERE id = ?", [toolId]);
            res.send("Retirada registrada!");
        });
    });
});

// DEVOLUÇÃO
app.post('/emprestimo/devolucao', (req, res) => {
    const { ferramentacod } = req.body;
    db.query("SELECT id FROM ferramentas WHERE codigoBarras = ?", [ferramentacod], (err, tool) => {
        if (err || tool.length === 0) return res.status(404).send("Ferramenta não encontrada.");
        
        const toolId = tool[0].id;
        db.query("UPDATE ferramentas SET status = 'disponivel' WHERE id = ?", [toolId]);
        db.query("UPDATE emprestimos SET status = 'concluido', dataDevolucao = NOW() WHERE ferramentaId = ? AND status = 'ativo'", [toolId], (err, result) => {
            if (result && result.affectedRows > 0) res.send("Devolução concluída!");
            else res.send("Ferramenta liberada!");
        });
    });
});

// ADMIN: STATUS E MANUTENÇÃO
app.get('/admin/status-ferramentas', (req, res) => {
    const sql = `
        SELECT f.nome, f.codigoBarras, f.status, u.nome as usuario_atual 
        FROM ferramentas f
        LEFT JOIN emprestimos e ON f.id = e.ferramentaId AND e.status = 'ativo'
        LEFT JOIN usuarios u ON e.usuarioId = u.id`;
    db.query(sql, (err, results) => {
        if (err) res.status(500).send(err);
        else res.json(results);
    });
});

app.post('/admin/manutencao', (req, res) => {
    const { codigoBarras, emManutencao } = req.body;
    const novoStatus = emManutencao ? 'manutencao' : 'disponivel';
    db.query("UPDATE ferramentas SET status = ? WHERE codigoBarras = ?", [novoStatus, codigoBarras], (err) => {
        if (err) res.status(500).send(err);
        else res.send("Status atualizado!");
    });
});

app.listen(3001, () => console.log("🚀 Server rodando na 3001"));