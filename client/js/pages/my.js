import { api } from '../api.js';
import { badge, esc, formatDate } from '../ui.js';

export async function myPage(root) {
  const [{ data: tournaments }, { data: games }] = await Promise.all([api('/my/tournaments'), api('/my/games')]);

  root.innerHTML = `
    <div class="page-head"><div><h1>Мои турниры</h1><p>Заявки, статусы допуска и сыгранные партии</p></div><a class="btn secondary" href="#/tournaments?status=registration">Найти турнир</a></div>
    ${tournaments.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Турнир</th><th>Даты</th><th>Статус турнира</th><th>Моя заявка</th></tr></thead>
      <tbody>${tournaments.map((t) => `<tr>
        <td><a href="#/tournaments/${t.id}">${esc(t.title)}</a></td>
        <td>${formatDate(t.start_date)}</td>
        <td>${badge(t.status, t.status_label)}</td>
        <td>${t.my_registration ? badge(t.my_registration.status) : '—'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="card empty">Вы ещё не подавали заявок.</div>'}
    <h2>Мои партии</h2>
    ${games.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Турнир</th><th>Тур</th><th>Белые</th><th>Результат</th><th>Чёрные</th></tr></thead>
      <tbody>${games.map((g) => `<tr>
        <td>${esc(g.round?.tournament?.title ?? '')}</td><td>${g.round?.number ?? ''}</td>
        <td>${esc(g.white?.name ?? '')}</td><td class="result">${esc(g.result_notation)}</td>
        <td>${g.is_bye ? 'без пары' : esc(g.black?.name ?? '')}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="card empty">Сыгранных партий пока нет.</div>'}`;
}
