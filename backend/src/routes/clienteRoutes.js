import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as clienteController from '../controllers/clienteController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', clienteController.listar);
router.post('/', clienteController.criar);
router.put('/:id', clienteController.atualizar);
router.delete('/:id', clienteController.remover);

export default router;
