import { api } from './api.js';
import { toQueryString } from '../utils/queryString.js';

export function getDashboardData() {
  return api('/relatorios/dashboard');
}

export function getSalesReport(filters = {}) {
  return api(`/relatorios/vendas${toQueryString({
    data_inicial: filters.dataInicial,
    data_final: filters.dataFinal,
  })}`);
}
