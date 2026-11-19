import { api } from '../api.js';
import { setToken, setUser } from '../auth.js';
import { floating, parallax } from '../board3d.js';
import { checkRequired, flash, formData, showFieldErrors, clearFieldErrors } from '../ui.js';

async function submit(form, path, required) {
  clearFieldErrors(form);
  if (!checkRequired(form, required)) return;

  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const { data, token } = await api(path, { method: 'POST', body: formData(form) });
    setToken(token);
    setUser(data);
    flash(`Добро пожаловать, ${data.name}!`);
    location.hash = '#/';
  } catch (error) {
    if (error.status === 422) showFieldErrors(form, error.errors);
    else flash(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function layout(title, text, box) {
  return `
    <div class="auth">
      <aside class="auth-side">
        <h2>${title}</h2>
        <p>${text}</p>
        <div class="auth-art" aria-hidden="true">
          ${floating('k', 'w', { x: 8, y: 6, size: 120, rot: -10, depth: 26 })}
          ${floating('n', 'b', { x: 46, y: 22, size: 132, rot: 14, depth: 34, delay: 0.2 })}
          ${floating('p', 'w', { x: 74, y: 2, size: 58, rot: 26, depth: 12, blur: 1.5, delay: 0.4 })}
        </div>
      </aside>
      <div class="auth-main"><div class="auth-box">${box}</div></div>
    </div>`;
}

export function loginPage(root) {
  root.innerHTML = layout('С возвращением в клуб', 'Ваши заявки, пары текущего тура и результаты партий ждут в личном кабинете.', `
      <h1>Вход</h1><p class="muted">Войдите, чтобы подавать заявки и вести турниры.</p>
      <form id="login-form" novalidate>
        <div class="row"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username"></div>
        <div class="row"><label for="password">Пароль</label><input id="password" name="password" type="password" autocomplete="current-password"></div>
        <button type="submit">Войти</button>
      </form>
      <p class="hint">Тестовые учётные записи: admin@chess.test, organizer@chess.test, player@chess.test — пароль password.</p>
      <p style="margin-top:16px">Нет аккаунта? <a href="#/register">Зарегистрируйтесь</a></p>`);
  parallax(root.querySelector('.auth-side'));
  const form = root.querySelector('#login-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(form, '/login', ['email', 'password']);
  });
}

export function registerPage(root) {
  root.innerHTML = layout('Первый ход — регистрация', 'После регистрации вы сможете подавать заявки на турниры клуба и следить за своими партиями.', `
      <h1>Регистрация игрока</h1><p class="muted">Это займёт меньше минуты.</p>
      <form id="register-form" novalidate>
        <div class="row"><label for="name">Имя и фамилия</label><input id="name" name="name"></div>
        <div class="row"><label for="email">Email</label><input id="email" name="email" type="email"></div>
        <div class="row"><label for="password">Пароль (не менее 8 символов)</label><input id="password" name="password" type="password"></div>
        <div class="row"><label for="password_confirmation">Повторите пароль</label><input id="password_confirmation" name="password_confirmation" type="password"></div>
        <button type="submit">Зарегистрироваться</button>
      </form>
      <p style="margin-top:16px">Уже есть аккаунт? <a href="#/login">Войдите</a></p>`);
  parallax(root.querySelector('.auth-side'));
  const form = root.querySelector('#register-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(form, '/register', ['name', 'email', 'password', 'password_confirmation']);
  });
}
