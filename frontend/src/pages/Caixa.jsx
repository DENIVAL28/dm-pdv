import React from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  ReceiptText,
  Store,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  closeCashSession,
  getCurrentCashSession,
  listCashRegisters,
  openCashSession,
  registerCashSupply,
  registerCashWithdrawal,
} from '../services/cashRegisterService.js';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '../utils/formatters.js';

const INITIAL_OPEN_FORM = {
  caixa_id: '',
  valor_abertura: '',
  observacoes: '',
};

const INITIAL_MOVEMENT_FORM = {
  valor: '',
  descricao: '',
};

const INITIAL_CLOSE_FORM = {
  valor_informado: '',
  observacoes: '',
};

export default function Caixa() {
  const [caixas, setCaixas] = useState([]);
  const [sessaoAtual, setSessaoAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [openForm, setOpenForm] = useState(INITIAL_OPEN_FORM);
  const [movementForm, setMovementForm] = useState(INITIAL_MOVEMENT_FORM);
  const [closeForm, setCloseForm] = useState(INITIAL_CLOSE_FORM);

  async function carregarPainel() {
    try {
      setLoading(true);
      const [caixasData, sessaoData] = await Promise.all([
        listCashRegisters(),
        getCurrentCashSession(),
      ]);

      setCaixas(caixasData);
      setSessaoAtual(sessaoData);
      setOpenForm((current) => ({
        ...current,
        caixa_id: current.caixa_id || String(caixasData[0]?.id || ''),
      }));
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPainel();
  }, []);

  function fecharModal() {
    setModalType(null);
    setMovementForm(INITIAL_MOVEMENT_FORM);
    setCloseForm(INITIAL_CLOSE_FORM);
  }

  function abrirModal(tipo) {
    setFeedback(null);
    setModalType(tipo);

    if (tipo === 'fechar' && sessaoAtual) {
      setCloseForm({
        valor_informado: String(sessaoAtual.valor_em_caixa_sistema || ''),
        observacoes: '',
      });
    }
  }

  async function handleAbrirSessao(event) {
    event.preventDefault();

    try {
      setSaving(true);
      const data = await openCashSession({
        caixa_id: Number(openForm.caixa_id),
        valor_abertura: Number(openForm.valor_abertura || 0),
        observacoes: openForm.observacoes || null,
      });

      setSessaoAtual(data);
      setFeedback({ tone: 'success', message: 'Caixa aberto com sucesso.' });
      setOpenForm((current) => ({
        ...INITIAL_OPEN_FORM,
        caixa_id: current.caixa_id,
      }));
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarMovimento(event) {
    event.preventDefault();

    if (!sessaoAtual?.sessao?.id) {
      return;
    }

    try {
      setSaving(true);
      const payload = {
        valor: Number(movementForm.valor || 0),
        descricao: movementForm.descricao || null,
      };

      const data =
        modalType === 'sangria'
          ? await registerCashWithdrawal(sessaoAtual.sessao.id, payload)
          : await registerCashSupply(sessaoAtual.sessao.id, payload);

      setSessaoAtual(data);
      setFeedback({
        tone: 'success',
        message: modalType === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.',
      });
      fecharModal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleFecharSessao(event) {
    event.preventDefault();

    if (!sessaoAtual?.sessao?.id) {
      return;
    }

    try {
      setSaving(true);
      const data = await closeCashSession(sessaoAtual.sessao.id, {
        valor_informado: Number(closeForm.valor_informado || 0),
        observacoes: closeForm.observacoes || null,
      });

      setSessaoAtual(null);
      setFeedback({
        tone: 'success',
        message: `Caixa fechado. Diferenca final: ${formatCurrency(data.fechamento?.diferenca || 0)}.`,
      });
      fecharModal();
      await carregarPainel();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  const caixasAtivos = caixas.filter((caixa) => caixa.status === 'ativo').length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Caixa operacional</h2>
          <p>Abra o caixa, acompanhe movimentos e feche o turno com conferência.</p>
        </div>

        <Button type="button" variant="secondary" onClick={carregarPainel}>
          Atualizar
        </Button>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Caixas ativos" value={caixasAtivos} icon={Store} />
        <Card
          title="Sessao atual"
          value={sessaoAtual ? sessaoAtual.sessao.caixa_nome : 'Sem caixa aberto'}
          helper={sessaoAtual ? formatDateTime(sessaoAtual.sessao.data_abertura) : 'Abra um caixa para operar'}
          icon={Wallet}
          tone={sessaoAtual ? 'success' : 'default'}
        />
        <Card
          title="Em caixa sistema"
          value={formatCurrency(sessaoAtual?.valor_em_caixa_sistema || 0)}
          helper="Abertura + dinheiro + suprimento - sangria"
          icon={BadgeDollarSign}
        />
        <Card
          title="Vendas na sessao"
          value={sessaoAtual?.resumo_vendas?.quantidade_vendas || 0}
          helper={formatCurrency(sessaoAtual?.resumo_vendas?.total_vendido || 0)}
          icon={ReceiptText}
        />
      </div>

      {loading ? (
        <div className="loading-state">Carregando dados do caixa...</div>
      ) : sessaoAtual ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Turno em andamento</h3>
                <p>Use os movimentos para ajustar o dinheiro fisico e feche quando encerrar a operacao.</p>
              </div>

              <div className="inline-actions">
                <Button type="button" variant="secondary" onClick={() => abrirModal('sangria')}>
                  <ArrowUpCircle size={16} />
                  Sangria
                </Button>
                <Button type="button" variant="secondary" onClick={() => abrirModal('suprimento')}>
                  <ArrowDownCircle size={16} />
                  Suprimento
                </Button>
                <Button type="button" onClick={() => abrirModal('fechar')}>
                  Fechar caixa
                </Button>
              </div>
            </div>

            <div className="cash-session-grid">
              <div className="helper-card cash-session-card">
                <span>Caixa</span>
                <strong>
                  {sessaoAtual.sessao.caixa_nome}
                  {sessaoAtual.sessao.caixa_identificador
                    ? ` (${sessaoAtual.sessao.caixa_identificador})`
                    : ''}
                </strong>
                <small>
                  Aberto por {sessaoAtual.sessao.usuario_abertura_nome} em{' '}
                  {formatDateTime(sessaoAtual.sessao.data_abertura)}
                </small>
              </div>

              <div className="helper-card cash-session-card">
                <span>Status</span>
                <strong>
                  <StatusBadge tone="success">Aberto</StatusBadge>
                </strong>
                <small>Valor de abertura {formatCurrency(sessaoAtual.sessao.valor_abertura)}</small>
              </div>

              <div className="helper-card cash-session-card">
                <span>Movimentos</span>
                <strong>
                  Sangria {formatCurrency(sessaoAtual.resumo_movimentos.sangria)} | Suprimento{' '}
                  {formatCurrency(sessaoAtual.resumo_movimentos.suprimento)}
                </strong>
                <small>Resumo operacional da sessao atual.</small>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>Fechamento por pagamento</h3>
                  <p>Confira como o total da sessao esta distribuido por forma de pagamento.</p>
                </div>
              </div>

              {sessaoAtual.formas_pagamento.length ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Forma</th>
                        <th>Vendas</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessaoAtual.formas_pagamento.map((item) => (
                        <tr key={item.forma_pagamento}>
                          <td>{formatPaymentMethod(item.forma_pagamento)}</td>
                          <td>{item.quantidade_vendas}</td>
                          <td>{formatCurrency(item.total_vendido)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Sem vendas nesta sessao"
                  description="Assim que o PDV finalizar vendas, o resumo por pagamento aparece aqui."
                />
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>Movimentos do caixa</h3>
                  <p>Historico de sangria e suprimento da sessao aberta.</p>
                </div>
              </div>

              {sessaoAtual.movimentos.length ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Valor</th>
                        <th>Descricao</th>
                        <th>Horario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessaoAtual.movimentos.map((movimento) => (
                        <tr key={movimento.id}>
                          <td className="cash-movement-cell">
                            <StatusBadge tone={movimento.tipo === 'sangria' ? 'warning' : 'primary'}>
                              {movimento.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}
                            </StatusBadge>
                          </td>
                          <td>{formatCurrency(movimento.valor)}</td>
                          <td>{movimento.descricao || '-'}</td>
                          <td>{formatDateTime(movimento.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Nenhum movimento registrado"
                  description="Use sangria ou suprimento quando precisar ajustar o dinheiro do caixa."
                />
              )}
            </section>
          </div>
        </>
      ) : (
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Abertura de caixa</h3>
              <p>Escolha o caixa e informe o valor inicial para liberar o PDV.</p>
            </div>
          </div>

          <form className="form-grid cash-open-form" onSubmit={handleAbrirSessao}>
            <label className="field">
              <span>Caixa</span>
              <select
                value={openForm.caixa_id}
                onChange={(event) => setOpenForm({ ...openForm, caixa_id: event.target.value })}
              >
                <option value="">Selecione</option>
                {caixas
                  .filter((caixa) => caixa.status === 'ativo')
                  .map((caixa) => (
                    <option key={caixa.id} value={caixa.id}>
                      {caixa.nome}
                      {caixa.identificador ? ` - ${caixa.identificador}` : ''}
                    </option>
                  ))}
              </select>
            </label>

            <label className="field">
              <span>Valor de abertura</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openForm.valor_abertura}
                onChange={(event) => setOpenForm({ ...openForm, valor_abertura: event.target.value })}
                placeholder="0,00"
              />
            </label>

            <label className="field field-span-2">
              <span>Observacoes</span>
              <textarea
                rows="2"
                value={openForm.observacoes}
                onChange={(event) => setOpenForm({ ...openForm, observacoes: event.target.value })}
                placeholder="Campo opcional para registrar o inicio do turno"
              />
            </label>

            <div className="field field-span-2 cash-open-actions">
              <Button type="submit" disabled={saving || !openForm.caixa_id}>
                {saving ? 'Abrindo...' : 'Abrir caixa'}
              </Button>
            </div>
          </form>
        </section>
      )}

      <Modal
        open={modalType === 'sangria' || modalType === 'suprimento'}
        onClose={fecharModal}
        title={modalType === 'sangria' ? 'Registrar sangria' : 'Registrar suprimento'}
        description="Informe o valor e, se quiser, uma descricao curta do movimento."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="cash-movement-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar movimento'}
            </Button>
          </>
        }
      >
        <form id="cash-movement-form" className="form-grid" onSubmit={handleSalvarMovimento}>
          <label className="field">
            <span>Valor</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={movementForm.valor}
              onChange={(event) => setMovementForm({ ...movementForm, valor: event.target.value })}
              placeholder="0,00"
            />
          </label>

          <label className="field field-span-2">
            <span>Descricao</span>
            <textarea
              rows="2"
              value={movementForm.descricao}
              onChange={(event) =>
                setMovementForm({ ...movementForm, descricao: event.target.value })
              }
              placeholder="Exemplo: retirada para troco do outro caixa"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={modalType === 'fechar'}
        onClose={fecharModal}
        title="Fechamento de caixa"
        description="Informe o valor fisico encontrado para comparar com o sistema."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="cash-close-form" disabled={saving}>
              {saving ? 'Fechando...' : 'Confirmar fechamento'}
            </Button>
          </>
        }
      >
        <form id="cash-close-form" className="form-grid" onSubmit={handleFecharSessao}>
          <div className="helper-card field-span-2">
            <span>Valor esperado pelo sistema</span>
            <strong>{formatCurrency(sessaoAtual?.valor_em_caixa_sistema || 0)}</strong>
            <small>Esse valor considera abertura, vendas em dinheiro, suprimentos e sangrias.</small>
          </div>

          <label className="field">
            <span>Valor informado</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={closeForm.valor_informado}
              onChange={(event) => setCloseForm({ ...closeForm, valor_informado: event.target.value })}
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="2"
              value={closeForm.observacoes}
              onChange={(event) => setCloseForm({ ...closeForm, observacoes: event.target.value })}
              placeholder="Use este campo para registrar diferencas ou observacoes do fechamento"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
