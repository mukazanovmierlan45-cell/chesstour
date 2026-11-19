import { api } from '../api.js';
import { getUser } from '../auth.js';
import { checkRequired, clearFieldErrors, esc, flash, formData, showFieldErrors } from '../ui.js';

const ROLES = { player: 'Игрок', organizer: 'Организатор', admin: 'Администратор' };
const TYPES = { classical: 'Классика', rapid: 'Рапид', blitz: 'Блиц', bullet: 'Пуля' };

export async function adminPage(root) {
  const [{ data: stats }, { data: timeControls }, { data: users }] = await Promise.all([
    api('/stats/overview'), api('/time-controls'), api('/users', { query: { per_page: 50 } }),
  ]);
  const reload = () => adminPage(root);
  const me = getUser();

  root.innerHTML = `
    <div class="page-head"><div><h1>Администрирование</h1><p>Статистика клуба, контроли времени и роли пользователей</p></div></div>
    <div class="grid">
      <div class="card"><h2 style="margin-top:0">Турниры: ${stats.tournaments.total}</h2>
        ${Object.entries(stats.tournaments.by_status).map(([k, v]) => `<div>${esc(k)}: <b>${v}</b></div>`).join('')}</div>
      <div class="card"><h2 style="margin-top:0">Партии: ${stats.games.total}</h2>
        ${Object.entries(stats.games.by_result).map(([k, v]) => `<div>${esc(k)}: <b>${v}</b></div>`).join('')}</div>
      <div class="card"><h2 style="margin-top:0">Самые активные игроки</h2>
        ${stats.most_active_players.map((p) => `<div>${esc(p.name)} — ${p.games_played} партий</div>`).join('') || '<span class="muted">нет данных</span>'}</div>
    </div>

    <h2>Контроли времени</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Название</th><th>Вид</th><th>Время</th><th>Турниров</th><th></th></tr></thead>
      <tbody>${timeControls.map((tc) => `<tr>
        <td>${esc(tc.name)}</td><td>${esc(tc.type_label)}</td><td>${esc(tc.short)}</td><td>${tc.tournaments_count ?? 0}</td>
        <td><button class="danger" data-delete-tc="${tc.id}">Удалить</button></td></tr>`).join('')}
      </tbody>
    </table></div>
    <form id="tc-form" class="card" novalidate style="margin-top:12px">
      <div class="inline">
        <div class="row"><label for="tc-name">Название</label><input id="tc-name" name="name" placeholder="Рапид 25+10"></div>
        <div class="row"><label for="tc-type">Вид</label><select id="tc-type" name="type">${Object.entries(TYPES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
        <div class="row"><label for="tc-min">Минут</label><input id="tc-min" type="number" name="base_minutes" min="1"></div>
        <div class="row"><label for="tc-inc">Добавление, с</label><input id="tc-inc" type="number" name="increment_seconds" min="0" value="0"></div>
      </div>
      <button type="submit">Добавить контроль</button>
    </form>

    <h2>Пользователи</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Имя</th><th>Email</th><th>Рейтинг</th><th>Роль</th><th></th></tr></thead>
      <tbody>${users.map((u) => `<tr>
        <td>${esc(u.name)}</td><td>${esc(u.email ?? '')}</td><td>${u.rating}</td>
        <td><select data-role="${u.id}" ${u.id === me.id ? 'disabled' : ''}>${Object.entries(ROLES).map(([v, l]) => `<option value="${v}" ${v === u.role ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td>${u.id === me.id ? '' : `<button class="danger" data-delete-user="${u.id}">Удалить</button>`}</td></tr>`).join('')}
      </tbody>
    </table></div>`;

  const run = async (promise, message) => {
    try { await promise; flash(message); reload(); } catch (error) { flash(error.message, 'error'); }
  };

  root.querySelectorAll('[data-delete-tc]').forEach((b) => b.addEventListener('click', () => {
    if (confirm('Удалить контроль времени?')) run(api(`/time-controls/${b.dataset.deleteTc}`, { method: 'DELETE' }), 'Удалено');
  }));
  root.querySelectorAll('[data-delete-user]').forEach((b) => b.addEventListener('click', () => {
    if (confirm('Удалить пользователя?')) run(api(`/users/${b.dataset.deleteUser}`, { method: 'DELETE' }), 'Пользователь удалён');
  }));
  root.querySelectorAll('[data-role]').forEach((s) => s.addEventListener('change', () =>
    run(api(`/users/${s.dataset.role}`, { method: 'PATCH', body: { role: s.value } }), 'Роль изменена')));

  const form = root.querySelector('#tc-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    if (!checkRequired(form, ['name', 'base_minutes'])) return;
    const body = formData(form);
    body.base_minutes = Number(body.base_minutes);
    body.increment_seconds = Number(body.increment_seconds || 0);
    try {
      await api('/time-controls', { method: 'POST', body });
      flash('Контроль времени добавлен');
      reload();
    } catch (error) {
      if (error.status === 422) showFieldErrors(form, error.errors);
      else flash(error.message, 'error');
    }
  });
}
