import { api } from './api.js';

export function listCashRegisters() {
  return api('/caixas');
}

export function getCurrentCashSession() {
  return api('/caixas/sessao-atual');
}

export function openCashSession(payload) {
  return api('/caixas/sessoes/abrir', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function registerCashWithdrawal(sessionId, payload) {
  return api(`/caixas/sessoes/${sessionId}/sangria`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function registerCashSupply(sessionId, payload) {
  return api(`/caixas/sessoes/${sessionId}/suprimento`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function closeCashSession(sessionId, payload) {
  return api(`/caixas/sessoes/${sessionId}/fechar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
