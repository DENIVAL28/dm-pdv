import { createHttpError } from './http.js';

export function roundCurrency(value) {
  return Number(Number(value).toFixed(2));
}

export function toDateInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function ensureRequiredString(value, fieldName, maxLength = 255) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw createHttpError(400, `${fieldName} e obrigatorio.`);
  }

  if (normalized.length > maxLength) {
    throw createHttpError(400, `${fieldName} excede o tamanho permitido.`);
  }

  return normalized;
}

export function normalizeOptionalString(value, maxLength = 255) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function ensurePositiveInteger(value, fieldName) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw createHttpError(400, `${fieldName} deve ser um numero inteiro maior que zero.`);
  }

  return normalized;
}

export function normalizeOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  return ensurePositiveInteger(value, fieldName);
}

export function ensureNonNegativeInteger(value, fieldName) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw createHttpError(400, `${fieldName} deve ser um numero inteiro maior ou igual a zero.`);
  }

  return normalized;
}

export function ensureNonNegativeDecimal(value, fieldName) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw createHttpError(400, `${fieldName} deve ser um valor numerico maior ou igual a zero.`);
  }

  return roundCurrency(normalized);
}

export function ensureEnum(value, options, fieldName) {
  if (!options.includes(value)) {
    throw createHttpError(400, `${fieldName} invalido.`);
  }

  return value;
}

export function normalizeSearchTerm(value = '') {
  return String(value ?? '').trim();
}

export function ensureDateString(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) {
    throw createHttpError(400, `${fieldName} deve estar no formato AAAA-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${fieldName} invalida.`);
  }

  return value;
}

export function ensureDateRange(startDate, endDate) {
  const today = new Date();
  const defaultEnd = toDateInputValue(today);
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(defaultStartDate.getDate() - 6);
  const defaultStart = toDateInputValue(defaultStartDate);

  const normalizedStart = ensureDateString(startDate || defaultStart, 'Data inicial');
  const normalizedEnd = ensureDateString(endDate || defaultEnd, 'Data final');

  if (normalizedStart > normalizedEnd) {
    throw createHttpError(400, 'A data inicial nao pode ser maior que a data final.');
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
  };
}
