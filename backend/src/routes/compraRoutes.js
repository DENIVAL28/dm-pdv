import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as compraController from '../controllers/compraController.js';

const router = Router();

router.use(authMiddleware);

router.get('/pedidos', compraController.listarPedidos);
router.post('/pedidos', compraController.criarPedido);
router.post('/pedidos/:id/finalizar', compraController.finalizarPedido);
router.get('/sugestao-compra', compraController.sugestaoCompra);

export default router;
