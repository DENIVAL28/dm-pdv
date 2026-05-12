import * as produtoService from '../services/produtoService.js';
import { sendSuccess } from '../utils/http.js';

export async function listar(req, res, next) {
  try {
    const produtos = await produtoService.listar(req.user.empresaId, req.query);
    sendSuccess(res, produtos);
  } catch (error) {
    next(error);
  }
}

export async function criar(req, res, next) {
  try {
    const produto = await produtoService.criar(req.user.empresaId, req.body);
    sendSuccess(res, produto, 201);
  } catch (error) {
    next(error);
  }
}

export async function atualizar(req, res, next) {
  try {
    const produto = await produtoService.atualizar(req.user.empresaId, req.params.id, req.body);
    sendSuccess(res, produto);
  } catch (error) {
    next(error);
  }
}

export async function remover(req, res, next) {
  try {
    const result = await produtoService.remover(req.user.empresaId, req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
