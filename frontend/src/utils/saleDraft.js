function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function normalizeMoneyValue(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 0;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? roundMoney(normalized) : 0;
}

export function buildSaleDraft({
  itens = [],
  formaPagamento = 'dinheiro',
  descontoValor = 0,
  acrescimoValor = 0,
  valorRecebido = '',
}) {
  const subtotal = roundMoney(
    itens.reduce((total, item) => total + Number(item.preco || 0) * Number(item.quantidade || 0), 0)
  );
  const desconto = normalizeMoneyValue(descontoValor);
  const acrescimo = normalizeMoneyValue(acrescimoValor);
  const total = roundMoney(Math.max(subtotal - desconto + acrescimo, 0));
  const pagamentoEmDinheiro = formaPagamento === 'dinheiro';
  const temValorRecebidoInformado =
    pagamentoEmDinheiro &&
    valorRecebido !== undefined &&
    valorRecebido !== null &&
    String(valorRecebido).trim() !== '';
  const valorRecebidoNumerico = temValorRecebidoInformado ? normalizeMoneyValue(valorRecebido) : total;
  const troco =
    pagamentoEmDinheiro && valorRecebidoNumerico > total
      ? roundMoney(valorRecebidoNumerico - total)
      : 0;
  const valorFaltante =
    pagamentoEmDinheiro && temValorRecebidoInformado && valorRecebidoNumerico < total
      ? roundMoney(total - valorRecebidoNumerico)
      : 0;

  return {
    quantidadeItens: itens.reduce((total, item) => total + Number(item.quantidade || 0), 0),
    subtotal,
    desconto,
    acrescimo,
    total,
    pagamentoEmDinheiro,
    temValorRecebidoInformado,
    valorRecebido: valorRecebidoNumerico,
    valorFaltante,
    troco,
  };
}
