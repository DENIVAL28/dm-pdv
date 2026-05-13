import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import produtoRoutes from './routes/produtoRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import caixaRoutes from './routes/caixaRoutes.js';
import fornecedorRoutes from './routes/fornecedorRoutes.js';
import compraRoutes from './routes/compraRoutes.js';
import entradaRoutes from './routes/entradaRoutes.js';
import estoqueRoutes from './routes/estoqueRoutes.js';
import fiscalRoutes from './routes/fiscalRoutes.js';
import vendaRoutes from './routes/vendaRoutes.js';
import relatorioRoutes from './routes/relatorioRoutes.js';
import { createHttpError, normalizeDatabaseError, sendSuccess } from './utils/http.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function sendApiEntry(res) {
  sendSuccess(res, {
    app: 'DM PDV API',
    status: 'online',
    frontend: 'http://localhost:5173',
    endpoints: {
      health: '/api/health',
      login: '/api/auth/login',
      produtos: '/api/produtos',
      clientes: '/api/clientes',
      caixas: '/api/caixas',
      fornecedores: '/api/fornecedores',
      compras: '/api/compras/pedidos',
      entradas: '/api/entradas',
      estoque_movimentos: '/api/estoque/movimentos',
      estoque_inventarios: '/api/estoque/inventarios',
      fiscal: '/api/fiscal/documentos',
      vendas: '/api/vendas',
      relatorios: '/api/relatorios',
    },
  });
}

app.get('/', (req, res) => {
  sendApiEntry(res);
});

app.get('/api', (req, res) => {
  sendApiEntry(res);
});

app.get('/api/health', (req, res) => {
  sendSuccess(res, { status: 'online', app: 'DM PDV' });
});

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/caixas', caixaRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/entradas', entradaRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/relatorios', relatorioRoutes);

app.use((req, res, next) => {
  next(createHttpError(404, 'Rota nao encontrada.'));
});

app.use((err, req, res, next) => {
  const error = normalizeDatabaseError(err);
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    success: false,
    message: error.message || 'Erro interno do servidor.',
    details: error.details || undefined,
  });
});

export default app;
