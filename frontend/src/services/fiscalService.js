import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function getFiscalConfig() {
  return api('/fiscal/configuracao');
}

export function updateFiscalConfig(payload) {
  return api('/fiscal/configuracao', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function listFiscalDocuments(filters = {}) {
  return api(
    `/fiscal/documentos${toQueryString({
      limite: filters.limite,
      status: filters.status,
    })}`
  );
}

export function issueFiscalDocumentBySale(vendaId) {
  return api(`/fiscal/documentos/venda/${vendaId}/emitir`, {
    method: 'POST',
  });
}

export function cancelFiscalDocument(documentId, payload) {
  return api(`/fiscal/documentos/${documentId}/cancelar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
