import jwt from 'jsonwebtoken';
import { createHttpError } from '../utils/http.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(createHttpError(401, 'Token nao informado.'));
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(createHttpError(401, 'Token invalido.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      nome: decoded.nome,
      email: decoded.email,
      empresaId: decoded.empresaId,
      empresaNome: decoded.empresaNome,
    };
    return next();
  } catch {
    return next(createHttpError(401, 'Token invalido ou expirado.'));
  }
}
