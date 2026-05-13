import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as fiscalController from '../controllers/fiscalController.js';

const router = Router();

router.use(authMiddleware);

router.get('/configuracao', fiscalController.configuracao);
router.put('/configuracao', fiscalController.salvarConfiguracao);
router.get('/documentos', fiscalController.documentos);
router.get('/documentos/:id', fiscalController.documento);
router.post('/documentos/venda/:vendaId/emitir', fiscalController.emitir);
router.post('/documentos/:id/cancelar', fiscalController.cancelar);

export default router;
