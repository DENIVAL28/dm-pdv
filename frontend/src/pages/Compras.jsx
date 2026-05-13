import React from 'react';
import {
  ClipboardList,
  PackagePlus,
  Plus,
  Receipt,
  RefreshCcw,
  ShoppingBasket,
  Truck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listProducts } from '../services/productService.js';
import {
  createEntry,
  createPurchaseOrder,
  finalizePurchaseOrder,
  listEntries,
  listPurchaseOrders,
  listPurchaseSuggestions,
} from '../services/purchaseService.js';
import { listSuppliers } from '../services/supplierService.js';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters.js';

function createLineItem(produto = null) {
  return {
    key: `${Date.now()}-${Math.random()}`,
    produto_id: produto?.id ? String(produto.id) : '',
    quantidade: produto?.quantidade_sugerida ? String(produto.quantidade_sugerida) : '1',
    custo_unitario: produto?.custo ? String(produto.custo) : '',
  };
}

const INITIAL_ORDER_FORM = {
  fornecedor_id: '',
  data_prevista: '',
  observacoes: '',
  itens: [createLineItem()],
};

const INITIAL_ENTRY_FORM = {
  fornecedor_id: '',
  pedido_compra_id: '',
  numero_documento: '',
  observacoes: '',
  itens: [createLineItem()],
};

export default function Compras() {
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [orderForm, setOrderForm] = useState(INITIAL_ORDER_FORM);
  const [entryForm, setEntryForm] = useState(INITIAL_ENTRY_FORM);

  async function carregarDados() {
    try {
      setLoading(true);
      const [fornecedoresData, produtosData, sugestoesData, pedidosData, entradasData] =
        await Promise.all([
          listSuppliers({ limite: 200 }),
          listProducts({ limite: 200 }),
          listPurchaseSuggestions({ limite: 12 }),
          listPurchaseOrders({ limite: 20 }),
          listEntries({ limite: 20 }),
        ]);

      setFornecedores(fornecedoresData);
      setProdutos(produtosData);
      setSugestoes(sugestoesData);
      setPedidos(pedidosData);
      setEntradas(entradasData);
      setOrderForm((current) => ({
        ...current,
        fornecedor_id: current.fornecedor_id || String(fornecedoresData[0]?.id || ''),
      }));
      setEntryForm((current) => ({
        ...current,
        fornecedor_id: current.fornecedor_id || String(fornecedoresData[0]?.id || ''),
      }));
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const pedidosRascunho = useMemo(
    () => pedidos.filter((pedido) => pedido.status === 'rascunho' || pedido.status === 'emitido'),
    [pedidos]
  );

  function resetOrderForm(prefillItems = null) {
    setOrderForm({
      fornecedor_id: String(fornecedores[0]?.id || ''),
      data_prevista: '',
      observacoes: '',
      itens: prefillItems?.length ? prefillItems : [createLineItem()],
    });
  }

  function resetEntryForm(prefill = {}) {
    setEntryForm({
      fornecedor_id: String(prefill.fornecedor_id || fornecedores[0]?.id || ''),
      pedido_compra_id: prefill.pedido_compra_id ? String(prefill.pedido_compra_id) : '',
      numero_documento: '',
      observacoes: '',
      itens: prefill.itens?.length ? prefill.itens : [createLineItem()],
    });
  }

  function abrirPedidoComSugestao(produto) {
    resetOrderForm([
      createLineItem({
        id: produto.id,
        quantidade_sugerida: produto.quantidade_sugerida,
        custo: produto.custo,
      }),
    ]);
    setModalType('pedido');
    setFeedback(null);
  }

  function abrirNovoPedido() {
    resetOrderForm();
    setModalType('pedido');
    setFeedback(null);
  }

  function abrirNovaEntrada() {
    resetEntryForm();
    setModalType('entrada');
    setFeedback(null);
  }

  function abrirEntradaDoPedido(pedido) {
    resetEntryForm({
      fornecedor_id: pedido.fornecedor_id,
      pedido_compra_id: pedido.id,
    });
    setModalType('entrada');
    setFeedback(null);
  }

  function fecharModal() {
    setModalType(null);
  }

  function updateLineItem(formSetter, form, index, field, value) {
    const itens = form.itens.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    );
    formSetter({ ...form, itens });
  }

  function addLineItem(formSetter, form) {
    formSetter({
      ...form,
      itens: [...form.itens, createLineItem()],
    });
  }

  function removeLineItem(formSetter, form, index) {
    const itens = form.itens.filter((_, itemIndex) => itemIndex !== index);
    formSetter({
      ...form,
      itens: itens.length ? itens : [createLineItem()],
    });
  }

  function buildPayload(form) {
    return {
      fornecedor_id: Number(form.fornecedor_id),
      data_prevista: form.data_prevista || null,
      pedido_compra_id: form.pedido_compra_id ? Number(form.pedido_compra_id) : null,
      numero_documento: form.numero_documento || null,
      observacoes: form.observacoes || null,
      itens: form.itens.map((item) => ({
        produto_id: Number(item.produto_id),
        quantidade: Number(item.quantidade),
        custo_unitario: Number(item.custo_unitario || 0),
      })),
    };
  }

  async function salvarPedido(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await createPurchaseOrder(buildPayload(orderForm));
      setFeedback({ tone: 'success', message: 'Pedido de compra criado com sucesso.' });
      fecharModal();
      await carregarDados();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function salvarEntrada(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await createEntry(buildPayload(entryForm));
      setFeedback({ tone: 'success', message: 'Entrada de mercadoria registrada com sucesso.' });
      fecharModal();
      await carregarDados();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function finalizarPedidoLinha(pedido) {
    try {
      await finalizePurchaseOrder(pedido.id);
      setFeedback({ tone: 'success', message: `Pedido #${pedido.id} finalizado.` });
      await carregarDados();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    }
  }

  function renderLineItems(form, formSetter) {
    return (
      <div className="line-item-list">
        {form.itens.map((item, index) => (
          <div className="line-item-row" key={item.key}>
            <label className="field line-item-product">
              <span>Produto</span>
              <select
                value={item.produto_id}
                onChange={(event) =>
                  updateLineItem(formSetter, form, index, 'produto_id', event.target.value)
                }
              >
                <option value="">Selecione</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Qtd.</span>
              <input
                type="number"
                min="1"
                step="1"
                value={item.quantidade}
                onChange={(event) =>
                  updateLineItem(formSetter, form, index, 'quantidade', event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Custo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.custo_unitario}
                onChange={(event) =>
                  updateLineItem(formSetter, form, index, 'custo_unitario', event.target.value)
                }
              />
            </label>

            <div className="line-item-actions">
              <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(formSetter, form, index)}>
                Remover
              </Button>
            </div>
          </div>
        ))}

        <Button type="button" variant="secondary" size="sm" onClick={() => addLineItem(formSetter, form)}>
          <Plus size={16} />
          Adicionar item
        </Button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Compras e entradas</h2>
          <p>Monte pedidos, receba mercadorias e reponha o estoque com controle.</p>
        </div>

        <div className="inline-actions">
          <Button type="button" variant="secondary" onClick={carregarDados}>
            <RefreshCcw size={16} />
            Atualizar
          </Button>
          <Button type="button" onClick={abrirNovoPedido}>
            <ClipboardList size={16} />
            Novo pedido
          </Button>
          <Button type="button" variant="secondary" onClick={abrirNovaEntrada}>
            <PackagePlus size={16} />
            Nova entrada
          </Button>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Sugestoes de compra" value={sugestoes.length} icon={ShoppingBasket} />
        <Card title="Pedidos recentes" value={pedidos.length} icon={ClipboardList} />
        <Card title="Entradas recentes" value={entradas.length} icon={Truck} />
        <Card
          title="Pedidos em aberto"
          value={pedidosRascunho.length}
          helper="Rascunho ou emitido"
          icon={Receipt}
        />
      </div>

      {loading ? (
        <div className="loading-state">Carregando retaguarda de compras...</div>
      ) : (
        <>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>Sugestao de compra</h3>
                  <p>Itens abaixo do minimo para acelerar a reposicao.</p>
                </div>
              </div>

              {sugestoes.length ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Estoque</th>
                        <th>Minimo</th>
                        <th>Sugerido</th>
                        <th>Custo</th>
                        <th>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sugestoes.map((produto) => (
                        <tr key={produto.id}>
                          <td>{produto.nome}</td>
                          <td>{produto.estoque}</td>
                          <td>{produto.estoque_minimo}</td>
                          <td>{produto.quantidade_sugerida}</td>
                          <td>{formatCurrency(produto.custo)}</td>
                          <td>
                            <Button type="button" variant="ghost" size="sm" onClick={() => abrirPedidoComSugestao(produto)}>
                              Usar no pedido
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Sem sugestoes no momento"
                  description="Quando algum item chegar ao minimo, ele aparece aqui."
                />
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>Pedidos de compra</h3>
                  <p>Controle rapido de montagem, emissao e recebimento.</p>
                </div>
              </div>

              {pedidos.length ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Fornecedor</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th>Itens</th>
                        <th>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos.map((pedido) => (
                        <tr key={pedido.id}>
                          <td>#{pedido.id}</td>
                          <td>{pedido.fornecedor_nome}</td>
                          <td>
                            <StatusBadge
                              tone={
                                pedido.status === 'recebido'
                                  ? 'success'
                                  : pedido.status === 'emitido'
                                    ? 'primary'
                                    : 'warning'
                              }
                            >
                              {pedido.status}
                            </StatusBadge>
                          </td>
                          <td>{formatCurrency(pedido.total)}</td>
                          <td>{pedido.total_itens}</td>
                          <td>
                            <div className="table-actions">
                              {pedido.status === 'rascunho' ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => finalizarPedidoLinha(pedido)}
                                >
                                  Finalizar
                                </Button>
                              ) : null}
                              {pedido.status !== 'recebido' && pedido.status !== 'cancelado' ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => abrirEntradaDoPedido(pedido)}
                                >
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
                  title="Nenhum pedido criado"
                  description="Crie o primeiro pedido para iniciar a retaguarda de compras."
                />
              )}
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Entradas de mercadoria</h3>
                <p>Entradas recentes com atualizacao imediata de custo e estoque.</p>
              </div>
            </div>

            {entradas.length ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Entrada</th>
                      <th>Fornecedor</th>
                      <th>Documento</th>
                      <th>Total</th>
                      <th>Itens</th>
                      <th>Horario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradas.map((entrada) => (
                      <tr key={entrada.id}>
                        <td>#{entrada.id}</td>
                        <td>{entrada.fornecedor_nome}</td>
                        <td>{entrada.numero_documento || '-'}</td>
                        <td>{formatCurrency(entrada.total)}</td>
                        <td>{entrada.total_itens}</td>
                        <td>{formatDateTime(entrada.data_entrada)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Nenhuma entrada registrada"
                description="Assim que a primeira mercadoria for recebida, o historico aparece aqui."
              />
            )}
          </section>
        </>
      )}

      <Modal
        open={modalType === 'pedido'}
        onClose={fecharModal}
        title="Novo pedido de compra"
        description="Monte o pedido com fornecedor, itens e custo previsto."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="purchase-order-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar pedido'}
            </Button>
          </>
        }
      >
        <form id="purchase-order-form" className="form-grid" onSubmit={salvarPedido}>
          <label className="field">
            <span>Fornecedor</span>
            <select
              value={orderForm.fornecedor_id}
              onChange={(event) => setOrderForm({ ...orderForm, fornecedor_id: event.target.value })}
            >
              <option value="">Selecione</option>
              {fornecedores.map((fornecedor) => (
                <option key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.razao_social}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Data prevista</span>
            <input
              type="date"
              value={orderForm.data_prevista}
              onChange={(event) => setOrderForm({ ...orderForm, data_prevista: event.target.value })}
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="2"
              value={orderForm.observacoes}
              onChange={(event) => setOrderForm({ ...orderForm, observacoes: event.target.value })}
              placeholder="Use este campo para observacoes do pedido"
            />
          </label>

          <div className="field field-span-2">
            <span className="field-title">Itens do pedido</span>
            {renderLineItems(orderForm, setOrderForm)}
          </div>
        </form>
      </Modal>

      <Modal
        open={modalType === 'entrada'}
        onClose={fecharModal}
        title="Nova entrada de mercadoria"
        description="Receba a mercadoria e atualize estoque e custo no mesmo fluxo."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="entry-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar entrada'}
            </Button>
          </>
        }
      >
        <form id="entry-form" className="form-grid" onSubmit={salvarEntrada}>
          <label className="field">
            <span>Fornecedor</span>
            <select
              value={entryForm.fornecedor_id}
              onChange={(event) => setEntryForm({ ...entryForm, fornecedor_id: event.target.value })}
            >
              <option value="">Selecione</option>
              {fornecedores.map((fornecedor) => (
                <option key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.razao_social}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Pedido vinculado</span>
            <select
              value={entryForm.pedido_compra_id}
              onChange={(event) => setEntryForm({ ...entryForm, pedido_compra_id: event.target.value })}
            >
              <option value="">Sem vinculo</option>
              {pedidosRascunho
                .filter(
                  (pedido) =>
                    !entryForm.fornecedor_id || String(pedido.fornecedor_id) === String(entryForm.fornecedor_id)
                )
                .map((pedido) => (
                  <option key={pedido.id} value={pedido.id}>
                    #{pedido.id} - {pedido.fornecedor_nome}
                  </option>
                ))}
            </select>
          </label>

          <label className="field">
            <span>Documento</span>
            <input
              value={entryForm.numero_documento}
              onChange={(event) => setEntryForm({ ...entryForm, numero_documento: event.target.value })}
              placeholder="Numero da nota ou documento interno"
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="2"
              value={entryForm.observacoes}
              onChange={(event) => setEntryForm({ ...entryForm, observacoes: event.target.value })}
              placeholder="Campo opcional para observacoes da entrada"
            />
          </label>

          <div className="field field-span-2">
            <span className="field-title">Itens da entrada</span>
            {renderLineItems(entryForm, setEntryForm)}
          </div>
        </form>
      </Modal>
    </div>
  );
}
