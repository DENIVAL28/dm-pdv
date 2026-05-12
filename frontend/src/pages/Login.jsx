import React from 'react';
import { LockKeyhole, Package, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import { login } from '../services/authService.js';
import { saveSession } from '../services/session.js';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@dmsistemas.com');
  const [senha, setSenha] = useState('123456');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setErro('');

      const data = await login({ email, senha });
      saveSession(data);
      navigate('/', { replace: true });
    } catch (error) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-panel">
          <div className="login-panel-top">
            <div className="brand large">
              <div className="brand-mark">DM</div>
              <div>
                <strong>DM PDV</strong>
                <span>DM Sistemas</span>
              </div>
            </div>

            <span className="sidebar-chip">Acesso local</span>
          </div>

          <div className="login-copy">
            <h1>Acesso ao caixa e a retaguarda.</h1>
            <p>Entre para vender, consultar estoque, cadastrar itens e acompanhar o movimento do dia.</p>
          </div>

          <div className="login-board">
            <div className="login-board-copy">
              <span className="overview-label">Fluxo principal</span>
              <strong>Venda, baixa de estoque e consulta de resultado no mesmo ambiente.</strong>
            </div>

            <div className="login-board-grid">
              <div className="info-tile dark">
                <Receipt size={18} />
                <div>
                  <span>Caixa</span>
                  <strong>Busca de produto, conferencia e fechamento</strong>
                </div>
              </div>

              <div className="info-tile dark">
                <Package size={18} />
                <div>
                  <span>Cadastro</span>
                  <strong>Produto, cliente e estoque no mesmo painel</strong>
                </div>
              </div>

              <div className="info-tile dark">
                <LockKeyhole size={18} />
                <div>
                  <span>Controle</span>
                  <strong>Relatorios e indicadores de operacao</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <form className="login-card" onSubmit={entrar}>
          <div className="panel-title">
            <h2>Entrar</h2>
            <p>Use o acesso inicial para entrar no ambiente local.</p>
          </div>

          {erro ? <FeedbackBanner tone="error">{erro}</FeedbackBanner> : null}

          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          <div className="helper-card">
            <span>Acesso inicial</span>
            <strong>admin@dmsistemas.com</strong>
            <small>Senha: 123456</small>
          </div>

          <Button type="submit" className="full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
