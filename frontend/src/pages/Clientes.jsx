import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  ContactRound,
  History,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  WalletCards,
} from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  createCustomer,
  getCustomerProfile,
  listCustomers,
  removeCustomer,
  saveCustomerAddress,
  saveCustomerContact,
  updateCustomer,
  updateCustomerCredit,
  removeCustomerAddress,
  removeCustomerContact,
} from '../services/customerService.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaymentMethod,
} from '../utils/formatters.js';

const INITIAL_CUSTOMER_FORM = {
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  data_nascimento: '',
  observacoes: '',
  ativo: true,
};

const INITIAL_ADDRESS_FORM = {
  titulo: 'Principal',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  principal: true,
};

const INITIAL_CONTACT_FORM = {
  nome: '',
  funcao: '',
  telefone: '',
  whatsapp: '',
  email: '',
  observacoes: '',
};

const INITIAL_CREDIT_FORM = {
  limite_credito: '0.00',
  dias_vencimento: '30',
  ativo: false,
  observacoes: '',
};

function getCustomerStatus(customer) {
  if (!customer?.ativo) {
    return { label: 'Inativo', tone: 'danger' };
  }

  if (customer?.credito_ativo) {
    return { label: 'Credito ativo', tone: 'primary' };
  }

  return { label: 'Ativo', tone: 'success' };
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingContactId, setEditingContactId] = useState(null);

  const [customerForm, setCustomerForm] = useState(INITIAL_CUSTOMER_FORM);
  const [addressForm, setAddressForm] = useState(INITIAL_ADDRESS_FORM);
  const [contactForm, setContactForm] = useState(INITIAL_CONTACT_FORM);
  const [creditForm, setCreditForm] = useState(INITIAL_CREDIT_FORM);

  async function loadCustomers(searchValue = busca, preferredId = selectedId) {
    try {
      setLoading(true);
      const data = await listCustomers({ busca: searchValue, limite: 120 });
      setClientes(data);

      if (!data.length) {
        setSelectedId(null);
        setProfile(null);
        return;
      }

      const nextSelectedId =
        preferredId && data.some((item) => item.id === preferredId) ? preferredId : data[0].id;
      setSelectedId(nextSelectedId);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(customerId) {
    if (!customerId) {
      setProfile(null);
      return;
    }

    try {
      setProfileLoading(true);
      const data = await getCustomerProfile(customerId);
      setProfile(data);
      setCreditForm({
        limite_credito: String(data.credito?.limite_credito ?? '0.00'),
        dias_vencimento: String(data.credito?.dias_vencimento ?? '30'),
        ativo: Boolean(data.credito?.ativo),
        observacoes: data.credito?.observacoes || '',
      });
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadProfile(selectedId);
    }
  }, [selectedId]);

  function openNewCustomer() {
    setEditingCustomerId(null);
    setCustomerForm(INITIAL_CUSTOMER_FORM);
    setCustomerModalOpen(true);
  }

  function openEditCustomer(customer) {
    setEditingCustomerId(customer.id);
    setCustomerForm({
      nome: customer.nome || '',
      documento: customer.documento || '',
      telefone: customer.telefone || '',
      email: customer.email || '',
      data_nascimento: customer.data_nascimento ? String(customer.data_nascimento).slice(0, 10) : '',
      observacoes: customer.observacoes || '',
      ativo: Boolean(customer.ativo),
    });
    setCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setCustomerModalOpen(false);
    setEditingCustomerId(null);
    setCustomerForm(INITIAL_CUSTOMER_FORM);
  }

  function openAddressModal(address = null) {
    setEditingAddressId(address?.id || null);
    setAddressForm(
      address
        ? {
            titulo: address.titulo || '',
            cep: address.cep || '',
            logradouro: address.logradouro || '',
            numero: address.numero || '',
            complemento: address.complemento || '',
            bairro: address.bairro || '',
            cidade: address.cidade || '',
            estado: address.estado || '',
            principal: Boolean(address.principal),
          }
        : INITIAL_ADDRESS_FORM
    );
    setAddressModalOpen(true);
  }

  function closeAddressModal() {
    setAddressModalOpen(false);
    setEditingAddressId(null);
    setAddressForm(INITIAL_ADDRESS_FORM);
  }

  function openContactModal(contact = null) {
    setEditingContactId(contact?.id || null);
    setContactForm(
      contact
        ? {
            nome: contact.nome || '',
            funcao: contact.funcao || '',
            telefone: contact.telefone || '',
            whatsapp: contact.whatsapp || '',
            email: contact.email || '',
            observacoes: contact.observacoes || '',
          }
        : INITIAL_CONTACT_FORM
    );
    setContactModalOpen(true);
  }

  function closeContactModal() {
    setContactModalOpen(false);
    setEditingContactId(null);
    setContactForm(INITIAL_CONTACT_FORM);
  }

  function openCreditModal() {
    if (!profile) {
      return;
    }

    setCreditForm({
      limite_credito: String(profile.credito?.limite_credito ?? '0.00'),
      dias_vencimento: String(profile.credito?.dias_vencimento ?? '30'),
      ativo: Boolean(profile.credito?.ativo),
      observacoes: profile.credito?.observacoes || '',
    });
    setCreditModalOpen(true);
  }

  function closeCreditModal() {
    setCreditModalOpen(false);
    setCreditForm(INITIAL_CREDIT_FORM);
  }

  async function handleSaveCustomer(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingCustomerId) {
        const updated = await updateCustomer(editingCustomerId, customerForm);
        setFeedback({ tone: 'success', message: 'Cliente atualizado com sucesso.' });
        await loadCustomers(busca, updated.id);
        await loadProfile(updated.id);
      } else {
        const created = await createCustomer(customerForm);
        setFeedback({ tone: 'success', message: 'Cliente cadastrado com sucesso.' });
        await loadCustomers(busca, created.id);
        await loadProfile(created.id);
      }

      closeCustomerModal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAddress(event) {
    event.preventDefault();

    if (!selectedId) {
      return;
    }

    try {
      setSaving(true);
      const updated = await saveCustomerAddress(selectedId, addressForm, editingAddressId);
      setProfile(updated);
      await loadCustomers(busca, selectedId);
      setFeedback({
        tone: 'success',
        message: editingAddressId ? 'Endereco atualizado com sucesso.' : 'Endereco adicionado com sucesso.',
      });
      closeAddressModal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveContact(event) {
    event.preventDefault();

    if (!selectedId) {
      return;
    }

    try {
      setSaving(true);
      const updated = await saveCustomerContact(selectedId, contactForm, editingContactId);
      setProfile(updated);
      await loadCustomers(busca, selectedId);
      setFeedback({
        tone: 'success',
        message: editingContactId ? 'Contato atualizado com sucesso.' : 'Contato adicionado com sucesso.',
      });
      closeContactModal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCredit(event) {
    event.preventDefault();

    if (!selectedId) {
      return;
    }

    try {
      setSaving(true);
      const updated = await updateCustomerCredit(selectedId, {
        ...creditForm,
        limite_credito: Number(creditForm.limite_credito || 0),
        dias_vencimento: Number(creditForm.dias_vencimento || 30),
      });
      setProfile(updated);
      await loadCustomers(busca, selectedId);
      setFeedback({ tone: 'success', message: 'Credito atualizado com sucesso.' });
      closeCreditModal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveCustomer(customer) {
    const confirmed = window.confirm(`Deseja remover ou inativar o cliente "${customer.nome}"?`);

    if (!confirmed) {
      return;
    }

    try {
      const result = await removeCustomer(customer.id);
      setFeedback({ tone: 'success', message: result.message || 'Cliente atualizado com sucesso.' });
      await loadCustomers(busca, selectedId === customer.id ? null : selectedId);

      if (selectedId === customer.id) {
        await loadProfile(customer.id).catch(() => null);
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    }
  }

  async function handleRemoveAddress(address) {
    if (!selectedId) {
      return;
    }

    const confirmed = window.confirm(`Deseja remover o endereco "${address.logradouro}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await removeCustomerAddress(selectedId, address.id);
      setFeedback({ tone: 'success', message: 'Endereco removido com sucesso.' });
      await loadProfile(selectedId);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    }
  }

  async function handleRemoveContact(contact) {
    if (!selectedId) {
      return;
    }

    const confirmed = window.confirm(`Deseja remover o contato "${contact.nome}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await removeCustomerContact(selectedId, contact.id);
      setFeedback({ tone: 'success', message: 'Contato removido com sucesso.' });
      await loadProfile(selectedId);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    loadCustomers(busca, null);
  }

  const activeCustomers = clientes.filter((item) => item.ativo).length;
  const customersWithCredit = clientes.filter((item) => item.credito_ativo).length;
  const customersWithContact = clientes.filter((item) => item.telefone || item.email).length;
  const profileStatus = profile ? getCustomerStatus(profile) : null;

  return (
    <div className="page-stack customer-page">
      <div className="page-header">
        <div className="page-title">
          <h2>Clientes e crédito</h2>
          <p>Ficha comercial, histórico, crédito e relacionamento ligados ao fluxo de venda.</p>
        </div>

        <div className="inline-actions">
          <Button type="button" variant="secondary" onClick={() => loadCustomers(busca, selectedId)}>
            Atualizar
          </Button>
          <Button type="button" onClick={openNewCustomer}>
            <Plus size={16} />
            Novo cliente
          </Button>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Clientes cadastrados" value={clientes.length} icon={ContactRound} />
        <Card title="Clientes ativos" value={activeCustomers} icon={BadgeCheck} tone="primary" />
        <Card title="Credito ativo" value={customersWithCredit} icon={WalletCards} />
        <Card title="Com contato" value={customersWithContact} icon={Phone} />
      </div>

      <div className="customer-workspace">
        <section className="panel customer-list-panel">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Base de clientes</h3>
              <p>Pesquise por nome, documento, telefone ou e-mail e abra a ficha completa ao lado.</p>
            </div>
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
            <div className="customer-list-stack">
              {clientes.map((cliente) => {
                const status = getCustomerStatus(cliente);

                return (
                  <button
                    key={cliente.id}
                    type="button"
                    className={`customer-list-item ${selectedId === cliente.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(cliente.id)}
                  >
                    <div className="customer-list-main">
                      <div>
                        <strong>{cliente.nome}</strong>
                        <small>
                          {cliente.documento || cliente.telefone || cliente.email || 'Sem identificacao complementar'}
                        </small>
                      </div>

                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </div>

                    <div className="customer-list-meta">
                      <span>{cliente.total_compras} compras</span>
                      <span>{formatCurrency(cliente.total_gasto || 0)}</span>
                      {cliente.credito_ativo ? (
                        <span>{formatCurrency(cliente.credito_disponivel || 0)} livre</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Nenhum cliente encontrado"
              description="Cadastre clientes para ter historico, credito e identificacao comercial na venda."
            />
          )}
        </section>

        <section className="panel customer-detail-panel">
          {profileLoading ? (
            <div className="loading-state">Carregando ficha do cliente...</div>
          ) : profile ? (
            <div className="page-stack">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>{profile.nome}</h3>
                  <p>Ficha completa com resumo comercial, contatos, enderecos e historico.</p>
                </div>

                <div className="inline-actions">
                  <Button type="button" variant="secondary" onClick={() => openEditCustomer(profile)}>
                    Editar ficha
                  </Button>
                  <Button type="button" variant="secondary" onClick={openCreditModal}>
                    Credito
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => openAddressModal()}>
                    Endereco
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => openContactModal()}>
                    Contato
                  </Button>
                  <Button type="button" variant="danger" onClick={() => handleRemoveCustomer(profile)}>
                    Remover
                  </Button>
                </div>
              </div>

              <div className="customer-hero-grid">
                <div className="helper-card customer-hero-card">
                  <span>Status</span>
                  <strong>{profileStatus?.label}</strong>
                  <small>Cadastro atualizado em {formatDateTime(profile.updated_at)}</small>
                </div>

                <div className="helper-card customer-hero-card">
                  <span>Total comprado</span>
                  <strong>{formatCurrency(profile.resumo.total_gasto || 0)}</strong>
                  <small>{profile.resumo.total_compras} vendas vinculadas ao cliente.</small>
                </div>

                <div className="helper-card customer-hero-card">
                  <span>Credito disponivel</span>
                  <strong>{formatCurrency(profile.credito?.saldo_disponivel || 0)}</strong>
                  <small>
                    Limite {formatCurrency(profile.credito?.limite_credito || 0)} com prazo de{' '}
                    {profile.credito?.dias_vencimento || 30} dias.
                  </small>
                </div>

                <div className="helper-card customer-hero-card">
                  <span>Contas abertas</span>
                  <strong>{formatCurrency(profile.resumo.contas_abertas || 0)}</strong>
                  <small>
                    Ultima compra {profile.resumo.ultima_compra ? formatDateTime(profile.resumo.ultima_compra) : '--'}
                  </small>
                </div>
              </div>

              <div className="customer-profile-grid">
                <div className="customer-section-card">
                  <div className="customer-section-head">
                    <h4>Ficha principal</h4>
                    <StatusBadge tone={profile.ativo ? 'success' : 'danger'}>
                      {profile.ativo ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                  </div>

                  <div className="customer-kv-grid">
                    <div>
                      <span>Documento</span>
                      <strong>{profile.documento || '--'}</strong>
                    </div>
                    <div>
                      <span>Telefone</span>
                      <strong>{profile.telefone || '--'}</strong>
                    </div>
                    <div>
                      <span>E-mail</span>
                      <strong>{profile.email || '--'}</strong>
                    </div>
                    <div>
                      <span>Nascimento</span>
                      <strong>{profile.data_nascimento ? formatDate(profile.data_nascimento) : '--'}</strong>
                    </div>
                  </div>

                  <p className="customer-section-note">
                    {profile.observacoes || 'Sem observacoes comerciais registradas.'}
                  </p>
                </div>

                <div className="customer-section-card">
                  <div className="customer-section-head">
                    <h4>Credito e cobranca</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={openCreditModal}>
                      Ajustar
                    </Button>
                  </div>

                  <div className="customer-kv-grid">
                    <div>
                      <span>Status</span>
                      <strong>{profile.credito?.ativo ? 'Liberado' : 'Nao liberado'}</strong>
                    </div>
                    <div>
                      <span>Ticket medio</span>
                      <strong>{formatCurrency(profile.resumo.ticket_medio || 0)}</strong>
                    </div>
                    <div>
                      <span>Utilizado</span>
                      <strong>{formatCurrency(profile.credito?.saldo_utilizado || 0)}</strong>
                    </div>
                    <div>
                      <span>Disponivel</span>
                      <strong>{formatCurrency(profile.credito?.saldo_disponivel || 0)}</strong>
                    </div>
                  </div>

                  <p className="customer-section-note">
                    {profile.credito?.observacoes || 'Sem regra de credito observada para este cliente.'}
                  </p>
                </div>

                <div className="customer-section-card">
                  <div className="customer-section-head">
                    <h4>Enderecos</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openAddressModal()}>
                      Novo
                    </Button>
                  </div>

                  {profile.enderecos.length ? (
                    <div className="customer-mini-list">
                      {profile.enderecos.map((address) => (
                        <div className="customer-mini-item" key={address.id}>
                          <div>
                            <strong>
                              {address.titulo || 'Endereco'}
                              {address.principal ? ' principal' : ''}
                            </strong>
                            <small>
                              {address.logradouro}, {address.numero || 's/n'} - {address.bairro} - {address.cidade}/
                              {address.estado}
                            </small>
                          </div>

                          <div className="table-actions">
                            <Button type="button" variant="ghost" size="sm" onClick={() => openAddressModal(address)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveAddress(address)}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Nenhum endereco"
                      description="Cadastre pelo menos um endereco para entrega, cobranca ou referencia."
                    />
                  )}
                </div>

                <div className="customer-section-card">
                  <div className="customer-section-head">
                    <h4>Contatos</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openContactModal()}>
                      Novo
                    </Button>
                  </div>

                  {profile.contatos.length ? (
                    <div className="customer-mini-list">
                      {profile.contatos.map((contact) => (
                        <div className="customer-mini-item" key={contact.id}>
                          <div>
                            <strong>{contact.nome}</strong>
                            <small>
                              {[contact.funcao, contact.telefone, contact.whatsapp, contact.email]
                                .filter(Boolean)
                                .join(' | ') || 'Sem dados complementares'}
                            </small>
                          </div>

                          <div className="table-actions">
                            <Button type="button" variant="ghost" size="sm" onClick={() => openContactModal(contact)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveContact(contact)}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Nenhum contato"
                      description="Adicione contato principal, whatsapp ou responsavel por compras."
                    />
                  )}
                </div>
              </div>

              <div className="customer-detail-grid">
                <div className="customer-section-card">
                  <div className="customer-section-head">
                    <h4>
                      <ShoppingBag size={16} />
                      Compras recentes
                    </h4>
                  </div>

                  {profile.compras_recentes.length ? (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Venda</th>
                            <th>Data</th>
                            <th>Pagamento</th>
                            <th>Itens</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.compras_recentes.map((item) => (
                            <tr key={item.id}>
                              <td>#{item.id}</td>
                              <td>{formatDateTime(item.created_at)}</td>
                              <td>{formatPaymentMethod(item.forma_pagamento)}</td>
                              <td>{item.total_itens}</td>
                              <td>{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="Sem compras registradas"
                      description="As proximas vendas vinculadas ao cliente vao aparecer aqui."
                    />
                  )}
                </div>

                <div className="customer-section-card">
                  <div className="customer-section-head">
                    <h4>
                      <History size={16} />
                      Historico recente
                    </h4>
                  </div>

                  {profile.historico_recente.length ? (
                    <div className="customer-timeline">
                      {profile.historico_recente.map((item) => (
                        <div className="customer-timeline-item" key={item.id}>
                          <strong>{item.descricao}</strong>
                          <small>
                            {formatDateTime(item.created_at)}
                            {item.usuario_nome ? ` | ${item.usuario_nome}` : ''}
                            {item.valor_referencia !== null ? ` | ${formatCurrency(item.valor_referencia)}` : ''}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Sem historico"
                      description="Atualizacoes de ficha, vendas e recebimentos do cliente vao aparecer aqui."
                    />
                  )}
                </div>
              </div>

              <div className="customer-section-card">
                <div className="customer-section-head">
                  <h4>
                    <WalletCards size={16} />
                    Contas a receber em aberto
                  </h4>
                </div>

                {profile.contas_abertas.length ? (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Titulo</th>
                          <th>Venda</th>
                          <th>Pagamento</th>
                          <th>Vencimento</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.contas_abertas.map((item) => (
                          <tr key={item.id}>
                            <td>#{item.id}</td>
                            <td>{item.venda_id ? `#${item.venda_id}` : '--'}</td>
                            <td>{formatPaymentMethod(item.forma_pagamento)}</td>
                            <td>{formatDate(item.vencimento)}</td>
                            <td>{formatCurrency(item.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="Nenhuma conta aberta"
                    description="Quando houver crediario ou recebimento pendente vinculado ao cliente, ele aparecera aqui."
                  />
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Selecione um cliente"
              description="Abra um cliente da lista para ver a ficha comercial completa."
            />
          )}
        </section>
      </div>

      <Modal
        open={customerModalOpen}
        onClose={closeCustomerModal}
        title={editingCustomerId ? 'Editar cliente' : 'Novo cliente'}
        description="Cadastre os dados principais para venda identificada, contato e relacionamento."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeCustomerModal}>
              Cancelar
            </Button>
            <Button type="submit" form="customer-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="customer-form" className="form-grid" onSubmit={handleSaveCustomer}>
          <label className="field field-span-2">
            <span>Nome</span>
            <input
              value={customerForm.nome}
              onChange={(event) => setCustomerForm({ ...customerForm, nome: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Documento</span>
            <input
              value={customerForm.documento}
              onChange={(event) => setCustomerForm({ ...customerForm, documento: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Telefone</span>
            <input
              value={customerForm.telefone}
              onChange={(event) => setCustomerForm({ ...customerForm, telefone: event.target.value })}
            />
          </label>

          <label className="field">
            <span>E-mail</span>
            <input
              value={customerForm.email}
              onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Nascimento</span>
            <input
              type="date"
              value={customerForm.data_nascimento}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, data_nascimento: event.target.value })
              }
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="3"
              value={customerForm.observacoes}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, observacoes: event.target.value })
              }
            />
          </label>

          <label className="checkbox-field field-span-2">
            <input
              type="checkbox"
              checked={customerForm.ativo}
              onChange={(event) => setCustomerForm({ ...customerForm, ativo: event.target.checked })}
            />
            <span>Cliente ativo para novas vendas</span>
          </label>
        </form>
      </Modal>

      <Modal
        open={addressModalOpen}
        onClose={closeAddressModal}
        title={editingAddressId ? 'Editar endereco' : 'Novo endereco'}
        description="Use endereco principal para entrega, cobranca ou referencia do cliente."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeAddressModal}>
              Cancelar
            </Button>
            <Button type="submit" form="address-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="address-form" className="form-grid" onSubmit={handleSaveAddress}>
          <label className="field">
            <span>Titulo</span>
            <input
              value={addressForm.titulo}
              onChange={(event) => setAddressForm({ ...addressForm, titulo: event.target.value })}
            />
          </label>

          <label className="field">
            <span>CEP</span>
            <input
              value={addressForm.cep}
              onChange={(event) => setAddressForm({ ...addressForm, cep: event.target.value })}
            />
          </label>

          <label className="field field-span-2">
            <span>Logradouro</span>
            <input
              value={addressForm.logradouro}
              onChange={(event) =>
                setAddressForm({ ...addressForm, logradouro: event.target.value })
              }
            />
          </label>

          <label className="field">
            <span>Numero</span>
            <input
              value={addressForm.numero}
              onChange={(event) => setAddressForm({ ...addressForm, numero: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Complemento</span>
            <input
              value={addressForm.complemento}
              onChange={(event) =>
                setAddressForm({ ...addressForm, complemento: event.target.value })
              }
            />
          </label>

          <label className="field">
            <span>Bairro</span>
            <input
              value={addressForm.bairro}
              onChange={(event) => setAddressForm({ ...addressForm, bairro: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Cidade</span>
            <input
              value={addressForm.cidade}
              onChange={(event) => setAddressForm({ ...addressForm, cidade: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Estado</span>
            <input
              maxLength="2"
              value={addressForm.estado}
              onChange={(event) =>
                setAddressForm({ ...addressForm, estado: event.target.value.toUpperCase() })
              }
            />
          </label>

          <label className="checkbox-field field-span-2">
            <input
              type="checkbox"
              checked={addressForm.principal}
              onChange={(event) =>
                setAddressForm({ ...addressForm, principal: event.target.checked })
              }
            />
            <span>Marcar como endereco principal</span>
          </label>
        </form>
      </Modal>

      <Modal
        open={contactModalOpen}
        onClose={closeContactModal}
        title={editingContactId ? 'Editar contato' : 'Novo contato'}
        description="Guarde telefone, whatsapp ou responsavel comercial do cliente."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeContactModal}>
              Cancelar
            </Button>
            <Button type="submit" form="contact-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="contact-form" className="form-grid" onSubmit={handleSaveContact}>
          <label className="field">
            <span>Nome</span>
            <input
              value={contactForm.nome}
              onChange={(event) => setContactForm({ ...contactForm, nome: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Funcao</span>
            <input
              value={contactForm.funcao}
              onChange={(event) => setContactForm({ ...contactForm, funcao: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Telefone</span>
            <input
              value={contactForm.telefone}
              onChange={(event) => setContactForm({ ...contactForm, telefone: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Whatsapp</span>
            <input
              value={contactForm.whatsapp}
              onChange={(event) =>
                setContactForm({ ...contactForm, whatsapp: event.target.value })
              }
            />
          </label>

          <label className="field field-span-2">
            <span>E-mail</span>
            <input
              value={contactForm.email}
              onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="3"
              value={contactForm.observacoes}
              onChange={(event) =>
                setContactForm({ ...contactForm, observacoes: event.target.value })
              }
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={creditModalOpen}
        onClose={closeCreditModal}
        title="Credito do cliente"
        description="Controle limite, prazo e liberacao do crediario local."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeCreditModal}>
              Cancelar
            </Button>
            <Button type="submit" form="credit-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="credit-form" className="form-grid" onSubmit={handleSaveCredit}>
          <label className="field">
            <span>Limite de credito</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={creditForm.limite_credito}
              onChange={(event) =>
                setCreditForm({ ...creditForm, limite_credito: event.target.value })
              }
            />
          </label>

          <label className="field">
            <span>Dias para vencer</span>
            <input
              type="number"
              min="1"
              max="365"
              value={creditForm.dias_vencimento}
              onChange={(event) =>
                setCreditForm({ ...creditForm, dias_vencimento: event.target.value })
              }
            />
          </label>

          <label className="field field-span-2">
            <span>Observacoes</span>
            <textarea
              rows="3"
              value={creditForm.observacoes}
              onChange={(event) =>
                setCreditForm({ ...creditForm, observacoes: event.target.value })
              }
            />
          </label>

          <label className="checkbox-field field-span-2">
            <input
              type="checkbox"
              checked={creditForm.ativo}
              onChange={(event) => setCreditForm({ ...creditForm, ativo: event.target.checked })}
            />
            <span>Liberar uso do crediario para este cliente</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
