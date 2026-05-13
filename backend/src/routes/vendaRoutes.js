import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as vendaController from '../controllers/vendaController.js';

const router = Router();

router.use(authMiddleware);

router.post('/', vendaController.finalizar);
router.get('/', vendaController.listar);
router.post('/:id/cancelar', vendaController.cancelar);

export default router;
