import * as estoqueService from '../services/estoqueService.js';
import { sendSuccess } from '../utils/http.js';

export async function movimentos(req, res, next) {
  try {
    const data = await estoqueService.listarMovimentos(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function ajuste(req, res, next) {
  try {
    const data = await estoqueService.registrarAjuste(req.user, req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function perda(req, res, next) {
  try {
    const data = await estoqueService.registrarPerda(req.user, req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function inventarios(req, res, next) {
  try {
    const data = await estoqueService.listarInventarios(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function inventarioAtual(req, res, next) {
  try {
    const data = await estoqueService.obterInventarioAtual(req.user.empresaId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function abrirInventario(req, res, next) {
  try {
    const data = await estoqueService.iniciarInventario(req.user, req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function itensInventario(req, res, next) {
  try {
    const data = await estoqueService.listarItensInventario(
      req.user.empresaId,
      req.params.id,
      req.query
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function contagemInventario(req, res, next) {
  try {
    const data = await estoqueService.registrarContagemInventario(
      req.user,
      req.params.id,
      req.body
    );
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function finalizarInventario(req, res, next) {
  try {
    const data = await estoqueService.finalizarInventario(req.user, req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function cancelarInventario(req, res, next) {
  try {
    const data = await estoqueService.cancelarInventario(req.user, req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
