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
    const cliente = await clienteService.criar(req.user.empresaId, req.body, req.user);
    sendSuccess(res, cliente, 201);
  } catch (error) {
    next(error);
  }
}

export async function obter(req, res, next) {
  try {
    const cliente = await clienteService.obterPorId(req.user.empresaId, req.params.id);
    sendSuccess(res, cliente);
  } catch (error) {
    next(error);
  }
}

export async function atualizar(req, res, next) {
  try {
    const cliente = await clienteService.atualizar(req.user.empresaId, req.params.id, req.body, req.user);
    sendSuccess(res, cliente);
  } catch (error) {
    next(error);
  }
}

export async function listarCompras(req, res, next) {
  try {
    const compras = await clienteService.listarCompras(req.user.empresaId, req.params.id, req.query);
    sendSuccess(res, compras);
  } catch (error) {
    next(error);
  }
}

export async function listarHistorico(req, res, next) {
  try {
    const historico = await clienteService.listarHistorico(req.user.empresaId, req.params.id, req.query);
    sendSuccess(res, historico);
  } catch (error) {
    next(error);
  }
}

export async function salvarEndereco(req, res, next) {
  try {
    const cliente = await clienteService.salvarEndereco(
      req.user.empresaId,
      req.params.id,
      req.body,
      req.user,
      req.params.enderecoId
    );
    sendSuccess(res, cliente, req.params.enderecoId ? 200 : 201);
  } catch (error) {
    next(error);
  }
}

export async function removerEndereco(req, res, next) {
  try {
    const result = await clienteService.removerEndereco(
      req.user.empresaId,
      req.params.id,
      req.params.enderecoId,
      req.user
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function salvarContato(req, res, next) {
  try {
    const cliente = await clienteService.salvarContato(
      req.user.empresaId,
      req.params.id,
      req.body,
      req.user,
      req.params.contatoId
    );
    sendSuccess(res, cliente, req.params.contatoId ? 200 : 201);
  } catch (error) {
    next(error);
  }
}

export async function removerContato(req, res, next) {
  try {
    const result = await clienteService.removerContato(
      req.user.empresaId,
      req.params.id,
      req.params.contatoId,
      req.user
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function atualizarCredito(req, res, next) {
  try {
    const cliente = await clienteService.atualizarCredito(req.user.empresaId, req.params.id, req.body, req.user);
    sendSuccess(res, cliente);
  } catch (error) {
    next(error);
  }
}

export async function remover(req, res, next) {
  try {
    const result = await clienteService.remover(req.user.empresaId, req.params.id, req.user);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
