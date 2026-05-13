import * as compraService from '../services/compraService.js';
import * as produtoService from '../services/produtoService.js';
import { sendSuccess } from '../utils/http.js';

export async function listarPedidos(req, res, next) {
  try {
    const data = await compraService.listarPedidos(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function criarPedido(req, res, next) {
  try {
    const data = await compraService.criarPedido(req.user, req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function finalizarPedido(req, res, next) {
  try {
    const data = await compraService.finalizarPedido(req.user.empresaId, req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function listarEntradas(req, res, next) {
  try {
    const data = await compraService.listarEntradas(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function registrarEntrada(req, res, next) {
  try {
    const data = await compraService.registrarEntrada(req.user, req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function sugestaoCompra(req, res, next) {
  try {
    const data = await produtoService.listarSugestaoCompra(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
