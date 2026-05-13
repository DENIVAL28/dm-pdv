import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as clienteController from '../controllers/clienteController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', clienteController.listar);
router.post('/', clienteController.criar);
router.get('/:id', clienteController.obter);
router.get('/:id/compras', clienteController.listarCompras);
router.get('/:id/historico', clienteController.listarHistorico);
router.put('/:id', clienteController.atualizar);
router.post('/:id/enderecos', clienteController.salvarEndereco);
router.put('/:id/enderecos/:enderecoId', clienteController.salvarEndereco);
router.delete('/:id/enderecos/:enderecoId', clienteController.removerEndereco);
router.post('/:id/contatos', clienteController.salvarContato);
router.put('/:id/contatos/:contatoId', clienteController.salvarContato);
router.delete('/:id/contatos/:contatoId', clienteController.removerContato);
router.post('/:id/credito', clienteController.atualizarCredito);
router.delete('/:id', clienteController.remover);

export default router;
