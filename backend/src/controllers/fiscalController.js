import * as fiscalService from '../services/fiscalService.js';
import { sendSuccess } from '../utils/http.js';

export async function configuracao(req, res, next) {
  try {
    const data = await fiscalService.obterConfiguracaoFiscal(req.user.empresaId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function salvarConfiguracao(req, res, next) {
  try {
    const data = await fiscalService.salvarConfiguracaoFiscal(req.user.empresaId, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function documentos(req, res, next) {
  try {
    const data = await fiscalService.listarDocumentosFiscais(req.user.empresaId, req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function documento(req, res, next) {
  try {
    const data = await fiscalService.obterDocumentoFiscal(req.user.empresaId, req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function emitir(req, res, next) {
  try {
    const data = await fiscalService.emitirDocumentoFiscal(req.user, req.params.vendaId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function cancelar(req, res, next) {
  try {
    const data = await fiscalService.cancelarDocumentoFiscal(req.user, req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
