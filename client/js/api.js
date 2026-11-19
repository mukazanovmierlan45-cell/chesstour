import { API_BASE_URL } from './config.js';
import { getToken, clearSession } from './auth.js';

export class ApiError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors; // объект errors из ответа 422
  }
}

/**
 * Общая функция запросов к API.
 * - добавляет Accept, Content-Type и Authorization: Bearer <token>;
 * - 401: удаляет токен и отправляет на страницу входа;
 * - 422: бросает ApiError с объектом errors для вывода в форме;
 * - ошибки сети и 500 превращаются в понятное сообщение.
 */
export async function api(path, { method = 'GET', body, formData, query } = {}) {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) url.searchParams.set(key, value);
    });
  }

  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // Content-Type с boundary браузер выставит сам
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте, что API запущен');
  }

  if (response.status === 204) return null;

  let data = null;
  try { data = await response.json(); } catch { /* пустой ответ */ }

  if (response.ok) return data;

  const message = data?.message || `Ошибка ${response.status}`;

  if (response.status === 401) {
    clearSession();
    if (!location.hash.startsWith('#/login')) location.hash = '#/login';
    throw new ApiError(401, message);
  }
  if (response.status === 422) throw new ApiError(422, message, data?.errors || {});
  if (response.status >= 500) throw new ApiError(response.status, 'Внутренняя ошибка сервера, попробуйте позже');

  throw new ApiError(response.status, message);
}
