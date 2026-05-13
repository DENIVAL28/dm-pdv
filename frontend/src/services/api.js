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

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor local.');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    if (response.status === 401) {
      clearSession();
    }

    throw new Error(payload?.message || 'Não foi possível concluir a requisição.');
  }

  return payload;
}

export async function api(path, options = {}) {
  const payload = await request(path, options);
  return payload.data;
}

export { API_URL, request };
