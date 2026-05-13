import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as fornecedorController from '../controllers/fornecedorController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', fornecedorController.listar);
router.post('/', fornecedorController.criar);
router.put('/:id', fornecedorController.atualizar);
router.delete('/:id', fornecedorController.remover);

export default router;
