import { clearSession, getToken } from './session.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    if (response.status === 401) {
      clearSession();
    }

    throw new Error(payload?.message || 'Nao foi possivel concluir a requisicao.');
  }

  return payload;
}

export async function api(path, options = {}) {
  const payload = await request(path, options);
  return payload.data;
}

export { API_URL, request };
