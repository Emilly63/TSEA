import React, { useState, useEffect } from 'react';

function AdminDashboard({ voltar }) {
    const [relatorio, setRelatorio] = useState([]);

    useEffect(() => {
        fetch('http://localhost:3001/admin/rastreabilidade')
            .then(res => res.json())
            .then(data => setRelatorio(data));
    }, []);

    return (
        <div className="container admin-page">
            <header>
                <h2>RASTREABILIDADE EM TEMPO REAL</h2>
                <button onClick={voltar}>Voltar ao Scanner</button>
            </header>
            <table>
                <thead>
                    <tr>
                        <th>Funcionário</th>
                        <th>Ferramenta</th>
                        <th>Cód. Barras</th>
                        <th>Data Retirada</th>
                    </tr>
                </thead>
                <tbody>
                    {relatorio.map(row => (
                        <tr key={row.id}>
                            <td>{row.funcionario}</td>
                            <td>{row.ferramenta}</td>
                            <td>{row.codigoBarras}</td>
                            <td>{row.data}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminDashboard;