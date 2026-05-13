import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function listSuppliers(filters = {}) {
  return api(
    `/fornecedores${toQueryString({
      busca: filters.busca,
      limite: filters.limite,
      incluir_inativos: filters.incluirInativos ? 1 : undefined,
    })}`
  );
}

export function createSupplier(payload) {
  return api('/fornecedores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSupplier(id, payload) {
  return api(`/fornecedores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function removeSupplier(id) {
  return api(`/fornecedores/${id}`, {
    method: 'DELETE',
  });
}
