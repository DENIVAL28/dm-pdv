import * as caixaService from '../services/caixaService.js';
import { sendSuccess } from '../utils/http.js';

export async function listar(req, res, next) {
  try {
    const caixas = await caixaService.listarCaixas(req.user.empresaId);
    sendSuccess(res, caixas);
  } catch (error) {
    next(error);
  }
}

export async function sessaoAtual(req, res, next) {
  try {
    const sessao = await caixaService.obterSessaoAtual(req.user);
    sendSuccess(res, sessao);
  } catch (error) {
    next(error);
  }
}

export async function abrir(req, res, next) {
  try {
    const data = await caixaService.abrirSessao(req.user, req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function sangria(req, res, next) {
  try {
    const data = await caixaService.registrarMovimento(
      req.user,
      req.params.id,
      req.body,
      'sangria'
    );
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function suprimento(req, res, next) {
  try {
    const data = await caixaService.registrarMovimento(
      req.user,
      req.params.id,
      req.body,
      'suprimento'
    );
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function fechar(req, res, next) {
  try {
    const data = await caixaService.fecharSessao(req.user, req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function resumo(req, res, next) {
  try {
    const data = await caixaService.obterResumoSessao(req.user.empresaId, req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
