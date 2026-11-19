// Токен хранится в localStorage (риск — доступ из JS при XSS; поэтому вывод экранируется)
const TOKEN_KEY = 'chess_token';
let currentUser = null;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getUser = () => currentUser;
export const setUser = (user) => { currentUser = user; };

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  currentUser = null;
}

export const hasRole = (...roles) => !!currentUser && roles.includes(currentUser.role);
