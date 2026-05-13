import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from './Button.jsx';
import { clearSession, getSessionUser } from '../services/session.js';

const PAGE_META = {
  '/app': {
    title: 'Painel',
    description: 'Resumo da operacao de hoje e pontos que pedem atencao.',
  },
  '/app/caixa': {
    title: 'Caixa operacional',
    description: 'Abra o caixa, acompanhe movimentos e feche o turno com conferencia.',
  },
  '/app/pdv': {
    title: 'PDV',
    description: 'Busque produtos, monte o carrinho e conclua a venda no caixa aberto.',
  },
  '/app/fornecedores': {
    title: 'Fornecedores',
    description: 'Cadastre parceiros usados em compras, entradas e reposicao do mercado.',
  },
  '/app/compras': {
    title: 'Compras e entradas',
    description: 'Monte pedidos, receba mercadorias e reponha o estoque com controle.',
  },
  '/app/produtos': {
    title: 'Produtos',
    description: 'Cadastre, edite e acompanhe os itens vendidos no mercado.',
  },
  '/app/clientes': {
    title: 'Clientes',
    description: 'Mantenha a base de clientes pronta para identificar vendas com rapidez.',
  },
  '/app/estoque': {
    title: 'Estoque',
    description: 'Acompanhe saldos, rupturas e itens abaixo do minimo.',
  },
  '/app/fiscal': {
    title: 'Fiscal',
    description: 'Configure o emitente e acompanhe a emissao fiscal das vendas do caixa.',
  },
  '/app/relatorios': {
    title: 'Relatorios',
    description: 'Consulte vendas por periodo e formas de pagamento.',
  },
};

export default function Topbar({ onOpenNav }) {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = getSessionUser();
  const meta = PAGE_META[location.pathname] || PAGE_META['/app'];
  const dataAtual = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  function sair() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-main">
        <button
          type="button"
          className="icon-btn mobile-only"
          onClick={onOpenNav}
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>

        <div className="topbar-intro">
          <div className="topbar-kicker-row">
            <span className="eyebrow">{usuario?.empresa?.nome || 'DM Sistemas'}</span>
            <span className="topbar-chip">Caixa local</span>
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
      </div>

      <div className="user-area">
        <div className="date-chip">{dataAtual}</div>
        <div className="user-meta">
          <strong>{usuario?.nome || 'Usuario'}</strong>
          <span>Sessao ativa</span>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={sair}>
          Sair
        </Button>
      </div>
    </header>
  );
}
