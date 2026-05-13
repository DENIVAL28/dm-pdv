import * as financeiroService from '../services/financeiroService.js';
import { sendSuccess } from '../utils/http.js';

export async function resumo(req, res, next) {
  try {
    const data = await financeiroService.obterResumoFinanceiro(req.user.empresaId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function lancamentos(req, res, next) {
  try {
    const data = await financeiroService.listarLancamentos(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function criarLancamento(req, res, next) {
  try {
    const data = await financeiroService.criarLancamentoManual(req.user, req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function contasReceber(req, res, next) {
  try {
    const data = await financeiroService.listarContasReceber(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function receberConta(req, res, next) {
  try {
    const data = await financeiroService.receberConta(req.user, req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function contasPagar(req, res, next) {
  try {
    const data = await financeiroService.listarContasPagar(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function pagarConta(req, res, next) {
  try {
    const data = await financeiroService.pagarConta(req.user, req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function conciliacoesCartao(req, res, next) {
  try {
    const data = await financeiroService.listarConciliacoesCartao(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function conciliarCartao(req, res, next) {
  try {
    const data = await financeiroService.conciliarCartao(req.user, req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
