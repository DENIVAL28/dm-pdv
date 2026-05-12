import * as relatorioService from '../services/relatorioService.js';
import { sendSuccess } from '../utils/http.js';
import { toDateInputValue } from '../utils/validators.js';

export async function dashboard(req, res, next) {
  try {
    const data = await relatorioService.obterResumoDashboard(req.user.empresaId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function vendas(req, res, next) {
  try {
    const data = await relatorioService.obterRelatorioVendas(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function vendasDia(req, res, next) {
  try {
    const today = toDateInputValue();
    const data = await relatorioService.obterRelatorioVendas(req.user.empresaId, {
      data_inicial: today,
      data_final: today,
    });

    sendSuccess(res, {
      resumo: data.resumo,
      ultimas_vendas: data.vendas.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
}
