import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function listStockMovements(filters = {}) {
  return api(
    `/estoque/movimentos${toQueryString({
      busca: filters.busca,
      produto_id: filters.produtoId,
      limite: filters.limite,
    })}`
  );
}

export function createStockAdjustment(payload) {
  return api('/estoque/ajustes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createStockLoss(payload) {
  return api('/estoque/perdas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listInventories(filters = {}) {
  return api(
    `/estoque/inventarios${toQueryString({
      limite: filters.limite,
      status: filters.status,
    })}`
  );
}

export function getCurrentInventory() {
  return api('/estoque/inventarios/atual');
}

export function createInventory(payload) {
  return api('/estoque/inventarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listInventoryItems(inventoryId, filters = {}) {
  return api(
    `/estoque/inventarios/${inventoryId}/itens${toQueryString({
      busca: filters.busca,
      limite: filters.limite,
      pendentes: filters.pendentes ? 1 : undefined,
    })}`
  );
}

export function recordInventoryCount(inventoryId, payload) {
  return api(`/estoque/inventarios/${inventoryId}/itens/contagem`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function closeInventory(inventoryId, payload = {}) {
  return api(`/estoque/inventarios/${inventoryId}/finalizar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelInventory(inventoryId, payload = {}) {
  return api(`/estoque/inventarios/${inventoryId}/cancelar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
