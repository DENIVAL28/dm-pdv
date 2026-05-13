import React from 'react';
import { Building2, FileBadge2, Mail, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import {
  createSupplier,
  listSuppliers,
  removeSupplier,
  updateSupplier,
} from '../services/supplierService.js';
import { formatDate } from '../utils/formatters.js';

const INITIAL_FORM = {
  razao_social: '',
  nome_fantasia: '',
  documento: '',
  telefone: '',
  email: '',
  contato_nome: '',
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function carregarFornecedores(searchValue = busca) {
    try {
      setLoading(true);
      const data = await listSuppliers({ busca: searchValue });
      setFornecedores(data);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarFornecedores();
  }, []);

  function abrirNovoFornecedor() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFeedback(null);
    setModalOpen(true);
  }

  function abrirEdicao(fornecedor) {
    setEditingId(fornecedor.id);
    setForm({
      razao_social: fornecedor.razao_social,
      nome_fantasia: fornecedor.nome_fantasia || '',
      documento: fornecedor.documento || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      contato_nome: fornecedor.contato_nome || '',
    });
    setFeedback(null);
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  async function salvarFornecedor(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingId) {
        await updateSupplier(editingId, form);
        setFeedback({ tone: 'success', message: 'Fornecedor atualizado com sucesso.' });
      } else {
        await createSupplier(form);
        setFeedback({ tone: 'success', message: 'Fornecedor cadastrado com sucesso.' });
      }

      fecharModal();
      await carregarFornecedores();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function excluirFornecedor(fornecedor) {
    const confirmed = window.confirm(`Deseja desativar o fornecedor "${fornecedor.razao_social}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await removeSupplier(fornecedor.id);
      setFeedback({ tone: 'success', message: 'Fornecedor desativado com sucesso.' });
      await carregarFornecedores();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    carregarFornecedores(busca);
  }

  const comDocumento = fornecedores.filter((item) => item.documento).length;
  const comEmail = fornecedores.filter((item) => item.email).length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Fornecedores</h2>
          <p>Cadastre os parceiros usados em compras, entradas e reposicao de estoque.</p>
        </div>

        <Button type="button" onClick={abrirNovoFornecedor}>
          <Plus size={16} />
          Novo fornecedor
        </Button>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Fornecedores ativos" value={fornecedores.length} icon={Building2} />
        <Card title="Com documento" value={comDocumento} icon={FileBadge2} />
        <Card title="Com e-mail" value={comEmail} icon={Mail} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Base de fornecedores</h3>
            <p>Pesquise por razao social, nome fantasia ou documento.</p>
          </div>

          <Button type="button" variant="secondary" onClick={() => carregarFornecedores()}>
            Atualizar
          </Button>
        </div>

        <form className="toolbar" onSubmit={handleSearchSubmit}>
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar fornecedor"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>

          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        {loading ? (
          <div className="loading-state">Carregando fornecedores...</div>
        ) : fornecedores.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Razao social</th>
                  <th>Fantasia</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Cadastro</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((fornecedor) => (
                  <tr key={fornecedor.id}>
                    <td>{fornecedor.razao_social}</td>
                    <td>{fornecedor.nome_fantasia || '-'}</td>
                    <td>{fornecedor.documento || '-'}</td>
                    <td>
                      {[fornecedor.contato_nome, fornecedor.telefone, fornecedor.email]
                        .filter(Boolean)
                        .join(' | ') || '-'}
                    </td>
                    <td>{formatDate(fornecedor.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <Button type="button" variant="ghost" size="sm" onClick={() => abrirEdicao(fornecedor)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => excluirFornecedor(fornecedor)}
                        >
                          Desativar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum fornecedor encontrado"
            description="Cadastre fornecedores para estruturar pedidos de compra e entradas."
          />
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={editingId ? 'Editar fornecedor' : 'Novo fornecedor'}
        description="Preencha os dados basicos do fornecedor para usar na retaguarda."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="supplier-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="supplier-form" className="form-grid" onSubmit={salvarFornecedor}>
          <label className="field field-span-2">
            <span>Razao social</span>
            <input
              value={form.razao_social}
              onChange={(event) => setForm({ ...form, razao_social: event.target.value })}
            />
          </label>

          <label className="field field-span-2">
            <span>Nome fantasia</span>
            <input
              value={form.nome_fantasia}
              onChange={(event) => setForm({ ...form, nome_fantasia: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Documento</span>
            <input
              value={form.documento}
              onChange={(event) => setForm({ ...form, documento: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Telefone</span>
            <input
              value={form.telefone}
              onChange={(event) => setForm({ ...form, telefone: event.target.value })}
            />
          </label>

          <label className="field">
            <span>E-mail</span>
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Contato</span>
            <input
              value={form.contato_nome}
              onChange={(event) => setForm({ ...form, contato_nome: event.target.value })}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
