import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as relatorioController from '../controllers/relatorioController.js';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', relatorioController.dashboard);
router.get('/vendas', relatorioController.vendas);
router.get('/vendas-dia', relatorioController.vendasDia);

export default router;
