import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  const [etapa, setEtapa] = useState('login'); // login, escolha, acao
  const [modo, setModo] = useState(''); // retirada ou devolucao
  const [codigo, setCodigo] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [mensagem, setMensagem] = useState("Aguardando crachá...");
  const [processando, setProcessando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [etapa, modo]);

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

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
        console.error("Erro:", error);
      } finally {
        setCodigo("");
        setTimeout(() => {
          setProcessando(false);
          inputRef.current?.focus();
        }, 800);
      }
    }
  };

  const realizarLogin = async (codBarras) => {
    try {
      const res = await axios.post('http://localhost:3001/login', { codBarras });
      setUsuario(res.data);
      setEtapa('escolha');
      setMensagem(`Olá, ${res.data.nome}! O que deseja fazer?`);
    } catch (err) {
      setMensagem("❌ Crachá não encontrado.");
    }
  };

  const processarAcao = async (ferramentacod) => {
    const url = modo === 'retirada' ? '/emprestimo/retirada' : '/emprestimo/devolucao';
    const dados = modo === 'retirada' 
      ? { usuarioId: usuario.id, ferramentacod } 
      : { ferramentacod };

    try {
      const res = await axios.post(`http://localhost:3001${url}`, dados);
      setMensagem(`✅ ${res.data}`);
      
      // AGORA: Em vez de deslogar, apenas limpa a mensagem de sucesso após 3s
      // e permite que o usuário continue bipando na mesma tela de ação.
      setTimeout(() => {
        setMensagem(modo === 'retirada' ? "Bipe a PRÓXIMA FERRAMENTA (Retirada)" : "Bipe a PRÓXIMA FERRAMENTA (Devolução)");
      }, 3000);

    } catch (err) {
      setMensagem("❌ Erro na operação. Verifique o item.");
    }
  };

  // Função para voltar para a tela de botões sem deslogar
  const voltarParaEscolha = () => {
    setEtapa('escolha');
    setModo('');
    setMensagem(`Olá, ${usuario.nome}! O que deseja fazer?`);
  };

  // Função para sair da conta completamente
  const encerrarSessao = () => {
    setUsuario(null);
    setEtapa('login');
    setModo('');
    setMensagem("Aguardando crachá...");
  };

  return (
    <div style={styles.container}>
      <img src="/logo-tsea.png" style={styles.logo} alt="logo" />
      <h1 style={styles.title}>TSEA Rastreabilidade</h1>
      
      <div style={styles.card}>
        <h2 style={{ color: processando ? '#999' : '#002d62', minHeight: '60px' }}>{mensagem}</h2>

        {etapa === 'escolha' && (
          <div style={styles.btnContainer}>
            <button 
              onClick={() => { setModo('retirada'); setEtapa('acao'); setMensagem("Bipe a FERRAMENTA (Retirada)"); }} 
              style={{...styles.button, backgroundColor: '#0055ff'}}
            >
              RETIRAR FERRAMENTAS
            </button>
            <button 
              onClick={() => { setModo('devolucao'); setEtapa('acao'); setMensagem("Bipe a FERRAMENTA (Devolução)"); }} 
              style={{...styles.button, backgroundColor: '#28a745'}}
            >
              DEVOLVER FERRAMENTAS
            </button>
            <button onClick={encerrarSessao} style={styles.btnSair}>ENCERRAR SESSÃO</button>
          </div>
        )}

        {etapa === 'acao' && (
          <div>
            <input 
              ref={inputRef}
              value={codigo} 
              onChange={(e) => setCodigo(e.target.value)} 
              onKeyDown={handleKeyPress} 
              placeholder="Bipe o item agora..." 
              style={{...styles.input, borderColor: processando ? '#ccc' : '#0055ff'}}
              disabled={processando}
              autoComplete="off"
            />
            <div style={{ marginTop: '20px' }}>
              <button onClick={voltarParaEscolha} style={styles.btnVoltar}>← Voltar para Opções</button>
            </div>
          </div>
        )}

        {etapa === 'login' && (
          <input 
            ref={inputRef}
            value={codigo} 
            onChange={(e) => setCodigo(e.target.value)} 
            onKeyDown={handleKeyPress} 
            placeholder="Passe seu crachá..." 
            style={styles.input}
            disabled={processando}
            autoComplete="off"
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', marginTop: '50px', fontFamily: 'Arial', backgroundColor: '#f0f2f5', minHeight: '100vh' },
  logo: { width: '180px', marginBottom: '10px' },
  title: { color: '#002d62', marginBottom: '30px' },
  card: { padding: '40px', display: 'inline-block', borderRadius: '15px', backgroundColor: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', minWidth: '450px' },
  input: { padding: '15px', fontSize: '20px', width: '350px', border: '2px solid', textAlign: 'center', borderRadius: '10px', outline: 'none' },
  button: { padding: '20px', fontSize: '18px', color: 'white', border: 'none', borderRadius: '8px', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '280px' },
  btnContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btnVoltar: { backgroundColor: 'transparent', border: 'none', color: '#0055ff', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  btnSair: { marginTop: '20px', backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }
};

export default App;