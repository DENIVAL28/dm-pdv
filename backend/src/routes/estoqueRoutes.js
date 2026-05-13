import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as estoqueController from '../controllers/estoqueController.js';

const router = Router();

router.use(authMiddleware);

router.get('/movimentos', estoqueController.movimentos);
router.post('/ajustes', estoqueController.ajuste);
router.post('/perdas', estoqueController.perda);
router.get('/inventarios', estoqueController.inventarios);
router.get('/inventarios/atual', estoqueController.inventarioAtual);
router.post('/inventarios', estoqueController.abrirInventario);
router.get('/inventarios/:id/itens', estoqueController.itensInventario);
router.post('/inventarios/:id/itens/contagem', estoqueController.contagemInventario);
router.post('/inventarios/:id/finalizar', estoqueController.finalizarInventario);
router.post('/inventarios/:id/cancelar', estoqueController.cancelarInventario);

export default router;
