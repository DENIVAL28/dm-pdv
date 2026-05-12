import React from 'react';
import { AlertTriangle, Package, PackageX, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  createProduct,
  listProducts,
  removeProduct,
  updateProduct,
} from '../services/productService.js';
import { formatCurrency, getStockStatus } from '../utils/formatters.js';

const INITIAL_FORM = {
  nome: '',
  codigo_barras: '',
  preco: '',
  estoque: '',
  estoque_minimo: '5',
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function carregarProdutos(searchValue = busca) {
    try {
      setLoading(true);
      const data = await listProducts({ busca: searchValue });
      setProdutos(data);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  function abrirNovoProduto() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFeedback(null);
    setModalOpen(true);
  }

  function abrirEdicao(produto) {
    setEditingId(produto.id);
    setForm({
      nome: produto.nome,
      codigo_barras: produto.codigo_barras || '',
      preco: String(produto.preco),
      estoque: String(produto.estoque),
      estoque_minimo: String(produto.estoque_minimo),
    });
    setFeedback(null);
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  async function salvarProduto(event) {
    event.preventDefault();

    try {
      setSaving(true);
      const payload = {
        ...form,
        preco: Number(form.preco),
        estoque: Number(form.estoque),
        estoque_minimo: Number(form.estoque_minimo),
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        setFeedback({ tone: 'success', message: 'Produto atualizado com sucesso.' });
      } else {
        await createProduct(payload);
        setFeedback({ tone: 'success', message: 'Produto cadastrado com sucesso.' });
      }

      fecharModal();
      await carregarProdutos();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function excluirProduto(produto) {
    const confirmed = window.confirm(`Deseja desativar o produto "${produto.nome}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await removeProduct(produto.id);
      setFeedback({ tone: 'success', message: 'Produto desativado com sucesso.' });
      await carregarProdutos();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    carregarProdutos(busca);
  }

  const estoqueBaixo = produtos.filter((produto) => getStockStatus(produto).tone === 'warning').length;
  const semEstoque = produtos.filter((produto) => getStockStatus(produto).tone === 'danger').length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Produtos</h2>
          <p>Cadastre, edite e acompanhe o estoque minimo de cada item.</p>
        </div>

        <Button type="button" onClick={abrirNovoProduto}>
          <Plus size={16} />
          Novo produto
        </Button>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Produtos ativos" value={produtos.length} icon={Package} />
        <Card title="Estoque baixo" value={estoqueBaixo} icon={AlertTriangle} tone="warning" />
        <Card title="Sem estoque" value={semEstoque} icon={PackageX} tone="warning" />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Catalogo</h3>
            <p>Use a busca para filtrar por nome ou codigo de barras.</p>
          </div>

          <Button type="button" variant="secondary" onClick={() => carregarProdutos()}>
            Atualizar
          </Button>
        </div>

        <form className="toolbar" onSubmit={handleSearchSubmit}>
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar produto"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>

          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        {loading ? (
          <div className="loading-state">Carregando produtos...</div>
        ) : produtos.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Codigo</th>
                  <th>Preco</th>
                  <th>Estoque</th>
                  <th>Minimo</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => {
                  const status = getStockStatus(produto);

                  return (
                    <tr key={produto.id}>
                      <td>{produto.nome}</td>
                      <td>{produto.codigo_barras || '-'}</td>
                      <td>{formatCurrency(produto.preco)}</td>
                      <td>{produto.estoque}</td>
                      <td>{produto.estoque_minimo}</td>
                      <td>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Button type="button" variant="ghost" size="sm" onClick={() => abrirEdicao(produto)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => excluirProduto(produto)}
                          >
                            Desativar
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
            title="Nenhum produto encontrado"
            description="Cadastre um produto para iniciar o controle do catalogo."
          />
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={editingId ? 'Editar produto' : 'Novo produto'}
        description="Preencha os campos necessarios para deixar o item disponivel no PDV."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="produto-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="produto-form" className="form-grid" onSubmit={salvarProduto}>
          <label className="field field-span-2">
            <span>Nome</span>
            <input
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
            />
          </label>

          <label className="field field-span-2">
            <span>Codigo de barras</span>
            <input
              value={form.codigo_barras}
              onChange={(event) => setForm({ ...form, codigo_barras: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Preco</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.preco}
              onChange={(event) => setForm({ ...form, preco: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Estoque atual</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.estoque}
              onChange={(event) => setForm({ ...form, estoque: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Estoque minimo</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.estoque_minimo}
              onChange={(event) => setForm({ ...form, estoque_minimo: event.target.value })}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
