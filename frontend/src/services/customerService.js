import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function listCustomers(filters = {}) {
  return api(`/clientes${toQueryString({
    busca: filters.busca,
    limite: filters.limite,
  })}`);
}

export function getCustomerProfile(id) {
  return api(`/clientes/${id}`);
}

export function listCustomerSales(id, filters = {}) {
  return api(`/clientes/${id}/compras${toQueryString({
    limite: filters.limite,
  })}`);
}

export function listCustomerHistory(id, filters = {}) {
  return api(`/clientes/${id}/historico${toQueryString({
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

export function saveCustomerAddress(customerId, payload, addressId = null) {
  return api(
    addressId ? `/clientes/${customerId}/enderecos/${addressId}` : `/clientes/${customerId}/enderecos`,
    {
      method: addressId ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function removeCustomerAddress(customerId, addressId) {
  return api(`/clientes/${customerId}/enderecos/${addressId}`, {
    method: 'DELETE',
  });
}

export function saveCustomerContact(customerId, payload, contactId = null) {
  return api(
    contactId ? `/clientes/${customerId}/contatos/${contactId}` : `/clientes/${customerId}/contatos`,
    {
      method: contactId ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function removeCustomerContact(customerId, contactId) {
  return api(`/clientes/${customerId}/contatos/${contactId}`, {
    method: 'DELETE',
  });
}

export function updateCustomerCredit(customerId, payload) {
  return api(`/clientes/${customerId}/credito`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
