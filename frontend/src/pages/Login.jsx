import React, { useState } from 'react';
import { LockKeyhole, Package, Receipt, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import { login } from '../services/authService.js';
import { saveSession } from '../services/session.js';

const HIGHLIGHTS = [
  {
    icon: Receipt,
    label: 'Atendimento',
    text: 'Leitura, carrinho, conferência e fechamento da venda em um fluxo só.',
  },
  {
    icon: Package,
    label: 'Cadastro',
    text: 'Produtos, clientes e estoque organizados para operação diária.',
  },
  {
    icon: ShieldCheck,
    label: 'Controle',
    text: 'Resumo do dia, relatórios e acompanhamento do movimento da loja.',
  },
];

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
      navigate('/app', { replace: true });
    } catch (error) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page auth-page">
      <div className="auth-shell">
        <section className="auth-panel">
          <div className="auth-panel-top">
            <div className="brand large">
              <div className="brand-mark">DM</div>
              <div>
                <strong>DM PDV</strong>
                <span>DM Sistemas</span>
              </div>
            </div>

            <Link to="/" className="auth-backlink">
              Voltar para a apresentação
            </Link>
          </div>

          <div className="auth-copy">
            <span className="overview-label">Acesso ao sistema</span>
            <h1>Entrar para operar a loja.</h1>
            <p>
              Use o acesso local para abrir o caixa, consultar produtos, fechar
              vendas e acompanhar o movimento do dia.
            </p>
          </div>

          <div className="auth-highlight-list">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;

              return (
                <div className="auth-highlight-item" key={item.label}>
                  <div className="auth-highlight-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.text}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <form className="login-card auth-card" onSubmit={entrar}>
          <div className="panel-title">
            <h2>Entrar</h2>
            <p>Use o acesso do ambiente local para abrir o sistema.</p>
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
            <LockKeyhole size={16} />
            {loading ? 'Entrando...' : 'Entrar no sistema'}
          </Button>
        </form>
      </div>
    </div>
  );
}
