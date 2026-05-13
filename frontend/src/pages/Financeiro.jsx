import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, CreditCard, Landmark, Plus, RefreshCw } from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  createManualFinancialEntry,
  getFinancialSummary,
  listCardReconciliations,
  listFinancialEntries,
  listPayables,
  listReceivables,
  payPayable,
  receiveReceivable,
  reconcileCard,
} from '../services/financeService.js';
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod, toInputDate } from '../utils/formatters.js';

const STATUS_LABELS = {
  pendente: 'Pendente',
  liquidado: 'Liquidado',
  conciliado: 'Conciliado',
  cancelado: 'Cancelado',
};

const STATUS_TONES = {
  pendente: 'warning',
  liquidado: 'success',
  conciliado: 'success',
  cancelado: 'neutral',
};

const INITIAL_LAUNCH_FORM = {
  tipo: 'despesa',
  categoria: 'manual',
  descricao: '',
  valor: '',
  vencimento: toInputDate(),
  liquidar_agora: false,
};

function FinanceStatus({ status }) {
  return (
    <StatusBadge tone={STATUS_TONES[status] || 'neutral'}>
      {STATUS_LABELS[status] || status}
    </StatusBadge>
  );
}

export default function Financeiro() {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [cardReconciliations, setCardReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [launchForm, setLaunchForm] = useState(INITIAL_LAUNCH_FORM);

  async function loadFinancial() {
    try {
      setLoading(true);
      const [summaryData, entriesData, receivablesData, payablesData, cardData] = await Promise.all([
        getFinancialSummary(),
        listFinancialEntries({ limite: 30 }),
        listReceivables({ limite: 20 }),
        listPayables({ limite: 20 }),
        listCardReconciliations({ limite: 20 }),
      ]);

      setSummary(summaryData);
      setEntries(entriesData);
      setReceivables(receivablesData);
      setPayables(payablesData);
      setCardReconciliations(cardData);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinancial();
  }, []);

  async function saveManualEntry(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await createManualFinancialEntry({
        ...launchForm,
        valor: Number(launchForm.valor),
        liquidar_agora: launchForm.liquidar_agora ? 1 : 0,
      });
      setFeedback({ tone: 'success', message: 'Lancamento manual criado com sucesso.' });
      setLaunchForm(INITIAL_LAUNCH_FORM);
      setModalOpen(false);
      await loadFinancial();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleReceive(receivable) {
    const observacoes = window.prompt('Observacoes do recebimento (opcional):') || '';

    try {
      setSaving(true);
      await receiveReceivable(receivable.id, { observacoes });
      setFeedback({ tone: 'success', message: `Conta a receber #${receivable.id} liquidada.` });
      await loadFinancial();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handlePay(payable) {
    const observacoes = window.prompt('Observacoes do pagamento (opcional):') || '';

    try {
      setSaving(true);
      await payPayable(payable.id, { observacoes });
      setFeedback({ tone: 'success', message: `Conta a pagar #${payable.id} liquidada.` });
      await loadFinancial();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleReconcile(cardItem) {
    const bandeira = window.prompt('Bandeira do cartao (ex.: Visa, Master):') || '';
    const taxa = window.prompt(
      'Taxa percentual da operadora. Deixe em branco para usar a configuracao atual:',
      String(cardItem.taxa_percentual ?? '')
    );
    const observacoes = window.prompt('Observacoes da conciliacao (opcional):') || '';

    try {
      setSaving(true);
      await reconcileCard(cardItem.id, {
        bandeira,
        taxa_percentual: taxa,
        observacoes,
      });
      setFeedback({ tone: 'success', message: `Conciliacao #${cardItem.id} concluida.` });
      await loadFinancial();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Financeiro</h2>
          <p>Contas, conciliação de cartão e fluxo financeiro do que entrou e saiu da operação.</p>
        </div>

        <div className="inline-actions">
          <Button type="button" variant="secondary" onClick={loadFinancial}>
            <RefreshCw size={16} />
            Atualizar
          </Button>
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Lancamento manual
          </Button>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card
          title="A receber pendente"
          value={formatCurrency(summary?.a_receber_pendente || 0)}
          helper={`${summary?.titulos_receber_pendentes || 0} titulo(s) em aberto`}
          icon={ArrowDownCircle}
          tone="primary"
        />
        <Card
          title="A pagar pendente"
          value={formatCurrency(summary?.a_pagar_pendente || 0)}
          helper={`${summary?.titulos_pagar_pendentes || 0} titulo(s) em aberto`}
          icon={ArrowUpCircle}
          tone="warning"
        />
        <Card
          title="Cartoes pendentes"
          value={formatCurrency(summary?.cartoes_pendentes || 0)}
          helper={`${summary?.conciliacoes_pendentes || 0} conciliacao(oes) aguardando`}
          icon={CreditCard}
          tone="warning"
        />
        <Card
          title="Saldo previsto"
          value={formatCurrency(summary?.saldo_previsto || 0)}
          helper={`Recebido hoje ${formatCurrency(summary?.recebido_hoje || 0)} | Pago hoje ${formatCurrency(summary?.pago_hoje || 0)}`}
          icon={Landmark}
          tone="primary"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Contas a receber</h3>
              <p>Recebimentos gerados pelas vendas e baixas manuais fora do cartao.</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Carregando contas a receber...</div>
          ) : receivables.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Venda</th>
                    <th>Cliente</th>
                    <th>Pagamento</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((item) => (
                    <tr key={item.id}>
                      <td><FinanceStatus status={item.status} /></td>
                      <td>{item.venda_id ? `#${item.venda_id}` : '--'}</td>
                      <td>{item.cliente_nome || 'Consumidor final'}</td>
                      <td>{formatPaymentMethod(item.forma_pagamento)}</td>
                      <td>{formatCurrency(item.valor)}</td>
                      <td>{formatDate(item.vencimento)}</td>
                      <td>
                        <div className="table-actions">
                          {item.status === 'pendente' && !String(item.forma_pagamento).startsWith('cartao_') ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleReceive(item)} disabled={saving}>
                              Receber
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sem contas a receber"
              description="As vendas e os lancamentos manuais aparecem aqui quando gerarem recebimento."
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Contas a pagar</h3>
              <p>Saidas geradas pelas entradas de mercadoria e despesas controladas.</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Carregando contas a pagar...</div>
          ) : payables.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Entrada</th>
                    <th>Fornecedor</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((item) => (
                    <tr key={item.id}>
                      <td><FinanceStatus status={item.status} /></td>
                      <td>{item.entrada_mercadoria_id ? `#${item.entrada_mercadoria_id}` : '--'}</td>
                      <td>{item.fornecedor_nome}</td>
                      <td>{formatCurrency(item.valor)}</td>
                      <td>{formatDate(item.vencimento)}</td>
                      <td>
                        <div className="table-actions">
                          {item.status === 'pendente' ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handlePay(item)} disabled={saving}>
                              Pagar
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sem contas a pagar"
              description="As entradas de mercadoria passam a gerar titulos para pagamento."
            />
          )}
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Conciliacao de cartao</h3>
              <p>Recebimentos de debito e credito aguardando o repasse da operadora.</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Carregando conciliacoes...</div>
          ) : cardReconciliations.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Venda</th>
                    <th>Pagamento</th>
                    <th>Bruto</th>
                    <th>Liquido</th>
                    <th>Previsto</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {cardReconciliations.map((item) => (
                    <tr key={item.id}>
                      <td><FinanceStatus status={item.status} /></td>
                      <td>{item.venda_id ? `#${item.venda_id}` : '--'}</td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatPaymentMethod(item.forma_pagamento)}</strong>
                          <span>{item.bandeira || 'Bandeira nao informada'}</span>
                        </div>
                      </td>
                      <td>{formatCurrency(item.valor_bruto)}</td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatCurrency(item.valor_liquido)}</strong>
                          <span>Taxa {formatCurrency(item.valor_taxa)}</span>
                        </div>
                      </td>
                      <td>{formatDate(item.data_prevista)}</td>
                      <td>
                        <div className="table-actions">
                          {item.status === 'pendente' ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleReconcile(item)} disabled={saving}>
                              Conciliar
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sem conciliacoes pendentes"
              description="As vendas em cartao aparecem aqui para conferencia e taxa."
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Lancamentos financeiros</h3>
              <p>Historico geral de receitas, despesas e taxas da operacao.</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Carregando lancamentos...</div>
          ) : entries.length ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Descricao</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((item) => (
                    <tr key={item.id}>
                      <td>{item.tipo}</td>
                      <td>{item.categoria}</td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{item.descricao}</strong>
                          <span>
                            {item.cliente_nome || item.fornecedor_nome || item.origem}
                          </span>
                        </div>
                      </td>
                      <td>{formatCurrency(item.valor)}</td>
                      <td>{formatDate(item.vencimento)}</td>
                      <td>
                        <FinanceStatus status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sem lancamentos financeiros"
              description="Os recebimentos, pagamentos e taxas entram aqui automaticamente."
            />
          )}
        </section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Lancamento manual"
        description="Use quando precisar registrar uma receita ou despesa fora dos fluxos automaticos."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="manual-finance-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar lancamento'}
            </Button>
          </>
        }
      >
        <form id="manual-finance-form" className="form-grid" onSubmit={saveManualEntry}>
          <label className="field">
            <span>Tipo</span>
            <select
              value={launchForm.tipo}
              onChange={(event) => setLaunchForm({ ...launchForm, tipo: event.target.value })}
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </label>

          <label className="field">
            <span>Categoria</span>
            <select
              value={launchForm.categoria}
              onChange={(event) => setLaunchForm({ ...launchForm, categoria: event.target.value })}
            >
              <option value="manual">Manual</option>
              <option value="taxa_cartao">Taxa de cartao</option>
              <option value="compra">Compra</option>
              <option value="venda">Venda</option>
            </select>
          </label>

          <label className="field field-span-2">
            <span>Descricao</span>
            <input
              value={launchForm.descricao}
              onChange={(event) => setLaunchForm({ ...launchForm, descricao: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Valor</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={launchForm.valor}
              onChange={(event) => setLaunchForm({ ...launchForm, valor: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Vencimento</span>
            <input
              type="date"
              value={launchForm.vencimento}
              onChange={(event) => setLaunchForm({ ...launchForm, vencimento: event.target.value })}
            />
          </label>

          <label className="toggle field-span-2">
            <input
              type="checkbox"
              checked={launchForm.liquidar_agora}
              onChange={(event) => setLaunchForm({ ...launchForm, liquidar_agora: event.target.checked })}
            />
            <span>Marcar como liquidado agora</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
