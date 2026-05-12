import { PAYMENT_METHOD_LABELS } from '../constants/paymentMethods.js';

export function formatCurrency(value = 0) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatPaymentMethod(value) {
  return PAYMENT_METHOD_LABELS[value] || value || '--';
}

export function toInputDate(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function getDefaultReportRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    dataInicial: toInputDate(start),
    dataFinal: toInputDate(end),
  };
}

export function getStockStatus(product) {
  const estoque = Number(product?.estoque || 0);
  const estoqueMinimo = Number(product?.estoque_minimo || 0);

  if (estoque === 0) {
    return {
      label: 'Sem estoque',
      tone: 'danger',
    };
  }

  if (estoque <= estoqueMinimo) {
    return {
      label: 'Estoque baixo',
      tone: 'warning',
    };
  }

  return {
    label: 'Normal',
    tone: 'success',
  };
}
