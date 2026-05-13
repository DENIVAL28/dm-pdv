import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ClipboardList,
  PackageMinus,
  PackagePlus,
  PackageX,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listProducts } from '../services/productService.js';
import {
  cancelInventory,
  closeInventory,
  createInventory,
  createStockAdjustment,
  createStockLoss,
  getCurrentInventory,
  listInventories,
  listInventoryItems,
  listStockMovements,
  recordInventoryCount,
} from '../services/stockService.js';
import { formatDateTime, getStockStatus } from '../utils/formatters.js';

const INITIAL_ADJUSTMENT_FORM = {
  produto_id: '',
  tipo_ajuste: 'entrada',
  quantidade: '1',
  motivo: '',
  observacoes: '',
};

const INITIAL_LOSS_FORM = {
  produto_id: '',
  quantidade: '1',
  motivo: '',
  observacoes: '',
};

const INITIAL_INVENTORY_FORM = {
  nome: '',
  observacoes: '',
};

const INITIAL_COUNT_FORM = {
  saldo_contado: '',
};

const MOVEMENT_LABELS = {
  venda: 'Venda',
  cancelamento_venda: 'Cancelamento',
  entrada_mercadoria: 'Entrada',
  ajuste_entrada: 'Ajuste +',
  ajuste_saida: 'Ajuste -',
  perda: 'Perda',
  inventario_ajuste: 'Inventario',
};

const MOVEMENT_TONES = {
  venda: 'warning',
  cancelamento_venda: 'success',
  entrada_mercadoria: 'primary',
  ajuste_entrada: 'success',
  ajuste_saida: 'warning',
  perda: 'danger',
  inventario_ajuste: 'primary',
};

const INVENTORY_STATUS_LABELS = {
  aberto: 'Aberto',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const INVENTORY_STATUS_TONES = {
  aberto: 'primary',
  finalizado: 'success',
  cancelado: 'neutral',
};

function formatDifference(value) {
  if (value === null || value === undefined) {
    return '--';
  }

  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function getInventoryItemStatus(item) {
  if (item.saldo_contado === null || item.saldo_contado === undefined) {
    return { label: 'Pendente', tone: 'neutral' };
  }

  if (Number(item.diferenca) === 0) {
    return { label: 'Sem diferenca', tone: 'success' };
  }

  return { label: 'Divergencia', tone: 'warning' };
}

export default function Estoque() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [inventarioAtual, setInventarioAtual] = useState(null);
  const [itensInventario, setItensInventario] = useState([]);
  const [busca, setBusca] = useState('');
  const [buscaInventario, setBuscaInventario] = useState('');
  const [somenteCriticos, setSomenteCriticos] = useState(false);
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [adjustmentForm, setAdjustmentForm] = useState(INITIAL_ADJUSTMENT_FORM);
  const [lossForm, setLossForm] = useState(INITIAL_LOSS_FORM);
  const [inventoryForm, setInventoryForm] = useState(INITIAL_INVENTORY_FORM);
  const [countForm, setCountForm] = useState(INITIAL_COUNT_FORM);

  async function carregarPagina() {
    try {
      setLoading(true);

      const [produtosData, movimentosData, inventariosData, inventarioAtualData] = await Promise.all([
        listProducts({ limite: 200 }),
        listStockMovements({ limite: 20 }),
        listInventories({ limite: 8 }),
        getCurrentInventory(),
      ]);

      setProdutos(produtosData);
      setMovimentos(movimentosData);
      setInventarios(inventariosData);
      setInventarioAtual(inventarioAtualData);
      setAdjustmentForm((current) => ({
        ...current,
        produto_id: current.produto_id || String(produtosData[0]?.id || ''),
      }));
      setLossForm((current) => ({
        ...current,
        produto_id: current.produto_id || String(produtosData[0]?.id || ''),
      }));

      if (inventarioAtualData?.id) {
        setInventoryLoading(true);
        const itensData = await listInventoryItems(inventarioAtualData.id, { limite: 400 });
        setItensInventario(itensData);
      } else {
        setItensInventario([]);
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setInventoryLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPagina();
  }, []);

  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = useMemo(
    () =>
      produtos.filter((produto) => {
        const status = getStockStatus(produto);
        const correspondeBusca =
          !termo ||
          produto.nome.toLowerCase().includes(termo) ||
          String(produto.codigo_barras || '').includes(termo);

        if (!correspondeBusca) {
          return false;
        }

        return somenteCriticos ? status.tone !== 'success' : true;
      }),
    [produtos, termo, somenteCriticos]
  );

  const movimentosFiltrados = useMemo(
    () =>
      movimentos.filter((movimento) => {
        if (!termo) {
          return true;
        }

        return (
          movimento.produto_nome.toLowerCase().includes(termo) ||
          String(movimento.codigo_barras || '').includes(termo) ||
          String(movimento.origem || '').toLowerCase().includes(termo)
        );
      }),
    [movimentos, termo]
  );

  const termoInventario = buscaInventario.trim().toLowerCase();
  const itensInventarioFiltrados = useMemo(
    () =>
      itensInventario.filter((item) => {
        const correspondeBusca =
          !termoInventario ||
          item.produto_nome.toLowerCase().includes(termoInventario) ||
          String(item.codigo_barras || '').includes(termoInventario);

        if (!correspondeBusca) {
          return false;
        }

        return somentePendentes ? item.saldo_contado === null || item.saldo_contado === undefined : true;
      }),
    [itensInventario, termoInventario, somentePendentes]
  );

  function abrirModal(tipo) {
    setFeedback(null);
    setModalType(tipo);
  }

  function fecharModal() {
    setModalType(null);
    setSelectedInventoryItem(null);
  }

  function abrirModalContagem(item) {
    setFeedback(null);
    setSelectedInventoryItem(item);
    setCountForm({
      saldo_contado:
        item.saldo_contado === null || item.saldo_contado === undefined
          ? String(item.estoque_atual)
          : String(item.saldo_contado),
    });
    setModalType('contagem');
  }

  async function salvarAjuste(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await createStockAdjustment({
        produto_id: Number(adjustmentForm.produto_id),
        tipo_ajuste: adjustmentForm.tipo_ajuste,
        quantidade: Number(adjustmentForm.quantidade),
        motivo: adjustmentForm.motivo,
        observacoes: adjustmentForm.observacoes || null,
      });
      setFeedback({ tone: 'success', message: 'Ajuste de estoque registrado com sucesso.' });
      setAdjustmentForm((current) => ({
        ...INITIAL_ADJUSTMENT_FORM,
        produto_id: current.produto_id,
      }));
      fecharModal();
      await carregarPagina();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function salvarPerda(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await createStockLoss({
        produto_id: Number(lossForm.produto_id),
        quantidade: Number(lossForm.quantidade),
        motivo: lossForm.motivo,
        observacoes: lossForm.observacoes || null,
      });
      setFeedback({ tone: 'success', message: 'Perda de estoque registrada com sucesso.' });
      setLossForm((current) => ({
        ...INITIAL_LOSS_FORM,
        produto_id: current.produto_id,
      }));
      fecharModal();
      await carregarPagina();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function salvarInventario(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await createInventory({
        nome: inventoryForm.nome,
        observacoes: inventoryForm.observacoes || null,
      });
      setFeedback({ tone: 'success', message: 'Inventario aberto com sucesso.' });
      setInventoryForm(INITIAL_INVENTORY_FORM);
      fecharModal();
      await carregarPagina();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function salvarContagem(event) {
    event.preventDefault();

    if (!inventarioAtual?.id || !selectedInventoryItem) {
      return;
    }

    try {
      setSaving(true);
      await recordInventoryCount(inventarioAtual.id, {
        produto_id: selectedInventoryItem.produto_id,
        saldo_contado: Number(countForm.saldo_contado),
      });
      setFeedback({
        tone: 'success',
        message: `Contagem registrada para ${selectedInventoryItem.produto_nome}.`,
      });
      fecharModal();
      await carregarPagina();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function finalizarInventarioAtual() {
    if (!inventarioAtual?.id) {
      return;
    }

    if (!window.confirm('Finalizar este inventario e aplicar os ajustes contados no estoque?')) {
      return;
    }

    try {
      setSaving(true);
      const data = await closeInventory(inventarioAtual.id);
      setFeedback({
        tone: 'success',
        message: `Inventario finalizado com ${data.itens_ajustados} ajuste(s) aplicado(s).`,
      });
      await carregarPagina();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function cancelarInventarioAtual() {
    if (!inventarioAtual?.id) {
      return;
    }

    if (!window.confirm('Cancelar este inventario aberto? Nenhum ajuste sera aplicado.')) {
      return;
    }

    try {
      setSaving(true);
      await cancelInventory(inventarioAtual.id);
      setFeedback({ tone: 'success', message: 'Inventario cancelado com sucesso.' });
      await carregarPagina();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  const estoqueBaixo = produtos.filter((produto) => getStockStatus(produto).tone === 'warning').length;
  const semEstoque = produtos.filter((produto) => getStockStatus(produto).tone === 'danger').length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Estoque e inventario</h2>
          <p>Saldo, movimentacao auditavel, perdas, ajustes e contagem no mesmo modulo.</p>
        </div>

        <div className="inline-actions">
          <Button type="button" variant="secondary" onClick={() => navigate('/app/produtos')}>
            Ajustar produtos
          </Button>
          <Button type="button" variant="secondary" onClick={() => abrirModal('inventario')}>
            <ClipboardList size={16} />
            Novo inventario
          </Button>
          <Button type="button" variant="secondary" onClick={() => abrirModal('ajuste')}>
            <PackagePlus size={16} />
            Ajuste
          </Button>
          <Button type="button" onClick={() => abrirModal('perda')}>
            <PackageMinus size={16} />
            Perda
          </Button>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Itens ativos" value={produtos.length} icon={Box} />
        <Card title="Estoque baixo" value={estoqueBaixo} icon={AlertTriangle} tone="warning" />
        <Card title="Sem estoque" value={semEstoque} icon={PackageX} tone="warning" />
        <Card title="Movimentos recentes" value={movimentos.length} icon={PackagePlus} />
      </div>

      {(estoqueBaixo || semEstoque) && !loading ? (
        <FeedbackBanner tone="info">
          {semEstoque
            ? `${semEstoque} item(ns) estao sem estoque e ${estoqueBaixo} item(ns) estao abaixo do minimo.`
            : `${estoqueBaixo} item(ns) estao abaixo do estoque minimo.`}
        </FeedbackBanner>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Inventario em andamento</h3>
            <p>Abra uma contagem, registre o saldo fisico e finalize quando estiver conferido.</p>
          </div>

          <div className="inline-actions">
            <Button type="button" variant="secondary" onClick={carregarPagina}>
              Atualizar
            </Button>
            {inventarioAtual ? (
              <>
                <Button type="button" variant="secondary" onClick={cancelarInventarioAtual} disabled={saving}>
                  Cancelar inventario
                </Button>
                <Button type="button" onClick={finalizarInventarioAtual} disabled={saving}>
                  Finalizar inventario
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {inventarioAtual ? (
          <>
            <div className="inventory-summary-grid">
              <div className="helper-card inventory-summary-card">
                <span>Inventario aberto</span>
                <strong>{inventarioAtual.nome}</strong>
                <small>
                  {inventarioAtual.usuario_nome} em {formatDateTime(inventarioAtual.data_inicio)}
                </small>
              </div>

              <div className="helper-card inventory-summary-card">
                <span>Status</span>
                <strong>
                  <StatusBadge tone={INVENTORY_STATUS_TONES[inventarioAtual.status] || 'neutral'}>
                    {INVENTORY_STATUS_LABELS[inventarioAtual.status] || inventarioAtual.status}
                  </StatusBadge>
                </strong>
                <small>{inventarioAtual.observacoes || 'Sem observacoes neste inventario.'}</small>
              </div>

              <div className="helper-card inventory-summary-card">
                <span>Progresso</span>
                <strong>
                  {inventarioAtual.itens_contados} / {inventarioAtual.total_itens}
                </strong>
                <small>{inventarioAtual.itens_pendentes} item(ns) pendentes de contagem.</small>
              </div>

              <div className="helper-card inventory-summary-card">
                <span>Divergencias</span>
                <strong>{inventarioAtual.itens_com_diferenca}</strong>
                <small>Itens contados com diferenca em relacao ao sistema.</small>
              </div>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <Search size={16} />
                <input
                  placeholder="Buscar item do inventario"
                  value={buscaInventario}
                  onChange={(event) => setBuscaInventario(event.target.value)}
                />
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={somentePendentes}
                  onChange={(event) => setSomentePendentes(event.target.checked)}
                />
                <span>Mostrar apenas itens pendentes</span>
              </label>
            </div>

            {inventoryLoading ? (
              <div className="loading-state">Carregando itens do inventario...</div>
            ) : itensInventarioFiltrados.length ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Codigo</th>
                      <th>Sistema</th>
                      <th>Contado</th>
                      <th>Diferenca</th>
                      <th>Status</th>
                      <th>Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensInventarioFiltrados.map((item) => {
                      const status = getInventoryItemStatus(item);

                      return (
                        <tr key={item.id}>
                          <td>{item.produto_nome}</td>
                          <td>{item.codigo_barras || '-'}</td>
                          <td>{item.saldo_sistema}</td>
                          <td>{item.saldo_contado ?? '-'}</td>
                          <td>{formatDifference(item.diferenca)}</td>
                          <td>
                            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                          </td>
                          <td>
                            <div className="table-actions">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirModalContagem(item)}
                              >
                                Contar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Nenhum item localizado"
                description="Ajuste a busca ou revise os filtros da contagem."
              />
            )}
          </>
        ) : (
          <EmptyState
            title="Sem inventario aberto"
            description="Abra um inventario para iniciar a contagem fisica do estoque."
            action={
              <Button type="button" onClick={() => abrirModal('inventario')}>
                Abrir inventario
              </Button>
            }
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Historico de inventarios</h3>
            <p>Ultimos inventarios abertos, finalizados ou cancelados.</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Carregando historico de inventarios...</div>
        ) : inventarios.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Inventario</th>
                  <th>Status</th>
                  <th>Itens</th>
                  <th>Contados</th>
                  <th>Divergencias</th>
                  <th>Inicio</th>
                  <th>Fim</th>
                </tr>
              </thead>
              <tbody>
                {inventarios.map((inventario) => (
                  <tr key={inventario.id}>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{inventario.nome}</strong>
                        <span>{inventario.usuario_nome}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge tone={INVENTORY_STATUS_TONES[inventario.status] || 'neutral'}>
                        {INVENTORY_STATUS_LABELS[inventario.status] || inventario.status}
                      </StatusBadge>
                    </td>
                    <td>{inventario.total_itens}</td>
                    <td>{inventario.itens_contados}</td>
                    <td>{inventario.itens_com_diferenca}</td>
                    <td>{formatDateTime(inventario.data_inicio)}</td>
                    <td>{formatDateTime(inventario.data_fim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum inventario registrado"
            description="Assim que a primeira contagem for aberta, o historico aparece aqui."
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Lista de estoque</h3>
            <p>Use a busca para localizar por nome ou codigo de barras.</p>
          </div>

          <Button type="button" variant="secondary" onClick={carregarPagina}>
            Atualizar
          </Button>
        </div>

        <div className="toolbar">
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar produto"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={somenteCriticos}
              onChange={(event) => setSomenteCriticos(event.target.checked)}
            />
            <span>Mostrar apenas itens com atencao</span>
          </label>
        </div>

        {loading ? (
          <div className="loading-state">Carregando estoque...</div>
        ) : produtosFiltrados.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Codigo</th>
                  <th>Estoque</th>
                  <th>Minimo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((produto) => {
                  const status = getStockStatus(produto);

                  return (
                    <tr key={produto.id}>
                      <td>{produto.nome}</td>
                      <td>{produto.codigo_barras || '-'}</td>
                      <td>{produto.estoque}</td>
                      <td>{produto.estoque_minimo}</td>
                      <td>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Ajuste os filtros ou cadastre novos produtos para comecar."
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Movimentacao do estoque</h3>
            <p>Saidas, entradas, ajustes, perdas e inventario em ordem cronologica.</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Carregando movimentacoes...</div>
        ) : movimentosFiltrados.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Saldo</th>
                  <th>Origem</th>
                  <th>Horario</th>
                </tr>
              </thead>
              <tbody>
                {movimentosFiltrados.map((movimento) => (
                  <tr key={movimento.id}>
                    <td>
                      <StatusBadge tone={MOVEMENT_TONES[movimento.tipo] || 'neutral'}>
                        {MOVEMENT_LABELS[movimento.tipo] || movimento.tipo}
                      </StatusBadge>
                    </td>
                    <td>{movimento.produto_nome}</td>
                    <td>{movimento.quantidade}</td>
                    <td>{`${movimento.saldo_anterior} -> ${movimento.saldo_posterior}`}</td>
                    <td>
                      {movimento.origem_id ? `${movimento.origem} #${movimento.origem_id}` : movimento.origem}
                    </td>
                    <td>{formatDateTime(movimento.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sem movimentacoes ainda"
            description="Assim que houver venda, entrada, ajuste, perda ou inventario, o historico aparece aqui."
          />
        )}
      </section>

      <Modal
        open={modalType === 'inventario'}
        onClose={fecharModal}
        title="Abrir inventario"
        description="Crie uma contagem para congelar o saldo do sistema e iniciar a conferencia."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="stock-inventory-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Abrir inventario'}
            </Button>
          </>
        }
      >
        <form id="stock-inventory-form" className="form-grid" onSubmit={salvarInventario}>
          <label className="field field-span-2">
            <span>Nome do inventario</span>
            <input
              value={inventoryForm.nome}
              onChange={(event) => setInventoryForm({ ...inventoryForm, nome: event.target.value })}
              placeholder="Ex.: Contagem geral da loja"
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="3"
              value={inventoryForm.observacoes}
              onChange={(event) =>
                setInventoryForm({ ...inventoryForm, observacoes: event.target.value })
              }
              placeholder="Campo opcional para orientar a equipe na contagem"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={modalType === 'contagem'}
        onClose={fecharModal}
        title="Registrar contagem"
        description={
          selectedInventoryItem
            ? `Informe o saldo fisico contado para ${selectedInventoryItem.produto_nome}.`
            : 'Informe o saldo fisico contado.'
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="stock-count-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar contagem'}
            </Button>
          </>
        }
      >
        <form id="stock-count-form" className="form-grid" onSubmit={salvarContagem}>
          <label className="field">
            <span>Saldo do sistema</span>
            <input value={selectedInventoryItem?.saldo_sistema ?? ''} disabled />
          </label>

          <label className="field">
            <span>Saldo contado</span>
            <input
              type="number"
              min="0"
              step="1"
              value={countForm.saldo_contado}
              onChange={(event) => setCountForm({ saldo_contado: event.target.value })}
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={modalType === 'ajuste'}
        onClose={fecharModal}
        title="Ajuste de estoque"
        description="Use ajuste para corrigir saldo manualmente com motivo registrado."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="stock-adjustment-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar ajuste'}
            </Button>
          </>
        }
      >
        <form id="stock-adjustment-form" className="form-grid" onSubmit={salvarAjuste}>
          <label className="field field-span-2">
            <span>Produto</span>
            <select
              value={adjustmentForm.produto_id}
              onChange={(event) =>
                setAdjustmentForm({ ...adjustmentForm, produto_id: event.target.value })
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
            <span>Tipo de ajuste</span>
            <select
              value={adjustmentForm.tipo_ajuste}
              onChange={(event) =>
                setAdjustmentForm({ ...adjustmentForm, tipo_ajuste: event.target.value })
              }
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
            </select>
          </label>

          <label className="field">
            <span>Quantidade</span>
            <input
              type="number"
              min="1"
              step="1"
              value={adjustmentForm.quantidade}
              onChange={(event) =>
                setAdjustmentForm({ ...adjustmentForm, quantidade: event.target.value })
              }
            />
          </label>

          <label className="field field-span-2">
            <span>Motivo</span>
            <input
              value={adjustmentForm.motivo}
              onChange={(event) => setAdjustmentForm({ ...adjustmentForm, motivo: event.target.value })}
              placeholder="Ex.: acerto de cadastro ou conferencia de deposito"
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="3"
              value={adjustmentForm.observacoes}
              onChange={(event) =>
                setAdjustmentForm({ ...adjustmentForm, observacoes: event.target.value })
              }
              placeholder="Campo opcional para detalhar o ajuste"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={modalType === 'perda'}
        onClose={fecharModal}
        title="Registrar perda"
        description="Use perda para itens vencidos, quebrados ou descartados."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="stock-loss-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar perda'}
            </Button>
          </>
        }
      >
        <form id="stock-loss-form" className="form-grid" onSubmit={salvarPerda}>
          <label className="field field-span-2">
            <span>Produto</span>
            <select
              value={lossForm.produto_id}
              onChange={(event) => setLossForm({ ...lossForm, produto_id: event.target.value })}
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
            <span>Quantidade</span>
            <input
              type="number"
              min="1"
              step="1"
              value={lossForm.quantidade}
              onChange={(event) => setLossForm({ ...lossForm, quantidade: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Motivo</span>
            <input
              value={lossForm.motivo}
              onChange={(event) => setLossForm({ ...lossForm, motivo: event.target.value })}
              placeholder="Ex.: avaria, vencimento ou quebra"
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="3"
              value={lossForm.observacoes}
              onChange={(event) => setLossForm({ ...lossForm, observacoes: event.target.value })}
              placeholder="Campo opcional para detalhar a perda"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
