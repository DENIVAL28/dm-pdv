import * as fornecedorService from '../services/fornecedorService.js';
import { sendSuccess } from '../utils/http.js';

export async function listar(req, res, next) {
  try {
    const fornecedores = await fornecedorService.listar(req.user.empresaId, req.query);
    sendSuccess(res, fornecedores);
  } catch (error) {
    next(error);
  }
}

export async function criar(req, res, next) {
  try {
    const fornecedor = await fornecedorService.criar(req.user.empresaId, req.body);
    sendSuccess(res, fornecedor, 201);
  } catch (error) {
    next(error);
  }
}

export async function atualizar(req, res, next) {
  try {
    const fornecedor = await fornecedorService.atualizar(
      req.user.empresaId,
      req.params.id,
      req.body
    );
    sendSuccess(res, fornecedor);
  } catch (error) {
    next(error);
  }
}

export async function remover(req, res, next) {
  try {
    const result = await fornecedorService.remover(req.user.empresaId, req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
