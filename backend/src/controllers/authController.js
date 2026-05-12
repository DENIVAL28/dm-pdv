import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/http.js';

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body.email, req.body.senha);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
