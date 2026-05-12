import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import { ensureRequiredString } from '../utils/validators.js';

export async function login(email, senha) {
  const normalizedEmail = ensureRequiredString(email, 'E-mail', 160).toLowerCase();
  const normalizedPassword = ensureRequiredString(senha, 'Senha', 255);

  const [rows] = await pool.query(
    `SELECT
      u.id,
      u.nome,
      u.email,
      u.senha_hash,
      u.empresa_id,
      e.nome_fantasia AS empresa_nome
     FROM usuarios u
     INNER JOIN empresas e ON e.id = u.empresa_id
     WHERE u.email = ?
     LIMIT 1`,
    [normalizedEmail]
  );
  const usuario = rows[0];

  if (!usuario) {
    throw createHttpError(401, 'Usuario ou senha invalidos.');
  }

  const senhaValida = await bcrypt.compare(normalizedPassword, usuario.senha_hash);

  if (!senhaValida) {
    throw createHttpError(401, 'Usuario ou senha invalidos.');
  }

  const token = jwt.sign(
    {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      empresaId: usuario.empresa_id,
      empresaNome: usuario.empresa_nome,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      empresa: {
        id: usuario.empresa_id,
        nome: usuario.empresa_nome,
      },
    },
  };
}
