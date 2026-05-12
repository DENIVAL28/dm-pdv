import * as clienteService from '../services/clienteService.js';
import { sendSuccess } from '../utils/http.js';

export async function listar(req, res, next) {
  try {
    const clientes = await clienteService.listar(req.user.empresaId, req.query);
    sendSuccess(res, clientes);
  } catch (error) {
    next(error);
  }
}

export async function criar(req, res, next) {
  try {
    const cliente = await clienteService.criar(req.user.empresaId, req.body);
    sendSuccess(res, cliente, 201);
  } catch (error) {
    next(error);
  }
}

export async function atualizar(req, res, next) {
  try {
    const cliente = await clienteService.atualizar(req.user.empresaId, req.params.id, req.body);
    sendSuccess(res, cliente);
  } catch (error) {
    next(error);
  }
}

export async function remover(req, res, next) {
  try {
    const result = await clienteService.remover(req.user.empresaId, req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
