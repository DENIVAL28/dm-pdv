import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as produtoController from '../controllers/produtoController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', produtoController.listar);
router.post('/', produtoController.criar);
router.put('/:id', produtoController.atualizar);
router.delete('/:id', produtoController.remover);

export default router;
