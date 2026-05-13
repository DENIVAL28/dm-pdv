import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as compraController from '../controllers/compraController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', compraController.listarEntradas);
router.post('/', compraController.registrarEntrada);

export default router;
