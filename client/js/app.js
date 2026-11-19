import { api } from './api.js';
import { getToken, getUser, setUser, clearSession, hasRole } from './auth.js';
import { avatar, esc, flash } from './ui.js';
import { API_BASE_URL } from './config.js';
import { homePage } from './pages/home.js';
import { loginPage, registerPage } from './pages/auth.js';
import { tournamentsPage } from './pages/tournaments.js';
import { tournamentPage } from './pages/tournament.js';
import { tournamentFormPage } from './pages/tournament-form.js';
import { myPage } from './pages/my.js';
import { adminPage } from './pages/admin.js';

const app = document.getElementById('app');

// [шаблон, страница, нужна ли авторизация, роли, на всю ширину]
const routes = [
  [/^#?\/?$/, homePage, false, null, true],
  [/^#\/login$/, loginPage, false, null, true],
  [/^#\/register$/, registerPage, false, null, true],
  [/^#\/tournaments(\?.*)?$/, tournamentsPage],
  [/^#\/tournaments\/new$/, tournamentFormPage, true, ['organizer', 'admin']],
  [/^#\/tournaments\/(\d+)\/edit$/, tournamentFormPage, true, ['organizer', 'admin']],
  [/^#\/tournaments\/(\d+)$/, tournamentPage],
  [/^#\/my$/, myPage, true],
  [/^#\/admin$/, adminPage, true, ['admin']],
];

async function loadUser() {
  if (!getToken() || getUser()) return;
  try {
    const { data } = await api('/user');
    setUser(data);
  } catch {
    clearSession();
  }
}

function renderNav(hash) {
  const user = getUser();
  const link = (href, label) => {
    const active = hash === href || (href !== '#/' && hash.startsWith(href.split('?')[0]) && !hash.startsWith('#/tournaments/new'))
      || (href === '#/tournaments/new' && hash === href);
    return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  };
  const links = [link('#/tournaments', 'Турниры')];

  if (user) {
    links.push(link('#/my', 'Мои турниры'));
    if (hasRole('organizer', 'admin')) links.push(link('#/tournaments/new', 'Новый турнир'));
    if (hasRole('admin')) links.push(link('#/admin', 'Администрирование'));
    links.push(`<span class="who"><span>${esc(user.name)}<small>${esc(user.role_label)}</small></span>${avatar(user.name)}</span>`);
    links.push('<a href="#" id="logout">Выйти</a>');
  } else {
    links.push(link('#/login', 'Вход'), '<a href="#/register" class="btn" style="padding:8px 14px">Регистрация</a>');
  }

  const nav = document.getElementById('nav');
  nav.innerHTML = links.join('');
  nav.querySelector('#logout')?.addEventListener('click', async (event) => {
    event.preventDefault();
    try { await api('/logout', { method: 'POST' }); } catch { /* токен мог истечь */ }
    clearSession();
    flash('Вы вышли из системы');
    location.hash = '#/login';
  });
}

async function router() {
  await loadUser();
  const hash = location.hash || '#/';
  renderNav(hash);
  setMenu(false);
  window.scrollTo(0, 0);

  const route = routes.find(([pattern]) => pattern.test(hash));
  if (!route) {
    location.hash = '#/';
    return;
  }

  const [pattern, page, needsAuth, roles, fullWidth] = route;
  app.className = fullWidth ? '' : 'container';

  if (needsAuth && !getUser()) {
    location.hash = '#/login';
    return;
  }
  if (roles && !hasRole(...roles)) {
    app.innerHTML = '<div class="card empty">Эта страница доступна только организаторам и администраторам.</div>';
    return;
  }

  const params = hash.match(pattern).slice(1).filter((p) => p && !p.startsWith('?'));
  app.innerHTML = '<p class="muted">Загрузка…</p>';
  try {
    await page(app, ...params);
  } catch (error) {
    app.innerHTML = `<div class="card empty">${esc(error.message || 'Не удалось загрузить страницу')}</div>`;
  }
}

async function checkApi() {
  const dot = document.getElementById('api-dot');
  const text = document.getElementById('api-status');
  try {
    const res = await fetch(API_BASE_URL.replace('/v1', '') + '/health', { headers: { Accept: 'application/json' } });
    const ok = res.ok;
    dot.className = `api-dot ${ok ? 'on' : 'off'}`;
    text.textContent = ok ? 'Сервер работает' : 'Сервер недоступен';
  } catch {
    dot.className = 'api-dot off';
    text.textContent = 'Сервер недоступен';
  }
}

const toggle = document.getElementById('nav-toggle');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
}
toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
const topbar = document.querySelector('.topbar');
window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 8), { passive: true });

document.getElementById('year').textContent = new Date().getFullYear();
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => { router(); checkApi(); });
