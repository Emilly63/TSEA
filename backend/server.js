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
    database: 'tsea_rastreabilidade',
    waitForConnections: true,
    connectionLimit: 10
});

// LOGIN
app.post('/login', (req, res) => {
    const { codBarras } = req.body;
    db.query("SELECT * FROM usuarios WHERE codBarras = ?", [codBarras.trim()], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length > 0) res.json(results[0]);
        else res.status(404).send("Usuário não cadastrado.");
    });
});

// RETIRADA - CORRIGIDA PARA IDENTIFICAÇÃO ÚNICA
app.post('/emprestimo/retirada', (req, res) => {
    const { usuarioId, ferramentacod } = req.body;
    
    db.query("SELECT id FROM ferramentas WHERE codigoBarras = ?", [ferramentacod], (err, result) => {
        if (err || result.length === 0) return res.status(404).send("Ferramenta não achada");
        const toolId = result[0].id;

        // COMANDO 1: Cria a data de retirada no histórico
        db.query("INSERT INTO emprestimos (usuarioId, ferramentaId, status) VALUES (?, ?, 'ativo')", [usuarioId, toolId], (err2) => {
            if (err2) return res.status(500).send("Erro ao gravar histórico");

            // COMANDO 2: Muda o status para aparecer 'EM USO' no painel
            db.query("UPDATE ferramentas SET status = 'em_uso' WHERE id = ?", [toolId], () => {
                res.send("Retirada gravada com sucesso!");
            });
        });
    });
});

// DEVOLUÇÃO - CORRIGIDA PARA LIMPAR STATUS "PRESOS"
app.post('/emprestimo/devolucao', (req, res) => {
    const { ferramentacod } = req.body;
    const code = ferramentacod.trim();

    // 1. Localiza a ferramenta pelo código
    db.query("SELECT id FROM ferramentas WHERE codigoBarras = ?", [code], (err, tool) => {
        if (err || tool.length === 0) return res.status(404).send("Ferramenta não encontrada.");
        
        const toolId = tool[0].id;

        // 2. Força o status para disponível
        db.query("UPDATE ferramentas SET status = 'disponivel' WHERE id = ?", [toolId], (err2) => {
            if (err2) return res.status(500).send("Erro ao liberar ferramenta.");

            // 3. Finaliza TODOS os empréstimos ativos desta ferramenta (evita que o nome do usuário fique preso)
            db.query("UPDATE emprestimos SET status = 'concluido', dataDevolucao = NOW() WHERE ferramentaId = ? AND status = 'ativo'", 
            [toolId], (err3, result) => {
                if (err3) return res.status(500).send("Erro ao fechar histórico.");
                
                if (result.affectedRows > 0) {
                    res.send("Devolução concluída com sucesso!");
                } else {
                    res.send("Ferramenta liberada (limpeza de status efetuada).");
                }
            });
        });
    });
});

// PAINEL ADMIN - QUERY DE ALTA PRECISÃO
app.get('/admin/status-ferramentas', (req, res) => {
    const sql = `
        SELECT 
            f.nome, 
            f.codigoBarras, 
            f.status, 
            u.nome AS usuario_atual,
            e.dataRetirada
        FROM ferramentas f
        LEFT JOIN emprestimos e ON f.id = e.ferramentaId AND e.status = 'ativo'
        LEFT JOIN usuarios u ON e.usuarioId = u.id
        ORDER BY f.nome ASC`;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});
// MANUTENÇÃO
app.post('/admin/manutencao', (req, res) => {
    const { codigoBarras, emManutencao } = req.body;
    const novoStatus = emManutencao ? 'manutencao' : 'disponivel';
    db.query("UPDATE ferramentas SET status = ? WHERE codigoBarras = ?", [novoStatus, codigoBarras.trim()], (err) => {
        if (err) res.status(500).send(err);
        else res.send("Status de manutenção atualizado!");
    });
});

app.listen(3001, () => {
    console.log("🚀 Servidor TSEA rodando na porta 3001");
});