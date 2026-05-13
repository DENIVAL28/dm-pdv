import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Receipt, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import {
  cancelFiscalDocument,
  getFiscalConfig,
  issueFiscalDocumentBySale,
  listFiscalDocuments,
  updateFiscalConfig,
} from '../services/fiscalService.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

const INITIAL_CONFIG = {
  nome_fantasia: '',
  razao_social: '',
  documento: '',
  inscricao_estadual: '',
  regime_tributario: 'simples_nacional',
  ambiente_fiscal: 'homologacao',
  serie_nfce: '1',
  proximo_numero_nfce: '1',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: 'MT',
};

const STATUS_LABELS = {
  pendente: 'Pendente',
  autorizado: 'Autorizado',
  cancelado: 'Cancelado',
  erro: 'Erro',
};

const STATUS_TONES = {
  pendente: 'warning',
  autorizado: 'success',
  cancelado: 'neutral',
  erro: 'danger',
};

const REGIME_LABELS = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro presumido',
  lucro_real: 'Lucro real',
};

const AMBIENTE_LABELS = {
  homologacao: 'Homologacao',
  producao: 'Producao',
};

function StatusPill({ status }) {
  return (
    <span className={`status-badge ${STATUS_TONES[status] || 'neutral'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function Fiscal() {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  async function loadFiscal(filterValue = statusFilter) {
    try {
      setLoading(true);
      const [configData, documentsData] = await Promise.all([
        getFiscalConfig(),
        listFiscalDocuments({ limite: 50, status: filterValue || undefined }),
      ]);

      setConfig({
        nome_fantasia: configData.nome_fantasia || '',
        razao_social: configData.razao_social || '',
        documento: configData.documento || '',
        inscricao_estadual: configData.inscricao_estadual || '',
        regime_tributario: configData.regime_tributario || 'simples_nacional',
        ambiente_fiscal: configData.ambiente_fiscal || 'homologacao',
        serie_nfce: configData.serie_nfce || '1',
        proximo_numero_nfce: String(configData.proximo_numero_nfce || 1),
        cep: configData.cep || '',
        logradouro: configData.logradouro || '',
        numero: configData.numero || '',
        complemento: configData.complemento || '',
        bairro: configData.bairro || '',
        cidade: configData.cidade || '',
        estado: configData.estado || 'MT',
      });
      setDocuments(documentsData);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiscal();
  }, []);

  const pendingCount = useMemo(
    () => documents.filter((document) => document.status === 'pendente').length,
    [documents]
  );
  const authorizedCount = useMemo(
    () => documents.filter((document) => document.status === 'autorizado').length,
    [documents]
  );

  async function saveConfig(event) {
    event.preventDefault();

    try {
      setSavingConfig(true);
      await updateFiscalConfig({
        ...config,
        proximo_numero_nfce: Number(config.proximo_numero_nfce),
      });
      setFeedback({ tone: 'success', message: 'Configuracao fiscal salva com sucesso.' });
      await loadFiscal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setSavingConfig(false);
    }
  }

  async function emitDocument(document) {
    try {
      setProcessingDocId(document.id);
      await issueFiscalDocumentBySale(document.venda_id);
      setFeedback({
        tone: 'success',
        message: `Documento da venda #${document.venda_id} emitido com sucesso.`,
      });
      await loadFiscal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setProcessingDocId(null);
    }
  }

  async function cancelDocument(document) {
    const motivo = window.prompt('Informe o motivo do cancelamento fiscal:');

    if (!motivo) {
      return;
    }

    try {
      setProcessingDocId(document.id);
      await cancelFiscalDocument(document.id, { motivo });
      setFeedback({
        tone: 'success',
        message: `Documento fiscal da venda #${document.venda_id} cancelado.`,
      });
      await loadFiscal();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setProcessingDocId(null);
    }
  }

  async function handleFilterSubmit(event) {
    event.preventDefault();
    await loadFiscal(statusFilter);
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Fiscal</h2>
          <p>Configure o emitente, acompanhe os documentos e emita a NFC-e local das vendas.</p>
        </div>

        <Button type="button" variant="secondary" onClick={() => loadFiscal()}>
          <RefreshCw size={16} />
          Atualizar
        </Button>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card
          title="Ambiente fiscal"
          value={AMBIENTE_LABELS[config.ambiente_fiscal] || '--'}
          icon={ShieldCheck}
        />
        <Card title="Proximo numero" value={config.proximo_numero_nfce || '--'} icon={Receipt} />
        <Card title="Documentos pendentes" value={pendingCount} icon={FileText} tone="warning" />
        <Card title="Documentos autorizados" value={authorizedCount} icon={ShieldCheck} tone="success" />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Configuracao do emitente</h3>
            <p>Essa base fiscal alimenta a emissao local da NFC-e e a identificacao da empresa.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={saveConfig}>
          <label className="field">
            <span>Nome fantasia</span>
            <input
              value={config.nome_fantasia}
              onChange={(event) => setConfig({ ...config, nome_fantasia: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Razao social</span>
            <input
              value={config.razao_social}
              onChange={(event) => setConfig({ ...config, razao_social: event.target.value })}
            />
          </label>

          <label className="field">
            <span>CNPJ</span>
            <input
              value={config.documento}
              onChange={(event) => setConfig({ ...config, documento: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Inscricao estadual</span>
            <input
              value={config.inscricao_estadual}
              onChange={(event) =>
                setConfig({ ...config, inscricao_estadual: event.target.value })
              }
            />
          </label>

          <label className="field">
            <span>Regime tributario</span>
            <select
              value={config.regime_tributario}
              onChange={(event) =>
                setConfig({ ...config, regime_tributario: event.target.value })
              }
            >
              {Object.entries(REGIME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Ambiente</span>
            <select
              value={config.ambiente_fiscal}
              onChange={(event) => setConfig({ ...config, ambiente_fiscal: event.target.value })}
            >
              {Object.entries(AMBIENTE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Serie NFC-e</span>
            <input
              value={config.serie_nfce}
              onChange={(event) => setConfig({ ...config, serie_nfce: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Proximo numero</span>
            <input
              type="number"
              min="1"
              step="1"
              value={config.proximo_numero_nfce}
              onChange={(event) =>
                setConfig({ ...config, proximo_numero_nfce: event.target.value })
              }
            />
          </label>

          <label className="field">
            <span>CEP</span>
            <input
              value={config.cep}
              onChange={(event) => setConfig({ ...config, cep: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Logradouro</span>
            <input
              value={config.logradouro}
              onChange={(event) => setConfig({ ...config, logradouro: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Numero</span>
            <input
              value={config.numero}
              onChange={(event) => setConfig({ ...config, numero: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Complemento</span>
            <input
              value={config.complemento}
              onChange={(event) => setConfig({ ...config, complemento: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Bairro</span>
            <input
              value={config.bairro}
              onChange={(event) => setConfig({ ...config, bairro: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Cidade</span>
            <input
              value={config.cidade}
              onChange={(event) => setConfig({ ...config, cidade: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Estado</span>
            <input
              value={config.estado}
              maxLength="2"
              onChange={(event) =>
                setConfig({ ...config, estado: event.target.value.toUpperCase() })
              }
            />
          </label>

          <div className="field field-span-2">
            <Button type="submit" disabled={savingConfig}>
              <Settings2 size={16} />
              {savingConfig ? 'Salvando configuracao...' : 'Salvar configuracao fiscal'}
            </Button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Documentos fiscais</h3>
            <p>As vendas entram aqui como pendentes e podem ser emitidas ou canceladas.</p>
          </div>
        </div>

        <form className="toolbar" onSubmit={handleFilterSubmit}>
          <label className="field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>

        {loading ? (
          <div className="loading-state">Carregando documentos fiscais...</div>
        ) : documents.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Venda</th>
                  <th>Documento</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Mensagem</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <StatusPill status={document.status} />
                    </td>
                    <td>
                      <div className="table-cell-stack">
                        <strong>#{document.venda_id}</strong>
                        <span>{formatDateTime(document.created_at)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{document.numero_documento || 'Aguardando emissao'}</strong>
                        <span>{document.chave_acesso || document.ambiente || '--'}</span>
                      </div>
                    </td>
                    <td>{document.cliente_nome || 'Consumidor final'}</td>
                    <td>{formatCurrency(document.total_venda)}</td>
                    <td>{document.mensagem_retorno || '--'}</td>
                    <td>
                      <div className="table-actions">
                        {document.status === 'pendente' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => emitDocument(document)}
                            disabled={processingDocId === document.id}
                          >
                            Emitir
                          </Button>
                        ) : null}
                        {document.status !== 'cancelado' ? (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => cancelDocument(document)}
                            disabled={processingDocId === document.id}
                          >
                            Cancelar
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
            title="Nenhum documento fiscal encontrado"
            description="Assim que houver vendas, os documentos pendentes aparecem aqui."
          />
        )}
      </section>
    </div>
  );
}
