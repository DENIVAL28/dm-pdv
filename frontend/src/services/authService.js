import { api } from './api.js';

export function login(credentials) {
  return api('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}
