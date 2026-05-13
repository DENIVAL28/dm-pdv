import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function listPurchaseSuggestions(filters = {}) {
  return api(
    `/compras/sugestao-compra${toQueryString({
      limite: filters.limite,
    })}`
  );
}

export function listPurchaseOrders(filters = {}) {
  return api(
    `/compras/pedidos${toQueryString({
      limite: filters.limite,
      status: filters.status,
    })}`
  );
}

export function createPurchaseOrder(payload) {
  return api('/compras/pedidos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function finalizePurchaseOrder(id) {
  return api(`/compras/pedidos/${id}/finalizar`, {
    method: 'POST',
  });
}

export function listEntries(filters = {}) {
  return api(
    `/entradas${toQueryString({
      limite: filters.limite,
    })}`
  );
}

export function createEntry(payload) {
  return api('/entradas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
