import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function finalizeSale(payload) {
  return api('/vendas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listSales(filters = {}) {
  return api(`/vendas${toQueryString({
    limite: filters.limite,
  })}`);
}
