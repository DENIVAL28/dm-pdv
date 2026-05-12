import React from 'react';
import { BadgeCheck, ContactRound, Phone, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import {
  createCustomer,
  listCustomers,
  removeCustomer,
  updateCustomer,
} from '../services/customerService.js';
import { formatDate } from '../utils/formatters.js';

const INITIAL_FORM = {
  nome: '',
  documento: '',
  telefone: '',
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function carregarClientes(searchValue = busca) {
    try {
      setLoading(true);
      const data = await listCustomers({ busca: searchValue });
      setClientes(data);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  function abrirNovoCliente() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFeedback(null);
    setModalOpen(true);
  }

  function abrirEdicao(cliente) {
    setEditingId(cliente.id);
    setForm({
      nome: cliente.nome,
      documento: cliente.documento || '',
      telefone: cliente.telefone || '',
    });
    setFeedback(null);
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  async function salvarCliente(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingId) {
        await updateCustomer(editingId, form);
        setFeedback({ tone: 'success', message: 'Cliente atualizado com sucesso.' });
      } else {
        await createCustomer(form);
        setFeedback({ tone: 'success', message: 'Cliente cadastrado com sucesso.' });
      }

      fecharModal();
      await carregarClientes();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function excluirCliente(cliente) {
    const confirmed = window.confirm(`Deseja remover o cliente "${cliente.nome}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await removeCustomer(cliente.id);
      setFeedback({ tone: 'success', message: 'Cliente removido com sucesso.' });
      await carregarClientes();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    carregarClientes(busca);
  }

  const clientesComDocumento = clientes.filter((cliente) => cliente.documento).length;
  const clientesComTelefone = clientes.filter((cliente) => cliente.telefone).length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Clientes</h2>
          <p>Cadastre contatos que podem ser vinculados a venda sem atrasar o caixa.</p>
        </div>

        <Button type="button" onClick={abrirNovoCliente}>
          <Plus size={16} />
          Novo cliente
        </Button>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Clientes cadastrados" value={clientes.length} icon={ContactRound} />
        <Card title="Com documento" value={clientesComDocumento} icon={BadgeCheck} tone="primary" />
        <Card title="Com telefone" value={clientesComTelefone} icon={Phone} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Base de clientes</h3>
            <p>Pesquise por nome, documento ou telefone para localizar rapidamente.</p>
          </div>

          <Button type="button" variant="secondary" onClick={() => carregarClientes()}>
            Atualizar
          </Button>
        </div>

        <form className="toolbar" onSubmit={handleSearchSubmit}>
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar cliente"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>

          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        {loading ? (
          <div className="loading-state">Carregando clientes...</div>
        ) : clientes.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Telefone</th>
                  <th>Cadastro</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>{cliente.nome}</td>
                    <td>{cliente.documento || '-'}</td>
                    <td>{cliente.telefone || '-'}</td>
                    <td>{formatDate(cliente.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <Button type="button" variant="ghost" size="sm" onClick={() => abrirEdicao(cliente)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => excluirCliente(cliente)}
                        >
                          Remover
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
            title="Nenhum cliente encontrado"
            description="Cadastre clientes para deixar a identificacao das vendas pronta quando precisar."
          />
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={editingId ? 'Editar cliente' : 'Novo cliente'}
        description="Preencha os dados que ajudam a localizar e identificar o cliente na venda."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="cliente-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="cliente-form" className="form-grid" onSubmit={salvarCliente}>
          <label className="field field-span-2">
            <span>Nome</span>
            <input
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
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
        </form>
      </Modal>
    </div>
  );
}
