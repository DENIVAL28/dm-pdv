import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function getFinancialSummary() {
  return api('/financeiro/resumo');
}

export function listFinancialEntries(filters = {}) {
  return api(
    `/financeiro/lancamentos${toQueryString({
      limite: filters.limite,
      status: filters.status,
      tipo: filters.tipo,
    })}`
  );
}

export function createManualFinancialEntry(payload) {
  return api('/financeiro/lancamentos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listReceivables(filters = {}) {
  return api(
    `/financeiro/contas-receber${toQueryString({
      limite: filters.limite,
      status: filters.status,
    })}`
  );
}

export function receiveReceivable(id, payload = {}) {
  return api(`/financeiro/contas-receber/${id}/receber`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listPayables(filters = {}) {
  return api(
    `/financeiro/contas-pagar${toQueryString({
      limite: filters.limite,
      status: filters.status,
    })}`
  );
}

export function payPayable(id, payload = {}) {
  return api(`/financeiro/contas-pagar/${id}/pagar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listCardReconciliations(filters = {}) {
  return api(
    `/financeiro/conciliacoes/cartao${toQueryString({
      limite: filters.limite,
      status: filters.status,
    })}`
  );
}

export function reconcileCard(id, payload = {}) {
  return api(`/financeiro/conciliacoes/cartao/${id}/conciliar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
