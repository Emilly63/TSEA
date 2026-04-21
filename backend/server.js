const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ========================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ========================================
const db = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'tsea_rastreabilidade'
});

// Teste de conexão
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Erro ao conectar no MySQL:", err.message);
    } else {
        console.log("✅ Conectado ao banco de dados tsea_rastreabilidade");
        connection.release();
    }
});

// ========================================
// ROTAS DO SISTEMA
// ========================================

// 1. Rota de Login (Lê o código do crachá)
app.post('/login', (req, res) => {
    const { codBarras } = req.body;
    const sql = "SELECT * FROM usuarios WHERE codBarras = ?";
    
    db.query(sql, [codBarras], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).send("Usuário não encontrado.");
        }
    });
});

// 2. Rota de Retirada (Pega a ferramenta)
app.post('/emprestimo/retirada', (req, res) => {
    const { usuarioId, ferramentacod } = req.body;

    // Busca a ferramenta pelo código de barras
    db.query("SELECT id, status FROM ferramentas WHERE codigoBarras = ?", [ferramentacod], (err, tool) => {
        if (err) return res.status(500).send(err);
        
        if (tool.length > 0) {
            if (tool[0].status === 'em_uso') {
                return res.status(400).send("Esta ferramenta já está em uso.");
            }

            const toolId = tool[0].id;
            // Registra o empréstimo
            const sqlEmprestimo = "INSERT INTO emprestimos (usuarioId, ferramentaId, dataRetirada, status) VALUES (?, ?, NOW(), 'ativo')";
            db.query(sqlEmprestimo, [usuarioId, toolId], (err) => {
                if (err) return res.status(500).send(err);
                
                // Atualiza status da ferramenta
                db.query("UPDATE ferramentas SET status = 'em_uso' WHERE id = ?", [toolId]);
                res.send("Retirada registrada com sucesso!");
            });
        } else {
            res.status(404).send("Ferramenta não cadastrada.");
        }
    });
});

// 3. Rota de Devolução (Entrega a ferramenta)
app.post('/emprestimo/devolucao', (req, res) => {
    const { ferramentacod } = req.body;

    // Busca a ferramenta pelo código de barras
    db.query("SELECT id FROM ferramentas WHERE codigoBarras = ?", [ferramentacod], (err, tool) => {
        if (err) return res.status(500).send(err);
        
        if (tool.length > 0) {
            const toolId = tool[0].id;

            // Atualiza o status da ferramenta para disponível
            db.query("UPDATE ferramentas SET status = 'disponivel' WHERE id = ?", [toolId], (err) => {
                if (err) return res.status(500).send(err);

                // Finaliza o empréstimo ativo no histórico
                const sqlUpdateEmprestimo = `
                    UPDATE emprestimos 
                    SET status = 'concluido', dataDevolucao = NOW() 
                    WHERE ferramentaId = ? AND status = 'ativo'
                `;
                
                db.query(sqlUpdateEmprestimo, [toolId], (err, result) => {
                    if (err) return res.status(500).send(err);
                    
                    if (result.affectedRows > 0) {
                        res.send("Devolução concluída com sucesso!");
                    } else {
                        res.send("Ferramenta liberada (não havia empréstimo em aberto).");
                    }
                });
            });
        } else {
            res.status(404).send("Ferramenta não encontrada.");
        }
    });
});

// 4. Rota de Relatório (Administrador)
app.get('/admin/rastreabilidade', (req, res) => {
    const sql = `
        SELECT e.id, u.nome as funcionario, f.nome as ferramenta, f.codigoBarras,
        DATE_FORMAT(e.dataRetirada, '%d/%m/%Y %H:%i') as data 
        FROM emprestimos e 
        JOIN usuarios u ON e.usuarioId = u.id 
        JOIN ferramentas f ON e.ferramentaId = f.id 
        WHERE e.status = 'ativo'`;
        
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// ========================================
// INICIALIZAÇÃO
// ========================================
const PORTA = 3001;
app.listen(PORTA, () => {
    console.log("========================================");
    console.log(`🚀 BACKEND TSEA RODANDO NA PORTA ${PORTA}`);
    console.log("========================================");
});