import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function listCustomers(filters = {}) {
  return api(`/clientes${toQueryString({
    busca: filters.busca,
    limite: filters.limite,
  })}`);
}

export function createCustomer(payload) {
  return api('/clientes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCustomer(id, payload) {
  return api(`/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function removeCustomer(id) {
  return api(`/clientes/${id}`, {
    method: 'DELETE',
  });
}
