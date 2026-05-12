import * as vendaService from '../services/vendaService.js';
import { sendSuccess } from '../utils/http.js';

export async function finalizar(req, res, next) {
  try {
    const venda = await vendaService.finalizarVenda(req.user, req.body);
    sendSuccess(res, venda, 201);
  } catch (error) {
    next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const vendas = await vendaService.listar(req.user.empresaId, req.query);
    sendSuccess(res, vendas);
  } catch (error) {
    next(error);
  }
}
