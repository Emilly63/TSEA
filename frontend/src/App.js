import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  // ESTADOS DO SISTEMA
  const [etapa, setEtapa] = useState('login'); // login, escolha, acao, admin
  const [modo, setModo] = useState(''); // retirada ou devolucao
  const [codigo, setCodigo] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [mensagem, setMensagem] = useState("Aguardando crachá...");
  const [processando, setProcessando] = useState(false);
  const [relatorio, setRelatorio] = useState([]);
  const inputRef = useRef(null);

  // MANTÉM O FOCO NO INPUT AUTOMATICAMENTE
  useEffect(() => {
    inputRef.current?.focus();
  }, [etapa, modo]);

  // FUNÇÃO QUE CAPTURA O SCANNER
  const handleKeyPress = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      // LIMPEZA CRÍTICA: Remove o "e" e qualquer outra letra, deixando só números
      const valorLimpo = codigo.replace(/\D/g, ''); 

      if (!valorLimpo || processando) {
        setCodigo(""); 
        return;
      }

      setProcessando(true);

      try {
        if (etapa === 'login') {
          await realizarLogin(valorLimpo);
        } else if (etapa === 'acao') {
          await processarAcao(valorLimpo);
        }
      } catch (error) {
        console.error("Erro no processamento:", error);
      } finally {
        setCodigo("");
        // Trava de segurança de 800ms para evitar disparos duplicados do leitor
        setTimeout(() => {
          setProcessando(false);
          inputRef.current?.focus();
        }, 800);
      }
    }
  };

  // LOGICA DE LOGIN
  const realizarLogin = async (codBarras) => {
    try {
      const res = await axios.post('http://localhost:3001/login', { codBarras });
      setUsuario(res.data);
      setEtapa('escolha');
      setMensagem(`Olá, ${res.data.nome}! O que deseja fazer?`);
    } catch (err) {
      setMensagem("❌ Crachá não encontrado no sistema.");
    }
  };

  // LOGICA DE RETIRADA/DEVOLUÇÃO (FLUXO CONTÍNUO)
  const processarAcao = async (ferramentacod) => {
    const url = modo === 'retirada' ? '/emprestimo/retirada' : '/emprestimo/devolucao';
    try {
      const res = await axios.post(`http://localhost:3001${url}`, { 
        usuarioId: usuario.id, 
        ferramentacod 
      });
      setMensagem(`✅ ${res.data}`);
      
      // Limpa a mensagem de sucesso após 2.5 segundos para o próximo bipe
      setTimeout(() => {
        setMensagem(modo === 'retirada' ? "Bipe a PRÓXIMA FERRAMENTA" : "Bipe o PRÓXIMO RETORNO");
      }, 2500);

    } catch (err) {
      // Exibe erro específico (Ex: "Item em Manutenção")
      setMensagem(`❌ ${err.response?.data || "Erro na operação"}`);
    }
  };

  // FUNÇÕES DE ADMIN
  const carregarRelatorio = async () => {
    try {
      const res = await axios.get('http://localhost:3001/admin/status-ferramentas');
      setRelatorio(res.data);
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
    }
  };

  const toggleManutencao = async (codigoBarras, statusAtual) => {
    const emManutencao = statusAtual !== 'manutencao';
    try {
      await axios.post('http://localhost:3001/admin/manutencao', { codigoBarras, emManutencao });
      carregarRelatorio(); // Atualiza a lista após a mudança
    } catch (err) {
      alert("Erro ao alterar status de manutenção");
    }
  };

  return (
    <div style={styles.container}>
      <img src="/logo-tsea.png" style={styles.logo} alt="TSEA" />
      <h1 style={styles.title}>Sistema de Rastreabilidade</h1>
      
      <div style={styles.card}>
        <h2 style={{ color: processando ? '#999' : '#002d62', minHeight: '60px' }}>{mensagem}</h2>

        {/* TELA DE LOGIN */}
        {etapa === 'login' && (
          <input 
            ref={inputRef}
            value={codigo} 
            onChange={(e) => setCodigo(e.target.value)} 
            onKeyDown={handleKeyPress} 
            placeholder="Passe o crachá aqui..." 
            style={styles.input}
            autoComplete="off"
          />
        )}

        {/* MENU DE ESCOLHA */}
        {etapa === 'escolha' && (
          <div style={styles.column}>
            <button 
              onClick={() => { setModo('retirada'); setEtapa('acao'); setMensagem("Modo RETIRADA: Bipe o item"); }} 
              style={{...styles.button, backgroundColor: '#0055ff'}}
            >
              RETIRAR FERRAMENTAS
            </button>
            <button 
              onClick={() => { setModo('devolucao'); setEtapa('acao'); setMensagem("Modo DEVOLUÇÃO: Bipe o item"); }} 
              style={{...styles.button, backgroundColor: '#28a745'}}
            >
              DEVOLVER FERRAMENTAS
            </button>
            
            {usuario?.tipo === 'admin' && (
              <button 
                onClick={() => { setEtapa('admin'); carregarRelatorio(); }} 
                style={{...styles.button, backgroundColor: '#6f42c1'}}
              >
                📊 PAINEL ADMINISTRADOR
              </button>
            )}
            
            <button 
              onClick={() => { setUsuario(null); setEtapa('login'); setMensagem("Aguardando crachá..."); }} 
              style={styles.btnSair}
            >
              ENCERRAR SESSÃO
            </button>
          </div>
        )}

        {/* TELA DE AÇÃO (BIPAR ITENS) */}
        {etapa === 'acao' && (
          <div style={styles.column}>
            <input 
              ref={inputRef}
              value={codigo} 
              onChange={(e) => setCodigo(e.target.value)} 
              onKeyDown={handleKeyPress} 
              placeholder="Aguardando scanner item..." 
              style={{...styles.input, borderColor: processando ? '#ccc' : '#0055ff'}}
              disabled={processando}
              autoComplete="off"
            />
            <button onClick={() => setEtapa('escolha')} style={styles.btnLink}>← Voltar para Opções</button>
          </div>
        )}

        {/* TELA ADMIN */}
        {etapa === 'admin' && (
          <div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Ferramenta</th>
                  <th>Status</th>
                  <th>Com quem?</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.map((r, i) => (
                  <tr key={i} style={styles.tr}>
                    <td>{r.nome}</td>
                    <td style={{ fontWeight: 'bold', color: r.status === 'manutencao' ? 'orange' : r.status === 'em_uso' ? 'red' : 'green' }}>
                      {r.status.toUpperCase()}
                    </td>
                    <td>{r.usuario_atual || '--'}</td>
                    <td>
                      <button 
                        disabled={r.status === 'em_uso'}
                        onClick={() => toggleManutencao(r.codigoBarras, r.status)}
                        style={{...styles.btnMini, backgroundColor: r.status === 'manutencao' ? '#28a745' : '#ffc107'}}
                      >
                        {r.status === 'manutencao' ? 'Ativar' : 'Manutenção'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setEtapa('escolha')} style={styles.buttonGray}>Sair do Painel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ESTILIZAÇÃO CSS-IN-JS
const styles = {
  container: { textAlign: 'center', padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Arial' },
  logo: { width: '160px', marginBottom: '10px' },
  title: { color: '#002d62', marginBottom: '30px' },
  card: { padding: '30px', backgroundColor: 'white', borderRadius: '15px', display: 'inline-block', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', minWidth: '550px' },
  input: { padding: '15px', fontSize: '20px', width: '350px', border: '2px solid', textAlign: 'center', borderRadius: '10px', outline: 'none' },
  button: { padding: '18px', color: 'white', border: 'none', borderRadius: '8px', margin: '8px', cursor: 'pointer', fontWeight: 'bold', width: '320px', fontSize: '16px' },
  buttonGray: { padding: '10px 20px', backgroundColor: '#666', color: 'white', border: 'none', borderRadius: '5px', marginTop: '20px', cursor: 'pointer' },
  column: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btnSair: { marginTop: '20px', background: 'none', border: '1px solid #dc3545', color: '#dc3545', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
  btnLink: { background: 'none', border: 'none', color: '#0055ff', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', textAlign: 'left' },
  tr: { borderBottom: '1px solid #eee' },
  btnMini: { padding: '6px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#000' }
};

export default App;