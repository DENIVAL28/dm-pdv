import React from 'react';
import {
  BadgeDollarSign,
  Eraser,
  Keyboard,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  UserRoundPlus,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { PAYMENT_METHODS } from '../constants/paymentMethods.js';
import { getCurrentCashSession } from '../services/cashRegisterService.js';
import { listCustomers } from '../services/customerService.js';
import { listProducts } from '../services/productService.js';
import { finalizeSale } from '../services/salesService.js';
import { formatCurrency, formatDateTime, formatPaymentMethod, getStockStatus } from '../utils/formatters.js';
import { buildSaleDraft } from '../utils/saleDraft.js';

const SCAN_SEQUENCE_GAP_MS = 60;

function getSearchRank(produto, termo) {
  if (!termo) {
    return 10;
  }

  const codigo = String(produto.codigo_barras || '');
  const nome = produto.nome.toLowerCase();

  if (codigo === termo) {
    return 0;
  }

  if (codigo.startsWith(termo)) {
    return 1;
  }

  if (nome === termo) {
    return 2;
  }

  if (nome.startsWith(termo)) {
    return 3;
  }

  return 4;
}

function isLikelyBarcode(value) {
  return /^\d{4,}$/.test(String(value || '').trim());
}

function isEditableTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

function getMatchingProducts(produtos, termo) {
  const normalizedTerm = String(termo || '').trim().toLowerCase();

  return produtos
    .filter((produto) => {
      if (!normalizedTerm) {
        return true;
      }

      return (
        produto.nome.toLowerCase().includes(normalizedTerm) ||
        String(produto.codigo_barras || '').includes(normalizedTerm)
      );
    })
    .sort(
      (a, b) =>
        getSearchRank(a, normalizedTerm) - getSearchRank(b, normalizedTerm) ||
        a.nome.localeCompare(b.nome)
    )
    .slice(0, 10);
}

export default function PDV() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [descontoValor, setDescontoValor] = useState('');
  const [acrescimoValor, setAcrescimoValor] = useState('');
  const [valorRecebido, setValorRecebido] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [ultimaVenda, setUltimaVenda] = useState(null);
  const [ultimaLeitura, setUltimaLeitura] = useState(null);
  const [leitorAtivo, setLeitorAtivo] = useState(true);
  const [sessaoCaixa, setSessaoCaixa] = useState(null);
  const inputRef = useRef(null);
  const scanBufferRef = useRef('');
  const scanLastKeyAtRef = useRef(0);
  const scanResetTimerRef = useRef(null);

  async function carregarDadosBase() {
    try {
      setLoading(true);
      const [produtosData, clientesData, sessaoData] = await Promise.all([
        listProducts(),
        listCustomers(),
        getCurrentCashSession(),
      ]);
      setProdutos(produtosData);
      setClientes(clientesData);
      setSessaoCaixa(sessaoData);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDadosBase();
  }, []);

  useEffect(() => {
    if (!loading) {
      focarBusca();
    }
  }, [loading]);

  const termo = busca.trim().toLowerCase();
  const resultados = getMatchingProducts(produtos, termo);

  const clienteSelecionado = clientes.find((cliente) => String(cliente.id) === String(clienteId));
  const draft = buildSaleDraft({
    itens: carrinho,
    formaPagamento,
    descontoValor,
    acrescimoValor,
    valorRecebido,
  });

  function limparMensagens() {
    setFeedback(null);
    setUltimaVenda(null);
  }

  function focarBusca() {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      setLeitorAtivo(true);
    });
  }

  function quantidadeNoCarrinho(produtoId) {
    return carrinho.find((item) => item.id === produtoId)?.quantidade || 0;
  }

  function mesclarProdutosNoCache(novosProdutos) {
    setProdutos((atuais) => {
      const mapa = new Map(atuais.map((produto) => [produto.id, produto]));

      novosProdutos.forEach((produto) => {
        mapa.set(produto.id, produto);
      });

      return Array.from(mapa.values());
    });
  }

  function adicionarProduto(produto) {
    limparMensagens();
    const reservado = quantidadeNoCarrinho(produto.id);

    if (reservado >= produto.estoque) {
      setFeedback({
        tone: 'error',
        message: `Não há mais saldo disponível para ${produto.nome}.`,
      });
      return false;
    }

    setCarrinho((atual) => {
      const existente = atual.find((item) => item.id === produto.id);

      if (existente) {
        return atual.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }

      return [...atual, { ...produto, quantidade: 1 }];
    });

    setBusca('');
    focarBusca();
    return true;
  }

  function alterarQuantidade(produtoId, proximaQuantidade) {
    const produto = produtos.find((item) => item.id === produtoId);
    const quantidadeNumerica = Number(proximaQuantidade);

    if (!produto || !Number.isFinite(quantidadeNumerica)) {
      return;
    }

    if (quantidadeNumerica <= 0) {
      removerItem(produtoId);
      return;
    }

    if (quantidadeNumerica > produto.estoque) {
      setFeedback({
        tone: 'error',
        message: `Quantidade acima do saldo disponível para ${produto.nome}.`,
      });

      setCarrinho((atual) =>
        atual.map((item) =>
          item.id === produtoId ? { ...item, quantidade: produto.estoque } : item
        )
      );
      return;
    }

    limparMensagens();
    setCarrinho((atual) =>
      atual.map((item) =>
        item.id === produtoId ? { ...item, quantidade: quantidadeNumerica } : item
      )
    );
  }

  function removerItem(produtoId) {
    limparMensagens();
    setCarrinho((atual) => atual.filter((item) => item.id !== produtoId));
  }

  function resetarVenda() {
    setCarrinho([]);
    setClienteId('');
    setFormaPagamento('dinheiro');
    setDescontoValor('');
    setAcrescimoValor('');
    setValorRecebido('');
    setObservacoes('');
  }

  function limparCarrinho() {
    resetarVenda();
    setFeedback(null);
  }

  function selecionarFormaPagamento(metodo) {
    limparMensagens();
    setFormaPagamento(metodo);

    if (metodo !== 'dinheiro') {
      setValorRecebido('');
    }
  }

  async function processarLeitura(termoInformado = busca) {
    const termoAtual = String(termoInformado || '').trim();

    if (!termoAtual) {
      focarBusca();
      return;
    }

    try {
      limparMensagens();

      let produtoEncontrado = produtos.find(
        (produto) => String(produto.codigo_barras || '') === termoAtual
      );

      if (!produtoEncontrado && isLikelyBarcode(termoAtual)) {
        const produtosPorCodigo = await listProducts({
          busca: termoAtual,
          codigoExato: true,
          limite: 1,
        });

        if (produtosPorCodigo[0]) {
          produtoEncontrado = produtosPorCodigo[0];
          mesclarProdutosNoCache(produtosPorCodigo);
        }
      }

      if (!produtoEncontrado) {
        produtoEncontrado = getMatchingProducts(produtos, termoAtual)[0] || null;
      }

      if (!produtoEncontrado) {
        const produtosRemotos = await listProducts({
          busca: termoAtual,
          limite: 10,
        });

        if (produtosRemotos.length) {
          mesclarProdutosNoCache(produtosRemotos);
          produtoEncontrado =
            produtosRemotos.find((produto) => String(produto.codigo_barras || '') === termoAtual) ||
            produtosRemotos[0];
        }
      }

      if (!produtoEncontrado) {
        setUltimaLeitura({
          status: 'error',
          termo: termoAtual,
          mensagem: `Nenhum produto encontrado para ${termoAtual}.`,
          horario: new Date().toISOString(),
        });
        setFeedback({ tone: 'error', message: `Nenhum produto encontrado para ${termoAtual}.` });
        setBusca(termoAtual);
        focarBusca();
        return;
      }

      const adicionou = adicionarProduto(produtoEncontrado);

      setUltimaLeitura({
        status: adicionou ? 'success' : 'error',
        termo: termoAtual,
        produto: produtoEncontrado.nome,
        codigo: produtoEncontrado.codigo_barras || null,
        mensagem: adicionou
          ? `Produto ${produtoEncontrado.nome} adicionado ao carrinho.`
          : `Não foi possível adicionar ${produtoEncontrado.nome}.`,
        horario: new Date().toISOString(),
      });
    } catch (error) {
      setUltimaLeitura({
        status: 'error',
        termo: termoAtual,
        mensagem: error.message,
        horario: new Date().toISOString(),
      });
      setFeedback({ tone: 'error', message: error.message });
      setBusca(termoAtual);
      focarBusca();
    }
  }

  async function concluirVenda() {
    if (!sessaoCaixa?.sessao?.id) {
      setFeedback({
        tone: 'error',
        message: 'Abra o caixa operacional antes de finalizar vendas no PDV.',
      });
      return;
    }

    if (!carrinho.length) {
      setFeedback({ tone: 'error', message: 'Adicione itens ao carrinho para concluir a venda.' });
      return;
    }

    if (draft.desconto > draft.subtotal) {
      setFeedback({ tone: 'error', message: 'O desconto não pode ser maior que o subtotal.' });
      return;
    }

    if (draft.valorFaltante > 0) {
      setFeedback({
        tone: 'error',
        message: `Faltam ${formatCurrency(draft.valorFaltante)} para completar o pagamento em dinheiro.`,
      });
      return;
    }

    try {
      setFinalizando(true);
      setFeedback(null);
      setUltimaVenda(null);

      const venda = await finalizeSale({
        itens: carrinho.map((item) => ({
          produto_id: item.id,
          quantidade: item.quantidade,
        })),
        cliente_id: clienteId || null,
        forma_pagamento: formaPagamento,
        desconto_valor: draft.desconto,
        acrescimo_valor: draft.acrescimo,
        valor_recebido:
          draft.pagamentoEmDinheiro && draft.temValorRecebidoInformado ? draft.valorRecebido : null,
        observacoes: observacoes.trim() || null,
      });

      resetarVenda();
      setUltimaVenda(venda);
      await carregarDadosBase();
      focarBusca();
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message });
    } finally {
      setFinalizando(false);
    }
  }

  function handleBuscaKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      processarLeitura();
    }
  }

  useEffect(() => {
    function handleWindowKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === 'F2') {
        event.preventDefault();
        focarBusca();
        return;
      }

      if (event.key === 'F4') {
        event.preventDefault();

        if (!finalizando && carrinho.length) {
          concluirVenda();
        }
        return;
      }

      if (event.key === 'F6') {
        event.preventDefault();

        if (carrinho.length) {
          limparCarrinho();
        }
        return;
      }

      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        event.preventDefault();
        setBusca('');
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const agora = Date.now();

      if (event.key === 'Enter') {
        const bufferAtual = scanBufferRef.current.trim();

        if (bufferAtual.length >= 4 && agora - scanLastKeyAtRef.current <= 120) {
          event.preventDefault();
          scanBufferRef.current = '';
          setLeitorAtivo(true);

          if (scanResetTimerRef.current) {
            clearTimeout(scanResetTimerRef.current);
          }

          setBusca(bufferAtual);
          processarLeitura(bufferAtual);
        }

        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      if (agora - scanLastKeyAtRef.current > SCAN_SEQUENCE_GAP_MS) {
        scanBufferRef.current = '';
      }

      scanBufferRef.current += event.key;
      scanLastKeyAtRef.current = agora;

      if (scanResetTimerRef.current) {
        clearTimeout(scanResetTimerRef.current);
      }

      scanResetTimerRef.current = setTimeout(() => {
        scanBufferRef.current = '';
      }, 120);
    }

    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);

      if (scanResetTimerRef.current) {
        clearTimeout(scanResetTimerRef.current);
      }
    };
  }, [carrinho.length, finalizando, draft.total, draft.valorFaltante, produtos, busca, formaPagamento, clienteId, observacoes, descontoValor, acrescimoValor, valorRecebido]);

  return (
    <div className="page-stack pdv-shell">
      <div className="page-header">
        <div className="page-title">
          <h2>Caixa</h2>
          <p>Leitura rápida, conferência do pagamento e fechamento no mesmo fluxo.</p>
        </div>

        <div className="inline-actions">
          <Button type="button" onClick={focarBusca}>
            <Keyboard size={16} />
            Ativar leitura
          </Button>
          <Button type="button" variant="secondary" onClick={carregarDadosBase}>
            Atualizar dados
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/app/clientes')}>
            <UserRoundPlus size={16} />
            Clientes
          </Button>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone}>{feedback.message}</FeedbackBanner> : null}

      {!sessaoCaixa ? (
        <section className="panel panel-inline-callout">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Caixa ainda nao aberto</h3>
              <p>O PDV pode consultar produtos, mas a venda so fecha com uma sessao de caixa ativa.</p>
            </div>

            <Button type="button" onClick={() => navigate('/app/caixa')}>
              Abrir caixa
            </Button>
          </div>
        </section>
      ) : (
        <div className="cash-session-strip">
          <div className="helper-card cash-session-strip-card">
            <span>Caixa em uso</span>
            <strong>
              {sessaoCaixa.sessao.caixa_nome}
              {sessaoCaixa.sessao.caixa_identificador
                ? ` (${sessaoCaixa.sessao.caixa_identificador})`
                : ''}
            </strong>
            <small>Aberto em {formatDateTime(sessaoCaixa.sessao.data_abertura)}</small>
          </div>

          <div className="helper-card cash-session-strip-card">
            <span>Dinheiro esperado</span>
            <strong>{formatCurrency(sessaoCaixa.valor_em_caixa_sistema || 0)}</strong>
            <small>Resumo do caixa operacional atual.</small>
          </div>
        </div>
      )}

      {ultimaVenda ? (
        <FeedbackBanner tone="success">
          Venda #{ultimaVenda.id} concluída em {formatCurrency(ultimaVenda.total)} com{' '}
          {formatPaymentMethod(ultimaVenda.forma_pagamento)} para{' '}
          {ultimaVenda.cliente_nome || 'Consumidor final'}
          {ultimaVenda.troco ? ` e troco de ${formatCurrency(ultimaVenda.troco)}` : ''}.
        </FeedbackBanner>
      ) : null}

      <div className="stats-grid pdv-stats-grid">
        <Card title="Itens no carrinho" value={draft.quantidadeItens} icon={ShoppingCart} />
        <Card title="Subtotal" value={formatCurrency(draft.subtotal)} icon={ReceiptText} />
        <Card
          title="Total final"
          value={formatCurrency(draft.total)}
          helper={
            draft.desconto || draft.acrescimo
              ? `Desc. ${formatCurrency(draft.desconto)} | Acrésc. ${formatCurrency(draft.acrescimo)}`
              : 'Sem ajuste manual nesta venda'
          }
          icon={BadgeDollarSign}
          tone="primary"
        />
        <Card
          title={draft.pagamentoEmDinheiro ? 'Troco' : 'Pagamento'}
          value={
            draft.pagamentoEmDinheiro
              ? formatCurrency(draft.troco)
              : formatPaymentMethod(formaPagamento)
          }
          helper={
            draft.pagamentoEmDinheiro
              ? draft.temValorRecebidoInformado
                ? `Recebido ${formatCurrency(draft.valorRecebido)}`
                : 'Sem valor recebido informado'
              : 'Liquidação integral sem troco'
          }
          icon={Wallet}
        />
      </div>

      <div className="pdv-layout">
        <section className="panel panel-spotlight">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Leitura e busca de produtos</h3>
              <p>Código exato tem prioridade. O sistema aceita leitor com Enter e atalhos do caixa.</p>
            </div>
          </div>

          <label className="search-box large">
            <Search size={18} />
            <input
              ref={inputRef}
              autoFocus
              placeholder="Passe o código de barras ou digite o nome"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={handleBuscaKeyDown}
              onFocus={() => setLeitorAtivo(true)}
              onBlur={() => setLeitorAtivo(false)}
              autoComplete="off"
            />
          </label>

          <div className="scanner-toolbar">
            <div className={`scanner-indicator ${leitorAtivo ? 'active' : ''}`}>
              <span className="scanner-dot" />
              <strong>{leitorAtivo ? 'Campo de leitura ativo' : 'Leitura fora de foco'}</strong>
            </div>

            <div className="shortcut-list">
              <span>F2 leitura</span>
              <span>F4 finalizar</span>
              <span>F6 limpar</span>
            </div>
          </div>

          <div className={`scan-feedback-card ${ultimaLeitura?.status === 'error' ? 'error' : ''}`}>
            <span>Última leitura</span>
            <strong>
              {ultimaLeitura?.produto || ultimaLeitura?.mensagem || 'Aguardando leitura de código de barras'}
            </strong>
            <small>
              {ultimaLeitura?.codigo
                ? `Código ${ultimaLeitura.codigo}`
                : ultimaLeitura?.termo
                  ? `Entrada ${ultimaLeitura.termo}`
                  : 'Use o leitor ou pressione F2 para focar o campo de leitura.'}
            </small>
          </div>

          <div className="spotlight-strip">
            <div className="spotlight-card">
              <span>Cliente da venda</span>
              <strong>{clienteSelecionado?.nome || 'Consumidor final'}</strong>
            </div>

            <div className="spotlight-card">
              <span>Pagamento</span>
              <strong>{formatPaymentMethod(formaPagamento)}</strong>
            </div>

            <div className="spotlight-card">
              <span>Resultados exibidos</span>
              <strong>{resultados.length}</strong>
            </div>

            <div className="spotlight-card">
              <span>Leitura</span>
              <strong>{leitorAtivo ? 'Pronta para scanner' : 'Use F2 para retomar'}</strong>
            </div>
          </div>
          
          {loading ? (
            <div className="loading-state">Carregando produtos...</div>
          ) : resultados.length ? (
            <div className="product-grid">
              {resultados.map((produto) => {
                const status = getStockStatus(produto);
                const reservado = quantidadeNoCarrinho(produto.id);
                const disponivel = Math.max(produto.estoque - reservado, 0);

                return (
                  <button
                    key={produto.id}
                    type="button"
                    className="product-card"
                    onClick={() => adicionarProduto(produto)}
                    disabled={disponivel <= 0}
                  >
                    <div className="product-card-head">
                      <strong>{produto.nome}</strong>
                      <span>{formatCurrency(produto.preco)}</span>
                    </div>

                    <div className="product-card-meta">
                      <span>Código: {produto.codigo_barras || '-'}</span>
                      <span>Disponível: {disponivel}</span>
                    </div>

                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Nenhum produto localizado"
              description="Ajuste a busca ou revise o cadastro de produtos."
            />
          )}
        </section>

        <section className="panel cart-panel cart-panel-strong">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Conferência da venda</h3>
              <p>Itens, pagamento e totalização no mesmo painel.</p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limparCarrinho}
              disabled={!carrinho.length}
            >
              <Eraser size={16} />
              Limpar
            </Button>
          </div>

          {carrinho.length ? (
            <div className="cart-list">
              {carrinho.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-main">
                    <div>
                      <strong>{item.nome}</strong>
                      <span>
                        {formatCurrency(item.preco)} por unidade | Estoque atual {item.estoque}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removerItem(item.id)}
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="cart-item-footer">
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.estoque}
                        value={item.quantidade}
                        onChange={(event) => alterarQuantidade(item.id, event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                      >
                        +
                      </button>
                    </div>

                    <strong>{formatCurrency(item.quantidade * Number(item.preco))}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Carrinho vazio"
              description="Adicione produtos pela busca para iniciar a venda."
            />
          )}

          <div className="form-grid pdv-form-grid">
            <label className="field field-span-2">
              <span>Cliente</span>
              <select value={clienteId} onChange={(event) => setClienteId(event.target.value)}>
                <option value="">Consumidor final</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                    {cliente.documento ? ` - ${cliente.documento}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Desconto</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={descontoValor}
                onChange={(event) => setDescontoValor(event.target.value)}
                placeholder="0,00"
              />
            </label>

            <label className="field">
              <span>Acréscimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={acrescimoValor}
                onChange={(event) => setAcrescimoValor(event.target.value)}
                placeholder="0,00"
              />
            </label>
          </div>

          <div className="helper-card">
            <span>Identificação da venda</span>
            <strong>{clienteSelecionado?.nome || 'Consumidor final'}</strong>
            <small>
              {clienteSelecionado
                ? clienteSelecionado.documento || clienteSelecionado.telefone || 'Cliente sem documento cadastrado.'
                : 'A venda pode seguir sem cliente vinculado quando o caixa não precisar identificar o comprador.'}
            </small>
          </div>

          <div className="payment-option-grid">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                className={`payment-option ${formaPagamento === method.value ? 'active' : ''}`}
                onClick={() => selecionarFormaPagamento(method.value)}
              >
                <span>{method.label}</span>
                <strong>{formaPagamento === method.value ? 'Selecionado' : 'Usar'}</strong>
              </button>
            ))}
          </div>

          {draft.pagamentoEmDinheiro ? (
            <label className="field">
              <span>Valor recebido</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorRecebido}
                onChange={(event) => setValorRecebido(event.target.value)}
                placeholder="Deixe em branco para pagamento exato"
              />
              <small className="field-hint">
                Se deixar em branco, o sistema considera pagamento exato em dinheiro.
              </small>
            </label>
          ) : (
            <div className="helper-card">
              <span>Liquidação</span>
              <strong>{formatPaymentMethod(formaPagamento)}</strong>
              <small>Pix e cartões consideram a venda liquidada sem cálculo de troco.</small>
            </div>
          )}

          <label className="field">
            <span>Observações</span>
            <textarea
              rows="2"
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Campo opcional para observações internas da venda"
            />
          </label>

          {draft.valorFaltante > 0 ? (
            <FeedbackBanner tone="error">
              Faltam {formatCurrency(draft.valorFaltante)} para completar o pagamento em dinheiro.
            </FeedbackBanner>
          ) : null}

          <div className="sale-breakdown">
            <div className="sale-breakdown-row">
              <span>Subtotal dos itens</span>
              <strong>{formatCurrency(draft.subtotal)}</strong>
            </div>

            <div className="sale-breakdown-row">
              <span>Desconto aplicado</span>
              <strong>{formatCurrency(draft.desconto)}</strong>
            </div>

            <div className="sale-breakdown-row">
              <span>Acréscimo aplicado</span>
              <strong>{formatCurrency(draft.acrescimo)}</strong>
            </div>

            <div className="sale-breakdown-row emphasis">
              <span>Total da venda</span>
              <strong>{formatCurrency(draft.total)}</strong>
            </div>

            {draft.pagamentoEmDinheiro ? (
              <>
                <div className="sale-breakdown-row">
                  <span>Valor recebido</span>
                  <strong>
                    {draft.temValorRecebidoInformado
                      ? formatCurrency(draft.valorRecebido)
                      : 'Pagamento exato'}
                  </strong>
                </div>

                <div className="sale-breakdown-row">
                  <span>Troco</span>
                  <strong>{formatCurrency(draft.troco)}</strong>
                </div>
              </>
            ) : null}
          </div>

          <Button
            type="button"
            className="full"
            onClick={concluirVenda}
            disabled={
              !sessaoCaixa?.sessao?.id ||
              !carrinho.length ||
              finalizando ||
              draft.total <= 0 ||
              draft.valorFaltante > 0
            }
          >
            <ShoppingCart size={16} />
            {finalizando ? 'Finalizando...' : 'Finalizar venda'}
          </Button>
        </section>
      </div>
    </div>
  );
}
