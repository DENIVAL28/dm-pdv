import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import produtoRoutes from './routes/produtoRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import vendaRoutes from './routes/vendaRoutes.js';
import relatorioRoutes from './routes/relatorioRoutes.js';
import { createHttpError, normalizeDatabaseError, sendSuccess } from './utils/http.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  sendSuccess(res, { status: 'online', app: 'DM PDV' });
});

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/clientes', clienteRoutes);
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
