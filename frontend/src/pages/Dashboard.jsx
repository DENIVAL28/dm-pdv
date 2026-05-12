import React from 'react';
import { AlertTriangle, BadgeDollarSign, Package, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getDashboardData } from '../services/reportService.js';
import {
  formatCurrency,
  formatDateTime,
  formatPaymentMethod,
  getStockStatus,
} from '../utils/formatters.js';

const INITIAL_STATE = {
  resumo: {
    vendas_hoje: 0,
    total_vendido_hoje: 0,
    ticket_medio_hoje: 0,
    itens_vendidos_hoje: 0,
    produtos_cadastrados: 0,
    estoque_baixo: 0,
    sem_estoque: 0,
  },
  ultimas_vendas: [],
  produtos_criticos: [],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function carregarDashboard() {
    try {
      setLoading(true);
      setError('');
      const data = await getDashboardData();
      setDashboard(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  const resumo = dashboard.resumo;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Visao do dia</h2>
          <p>Vendas, giro e produtos que exigem reposicao imediata.</p>
        </div>

        <Button type="button" variant="secondary" onClick={carregarDashboard}>
          Atualizar
        </Button>
      </div>

      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <section className="overview-banner">
        <div className="overview-banner-copy">
          <span className="overview-label">Resumo operacional</span>
          <h3>Caixa, estoque e consulta de vendas no mesmo painel.</h3>
          <p>
            Acompanhe o total vendido, veja itens que pedem reposicao e entre direto nos
            fluxos mais usados do dia.
          </p>

          <div className="inline-actions">
            <Button type="button" onClick={() => navigate('/pdv')}>
              Ir para o PDV
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/produtos')}>
              Abrir produtos
            </Button>
          </div>
        </div>

        <div className="overview-banner-grid">
          <div className="overview-stat">
            <span>Vendas do dia</span>
            <strong>{resumo.vendas_hoje}</strong>
            <small>{resumo.itens_vendidos_hoje} itens vendidos</small>
          </div>

          <div className="overview-stat">
            <span>Faturamento</span>
            <strong>{formatCurrency(resumo.total_vendido_hoje)}</strong>
            <small>Ticket medio de {formatCurrency(resumo.ticket_medio_hoje)}</small>
          </div>

          <div className="overview-stat">
            <span>Itens criticos</span>
            <strong>{resumo.estoque_baixo}</strong>
            <small>{resumo.sem_estoque} sem estoque</small>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <Card
          title="Vendas do dia"
          value={resumo.vendas_hoje}
          helper={`${resumo.itens_vendidos_hoje} itens vendidos hoje`}
          icon={ShoppingBag}
          tone="primary"
        />
        <Card
          title="Total vendido"
          value={formatCurrency(resumo.total_vendido_hoje)}
          helper={`Ticket medio de ${formatCurrency(resumo.ticket_medio_hoje)}`}
          icon={BadgeDollarSign}
          tone="primary"
        />
        <Card
          title="Produtos cadastrados"
          value={resumo.produtos_cadastrados}
          helper={`${resumo.sem_estoque} sem estoque`}
          icon={Package}
        />
        <Card
          title="Estoque baixo"
          value={resumo.estoque_baixo}
          helper="Itens com saldo no minimo ou abaixo"
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel panel-emphasis">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Ultimas vendas</h3>
              <p>Movimentacoes mais recentes da operacao.</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Carregando vendas...</div>
          ) : dashboard.ultimas_vendas.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Venda</th>
                    <th>Cliente</th>
                    <th>Operador</th>
                    <th>Pagamento</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.ultimas_vendas.map((sale) => (
                    <tr key={sale.id}>
                      <td>#{sale.id}</td>
                      <td>{sale.cliente_nome || 'Consumidor final'}</td>
                      <td>{sale.usuario}</td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatPaymentMethod(sale.forma_pagamento)}</strong>
                          <span>
                            {sale.troco
                              ? `Troco ${formatCurrency(sale.troco)}`
                              : `Recebido ${formatCurrency(sale.valor_recebido)}`}
                          </span>
                        </div>
                      </td>
                      <td>{sale.total_itens}</td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatCurrency(sale.total)}</strong>
                          <span>
                            Subtotal {formatCurrency(sale.subtotal)}
                            {sale.desconto_valor ? ` | Desc. ${formatCurrency(sale.desconto_valor)}` : ''}
                            {sale.acrescimo_valor ? ` | Acresc. ${formatCurrency(sale.acrescimo_valor)}` : ''}
                          </span>
                        </div>
                      </td>
                      <td>{formatDateTime(sale.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nenhuma venda registrada hoje"
              description="As novas vendas finalizadas aparecerao aqui."
            />
          )}
        </section>

        <div className="side-stack">
          <section className="panel panel-muted">
            <div className="panel-title">
              <h3>Indicadores rapidos</h3>
              <p>Dois pontos de leitura para o caixa e reposicao.</p>
            </div>

            <div className="metric-grid">
              <div className="info-tile">
                <span>Ticket medio</span>
                <strong>{formatCurrency(resumo.ticket_medio_hoje)}</strong>
              </div>

              <div className="info-tile">
                <span>Itens vendidos</span>
                <strong>{resumo.itens_vendidos_hoje}</strong>
              </div>
            </div>
          </section>

          <section className="panel panel-muted">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Produtos com atencao</h3>
                <p>Itens com reposicao pendente.</p>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">Carregando estoque...</div>
            ) : dashboard.produtos_criticos.length ? (
              <div className="list-stack">
                {dashboard.produtos_criticos.map((product) => {
                  const status = getStockStatus(product);

                  return (
                    <div className="list-item" key={product.id}>
                      <div>
                        <strong>{product.nome}</strong>
                        <p>
                          Estoque atual: {product.estoque} | Minimo: {product.estoque_minimo}
                        </p>
                      </div>

                      <div className="list-item-aside">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        <span>{formatCurrency(product.preco)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Nenhum produto em nivel critico"
                description="Os itens ativos estao acima do estoque minimo."
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
