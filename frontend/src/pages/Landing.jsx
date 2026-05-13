import React from 'react';
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  Package,
  ReceiptText,
  ShoppingCart,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MODULES = [
  {
    icon: ShoppingCart,
    title: 'Frente de caixa',
    description: 'Leitura de produtos, carrinho, pagamento e fechamento da venda no mesmo fluxo.',
  },
  {
    icon: Package,
    title: 'Produtos',
    description: 'Cadastro com preço, código de barras, estoque, custo e base fiscal do item.',
  },
  {
    icon: Boxes,
    title: 'Estoque',
    description: 'Consulta de saldo, itens críticos, ajustes e inventário da loja.',
  },
  {
    icon: ClipboardList,
    title: 'Relatórios',
    description: 'Resumo diário, vendas por período e leitura clara do movimento.',
  },
];

const FLOW = [
  'Buscar o produto por nome ou código de barras.',
  'Adicionar ao carrinho e conferir o total da venda.',
  'Finalizar com a forma de pagamento informada.',
  'Acompanhar estoque, financeiro e vendas no mesmo sistema.',
];

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-shell">
        <header className="landing-topbar">
          <div className="brand large">
            <div className="brand-mark">DM</div>
            <div>
              <strong>DM PDV</strong>
              <span>DM Sistemas</span>
            </div>
          </div>

          <div className="landing-topbar-actions">
            <span className="landing-chip">Operação local para mercado</span>
            <Link to="/login" className="btn primary">
              Entrar
            </Link>
          </div>
        </header>

        <section className="landing-hero">
          <div className="landing-copy">
            <span className="overview-label">Sistema para operação de loja</span>
            <h1>Caixa, estoque e retaguarda com leitura clara e fluxo direto.</h1>
            <p>
              O DM PDV foi desenhado para a rotina real de um mercado pequeno:
              cadastrar produto, vender, baixar estoque, receber mercadoria e
              acompanhar o movimento do dia sem navegação confusa.
            </p>

            <div className="landing-actions">
              <Link to="/login" className="btn primary">
                Entrar no sistema
                <ArrowRight size={16} />
              </Link>
              <a href="#modulos" className="btn secondary">
                Ver módulos
              </a>
            </div>
          </div>

          <div className="landing-showcase">
            <div className="landing-card landing-card-strong">
              <span className="landing-card-label">Visão da operação</span>
              <strong>Venda, cadastro, reposição e consulta no mesmo ambiente.</strong>

              <div className="landing-card-grid">
                <div className="landing-mini-stat">
                  <ReceiptText size={18} />
                  <div>
                    <span>Atendimento no caixa</span>
                    <strong>Leitura, conferência e fechamento</strong>
                  </div>
                </div>

                <div className="landing-mini-stat">
                  <BadgeDollarSign size={18} />
                  <div>
                    <span>Resumo diário</span>
                    <strong>Consulta rápida do movimento</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-card">
              <span className="landing-card-label">Acesso local</span>
              <strong>Credenciais de início</strong>

              <div className="landing-credential">
                <span>E-mail</span>
                <strong>admin@dmsistemas.com</strong>
              </div>

              <div className="landing-credential">
                <span>Senha</span>
                <strong>123456</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="modulos">
          <div className="landing-section-head">
            <h2>Módulos principais</h2>
            <p>O sistema foi organizado para o operador chegar rápido ao que usa todo dia.</p>
          </div>

          <div className="landing-module-grid">
            {MODULES.map((module) => {
              const Icon = module.icon;

              return (
                <article className="landing-module-card" key={module.title}>
                  <div className="landing-module-icon">
                    <Icon size={18} />
                  </div>
                  <strong>{module.title}</strong>
                  <p>{module.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <h2>Fluxo principal</h2>
            <p>O caminho básico da operação cabe em poucos passos e sem tela sobrando.</p>
          </div>

          <div className="landing-flow-grid">
            {FLOW.map((step, index) => (
              <article className="landing-flow-card" key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
