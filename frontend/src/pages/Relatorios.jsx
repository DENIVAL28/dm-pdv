import React, { useEffect, useState } from 'react';
import { BadgeDollarSign, CalendarRange, Package, ShoppingBag } from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import { getSalesReport } from '../services/reportService.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaymentMethod,
  getDefaultReportRange,
} from '../utils/formatters.js';

const DEFAULT_RANGE = getDefaultReportRange();
const INITIAL_DATA = {
  periodo: {
    data_inicial: DEFAULT_RANGE.dataInicial,
    data_final: DEFAULT_RANGE.dataFinal,
  },
  resumo: {
    quantidade_vendas: 0,
    total_vendido: 0,
    ticket_medio: 0,
    itens_vendidos: 0,
  },
  vendas_por_dia: [],
  formas_pagamento: [],
  vendas: [],
};

export default function Relatorios() {
  const [filtros, setFiltros] = useState(DEFAULT_RANGE);
  const [dados, setDados] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function carregarRelatorio(filters = filtros) {
    try {
      setLoading(true);
      setError('');
      const data = await getSalesReport(filters);
      setDados(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarRelatorio(DEFAULT_RANGE);
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    carregarRelatorio(filtros);
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Relatórios de vendas</h2>
          <p>Filtre por data e acompanhe faturamento, itens vendidos e meios de pagamento.</p>
        </div>
      </div>

      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Filtros</h3>
            <p>Período de consulta para o resumo e a listagem de vendas.</p>
          </div>
        </div>

        <form className="toolbar" onSubmit={handleSubmit}>
          <label className="field">
            <span>Data inicial</span>
            <input
              type="date"
              value={filtros.dataInicial}
              onChange={(event) => setFiltros({ ...filtros, dataInicial: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Data final</span>
            <input
              type="date"
              value={filtros.dataFinal}
              onChange={(event) => setFiltros({ ...filtros, dataFinal: event.target.value })}
            />
          </label>

          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      </section>

      <div className="stats-grid">
        <Card title="Vendas no período" value={dados.resumo.quantidade_vendas} icon={ShoppingBag} />
        <Card
          title="Total vendido"
          value={formatCurrency(dados.resumo.total_vendido)}
          icon={BadgeDollarSign}
          tone="primary"
        />
        <Card
          title="Ticket médio"
          value={formatCurrency(dados.resumo.ticket_medio)}
          icon={CalendarRange}
        />
        <Card title="Itens vendidos" value={dados.resumo.itens_vendidos} icon={Package} />
      </div>

      <div className="report-grid">
        <section className="panel">
          <div className="panel-title">
            <h3>Vendas por dia</h3>
            <p>
              Período de {formatDate(dados.periodo.data_inicial)} a {formatDate(dados.periodo.data_final)}.
            </p>
          </div>

          {loading ? (
            <div className="loading-state">Carregando resumo...</div>
          ) : dados.vendas_por_dia.length ? (
            <div className="list-stack">
              {dados.vendas_por_dia.map((item) => (
                <div className="list-item" key={item.data}>
                  <div>
                    <strong>{formatDate(item.data)}</strong>
                    <p>{item.quantidade_vendas} venda(s)</p>
                  </div>

                  <div className="list-item-aside">
                    <span>{formatCurrency(item.total_vendido)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem vendas no período"
              description="Ajuste o intervalo de datas para consultar outro período."
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <h3>Formas de pagamento</h3>
            <p>Distribuição do faturamento por método utilizado.</p>
          </div>

          {loading ? (
            <div className="loading-state">Carregando pagamentos...</div>
          ) : dados.formas_pagamento.length ? (
            <div className="list-stack">
              {dados.formas_pagamento.map((item) => (
                <div className="list-item" key={item.forma_pagamento}>
                  <div>
                    <strong>{formatPaymentMethod(item.forma_pagamento)}</strong>
                    <p>{item.quantidade_vendas} venda(s)</p>
                  </div>

                  <div className="list-item-aside">
                    <span>{formatCurrency(item.total_vendido)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem pagamentos registrados"
              description="As vendas filtradas aparecem aqui por forma de pagamento."
            />
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h3>Vendas detalhadas</h3>
          <p>Últimas vendas encontradas no período filtrado.</p>
        </div>

        {loading ? (
          <div className="loading-state">Carregando vendas...</div>
        ) : dados.vendas.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Venda</th>
                  <th>Cliente</th>
                  <th>Operador</th>
                  <th>Itens</th>
                  <th>Pagamento</th>
                  <th>Total</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {dados.vendas.map((venda) => (
                  <tr key={venda.id}>
                    <td>#{venda.id}</td>
                    <td>{venda.cliente_nome || 'Consumidor final'}</td>
                    <td>{venda.usuario}</td>
                    <td>{venda.total_itens}</td>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{formatPaymentMethod(venda.forma_pagamento)}</strong>
                        <span>
                          {venda.troco
                            ? `Troco ${formatCurrency(venda.troco)}`
                            : `Recebido ${formatCurrency(venda.valor_recebido)}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{formatCurrency(venda.total)}</strong>
                        <span>
                          Subtotal {formatCurrency(venda.subtotal)}
                          {venda.desconto_valor ? ` | Desc. ${formatCurrency(venda.desconto_valor)}` : ''}
                          {venda.acrescimo_valor ? ` | Acrésc. ${formatCurrency(venda.acrescimo_valor)}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>{formatDateTime(venda.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhuma venda para mostrar"
            description="Quando houver vendas no período selecionado, elas aparecem nesta tabela."
          />
        )}
      </section>
    </div>
  );
}
