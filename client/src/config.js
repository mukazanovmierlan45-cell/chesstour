// Базовый адрес API — единственное место, где он задан.
// Можно переопределить переменной окружения VITE_API_URL (файл client/.env).
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
export const API_HEALTH_URL = API_BASE_URL.replace(/\/v1\/?$/, '') + '/health';
