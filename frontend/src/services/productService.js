import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function listProducts(filters = {}) {
  return api(`/produtos${toQueryString({
    busca: filters.busca,
    limite: filters.limite,
    codigo_exato: filters.codigoExato ? 1 : undefined,
    somente_estoque_baixo: filters.somenteEstoqueBaixo ? 1 : undefined,
    incluir_inativos: filters.incluirInativos ? 1 : undefined,
  })}`);
}

export function createProduct(payload) {
  return api('/produtos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return api(`/produtos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function removeProduct(id) {
  return api(`/produtos/${id}`, {
    method: 'DELETE',
  });
}
