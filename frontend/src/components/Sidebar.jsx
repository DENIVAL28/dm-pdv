import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  ContactRound,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { getSessionUser } from '../services/session.js';

const links = [
  { to: '/app', label: 'Painel', icon: LayoutDashboard },
  { to: '/app/caixa', label: 'Caixa', icon: Wallet },
  { to: '/app/pdv', label: 'PDV', icon: ShoppingCart },
  { to: '/app/produtos', label: 'Produtos', icon: Package },
  { to: '/app/fornecedores', label: 'Fornecedores', icon: Truck },
  { to: '/app/compras', label: 'Compras', icon: ClipboardList },
  { to: '/app/clientes', label: 'Clientes', icon: ContactRound },
  { to: '/app/estoque', label: 'Estoque', icon: Boxes },
  { to: '/app/fiscal', label: 'Fiscal', icon: FileText },
  { to: '/app/relatorios', label: 'Relatorios', icon: ChartNoAxesCombined },
];

export default function Sidebar({ isOpen, onClose }) {
  const usuario = getSessionUser();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand brand-column">
          <div className="brand">
            <div className="brand-mark">DM</div>
            <div>
              <strong>DM PDV</strong>
              <span>{usuario?.empresa?.nome || 'DM Sistemas'}</span>
            </div>
          </div>

          <span className="sidebar-chip">Operacao local</span>
        </div>

        <button
          type="button"
          className="icon-btn mobile-only"
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="nav-menu">
        <span className="nav-section-title">Modulos</span>
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink key={link.to} to={link.to} end={link.to === '/app'}>
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-caption">Operador</span>
        <strong>{usuario?.nome || 'Usuario'}</strong>
        <small>{usuario?.email || ''}</small>
        <div className="sidebar-footer-note">
          <span>Ambiente</span>
          <strong>Local</strong>
        </div>
      </div>
    </aside>
  );
}
