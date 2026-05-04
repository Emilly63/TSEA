import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Movi o objeto styles para o topo para evitar erros de referência (hoisting)
const styles = {
  container: { textAlign: 'center', padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Arial' },
  logo: { width: '160px', marginBottom: '10px' },
  title: { color: '#002d62' },
  card: { padding: '30px', backgroundColor: 'white', borderRadius: '15px', display: 'inline-block', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', minWidth: '600px' },
  input: { padding: '15px', fontSize: '20px', width: '350px', borderRadius: '10px', border: '2px solid #002d62', textAlign: 'center' },
  button: { padding: '18px', color: 'white', border: 'none', borderRadius: '8px', margin: '8px', cursor: 'pointer', width: '320px', fontWeight: 'bold', fontSize: '16px' },
  column: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btnSair: { marginTop: '20px', border: '1px solid red', color: 'red', background: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' },
  btnVoltar: { marginTop: '15px', color: '#0055ff', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  trHeader: { borderBottom: '2px solid #002d62', textAlign: 'left' },
  tr: { borderBottom: '1px solid #eee', textAlign: 'left' },
  btnMini: { padding: '6px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px' },
  buttonGray: { marginTop: '20px', padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px' }
};

function App() {
  const [etapa, setEtapa] = useState('login'); 
  const [modo, setModo] = useState(''); 
  const [codigo, setCodigo] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [mensagem, setMensagem] = useState("Aguardando crachá...");
  const [processando, setProcessando] = useState(false);
  const [relatorio, setRelatorio] = useState([]);
  const inputRef = useRef(null);

  // Mantém o foco no input para o scanner sempre funcionar
  useEffect(() => { 
    if (etapa === 'login' || etapa === 'acao') {
      inputRef.current?.focus(); 
    }
  }, [etapa, modo]);

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const valorLimpo = codigo.trim(); 

      if (!valorLimpo || processando) { setCodigo(""); return; }
      setProcessando(true);

      try {
        if (etapa === 'login') {
          const res = await axios.post('http://localhost:3001/login', { codBarras: valorLimpo });
          setUsuario(res.data);
          setEtapa('escolha');
          setMensagem(`Olá, ${res.data.nome}!`);
        } else if (etapa === 'acao') {
          const url = modo === 'retirada' ? '/emprestimo/retirada' : '/emprestimo/devolucao';
          const res = await axios.post(`http://localhost:3001${url}`, { 
            usuarioId: usuario.id, 
            ferramentacod: valorLimpo 
          });
          setMensagem(`✅ ${res.data}`);
          setTimeout(() => setMensagem(modo === 'retirada' ? "Bipe a PRÓXIMA FERRAMENTA" : "Bipe o PRÓXIMO RETORNO"), 2500);
        }
      } catch (err) {
        setMensagem(`❌ ${err.response?.data || "Erro na operação"}`);
      } finally {
        setCodigo("");
        setTimeout(() => { 
          setProcessando(false); 
          inputRef.current?.focus(); 
        }, 800);
      }
    }
  };

  const carregarRelatorio = async () => {
    try {
      const res = await axios.get('http://localhost:3001/admin/status-ferramentas');
      setRelatorio(res.data);
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
    }
  };

  const toggleManutencao = async (codigoBarras, statusAtual) => {
    try {
      await axios.post('http://localhost:3001/admin/manutencao', { 
        codigoBarras, emManutencao: statusAtual !== 'manutencao' 
      });
      carregarRelatorio();
    } catch (err) {
      alert("Erro ao alterar status de manutenção.");
    }
  };

  const formatarData = (data) => {
    if (!data) return "";
    return new Date(data).toLocaleString('pt-BR');
  };

  return (
    <div style={styles.container}>
      <img src="/logo-tsea.png" style={styles.logo} alt="TSEA" />
      <h1 style={styles.title}>Sistema de Rastreabilidade</h1>
      
      <div style={styles.card}>
        <h2 style={{ color: processando ? '#999' : '#002d62', minHeight: '60px' }}>{mensagem}</h2>
        
        {/* TELA DE SCANNER */}
        {(etapa === 'login' || etapa === 'acao') && (
          <div style={styles.column}>
            <input 
              ref={inputRef} 
              value={codigo} 
              onChange={(e) => setCodigo(e.target.value)} 
              onKeyDown={handleKeyPress} 
              placeholder="Aguardando scanner..." 
              style={styles.input} 
              autoComplete="off" 
            />
            {etapa === 'acao' && (
              <button onClick={() => setEtapa('escolha')} style={styles.btnVoltar}>← Voltar</button>
            )}
          </div>
        )}

        {/* MENU PRINCIPAL */}
        {etapa === 'escolha' && (
          <div style={styles.column}>
            <button onClick={() => { setModo('retirada'); setEtapa('acao'); setMensagem("Modo RETIRADA: Bipe o item"); }} style={{...styles.button, backgroundColor: '#0055ff'}}>RETIRAR FERRAMENTAS</button>
            <button onClick={() => { setModo('devolucao'); setEtapa('acao'); setMensagem("Modo DEVOLUÇÃO: Bipe o item"); }} style={{...styles.button, backgroundColor: '#28a745'}}>DEVOLVER FERRAMENTAS</button>
            {usuario?.tipo === 'admin' && (
              <button onClick={() => { setEtapa('admin'); carregarRelatorio(); }} style={{...styles.button, backgroundColor: '#6f42c1'}}>📊 PAINEL ADMINISTRADOR</button>
            )}
            <button onClick={() => window.location.reload()} style={styles.btnSair}>ENCERRAR SESSÃO</button>
          </div>
        )}

        {/* PAINEL ADMINISTRATIVO */}
        {etapa === 'admin' && (
          <div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHeader}>
                  <th>Ferramenta</th>
                  <th>Status</th>
                  <th>Com quem? / Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.map((r, i) => (
                  <tr key={i} style={styles.tr}>
                    <td>{r.nome}</td>
                    <td style={{ 
                      fontWeight: 'bold', 
                      color: r.status === 'disponivel' ? 'green' : r.status === 'manutencao' ? 'orange' : 'red' 
                    }}>
                      {r.status.toUpperCase()}
                    </td>
                    <td>
                      {r.status === 'em_uso' && r.usuario_atual 
                        ? `${r.usuario_atual} (${formatarData(r.dataRetirada)})` 
                        : '--'}
                    </td>
                    <td>
                      <button onClick={() => toggleManutencao(r.codigoBarras, r.status)} style={styles.btnMini}>
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

export default App;