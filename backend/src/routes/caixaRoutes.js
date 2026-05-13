import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as caixaController from '../controllers/caixaController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', caixaController.listar);
router.get('/sessao-atual', caixaController.sessaoAtual);
router.post('/sessoes/abrir', caixaController.abrir);
router.post('/sessoes/:id/sangria', caixaController.sangria);
router.post('/sessoes/:id/suprimento', caixaController.suprimento);
router.post('/sessoes/:id/fechar', caixaController.fechar);
router.get('/sessoes/:id/resumo', caixaController.resumo);

export default router;
