import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from './Button.jsx';
import { clearSession, getSessionUser } from '../services/session.js';

const PAGE_META = {
  '/app': {
    title: 'Painel',
    description: 'Resumo do dia, atalhos rápidos e pontos que pedem atenção.',
  },
  '/app/caixa': {
    title: 'Caixa operacional',
    description: 'Abra o caixa, registre movimentos e feche o turno com conferência.',
  },
  '/app/pdv': {
    title: 'Frente de caixa',
    description: 'Leia produtos, revise o carrinho e conclua a venda no caixa aberto.',
  },
  '/app/fornecedores': {
    title: 'Fornecedores',
    description: 'Cadastre parceiros de compra, reposição e recebimento de mercadorias.',
  },
  '/app/compras': {
    title: 'Compras e entradas',
    description: 'Monte pedidos, receba mercadorias e reponha o estoque com controle.',
  },
  '/app/produtos': {
    title: 'Produtos',
    description: 'Cadastre, revise preço, código de barras, estoque e base fiscal.',
  },
  '/app/clientes': {
    title: 'Clientes e crédito',
    description: 'Mantenha a ficha comercial, o histórico e o crediário do cliente organizados.',
  },
  '/app/estoque': {
    title: 'Estoque',
    description: 'Acompanhe saldos, rupturas, ajustes e inventários do estoque.',
  },
  '/app/fiscal': {
    title: 'Fiscal',
    description: 'Configure o emitente e acompanhe a emissão fiscal das vendas.',
  },
  '/app/financeiro': {
    title: 'Financeiro',
    description: 'Acompanhe contas, conciliação de cartão e fluxo financeiro da operação.',
  },
  '/app/relatorios': {
    title: 'Relatórios',
    description: 'Consulte vendas por período, volume diário e formas de pagamento.',
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
            <span className="topbar-chip">Operação local</span>
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
      </div>

      <div className="user-area">
        <div className="date-chip">{dataAtual}</div>
        <div className="user-meta">
          <strong>{usuario?.nome || 'Usuario'}</strong>
          <span>Sessão ativa</span>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={sair}>
          Sair
        </Button>
      </div>
    </header>
  );
}
