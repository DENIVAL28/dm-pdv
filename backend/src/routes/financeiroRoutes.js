import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as financeiroController from '../controllers/financeiroController.js';

const router = Router();

router.use(authMiddleware);

router.get('/resumo', financeiroController.resumo);
router.get('/lancamentos', financeiroController.lancamentos);
router.post('/lancamentos', financeiroController.criarLancamento);
router.get('/contas-receber', financeiroController.contasReceber);
router.post('/contas-receber/:id/receber', financeiroController.receberConta);
router.get('/contas-pagar', financeiroController.contasPagar);
router.post('/contas-pagar/:id/pagar', financeiroController.pagarConta);
router.get('/conciliacoes/cartao', financeiroController.conciliacoesCartao);
router.post('/conciliacoes/cartao/:id/conciliar', financeiroController.conciliarCartao);

export default router;
