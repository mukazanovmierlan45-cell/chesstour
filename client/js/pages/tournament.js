import { api } from '../api.js';
import { getUser, hasRole } from '../auth.js';
import { badge, esc, flash, formatDate, formatDateTime } from '../ui.js';

const NEXT_STATUS = {
  draft: [['registration', 'Открыть регистрацию'], ['cancelled', 'Отменить']],
  registration: [['ongoing', 'Начать турнир'], ['cancelled', 'Отменить']],
  ongoing: [['finished', 'Завершить турнир'], ['cancelled', 'Отменить']],
};

const RESULTS = [['pending', '*'], ['white_win', '1-0'], ['draw', '½-½'], ['black_win', '0-1']];

export async function tournamentPage(root, id) {
  const [{ data: t }, { data: participants }, { data: rounds }, { data: standings }] = await Promise.all([
    api(`/tournaments/${id}`),
    api(`/tournaments/${id}/participants`),
    api(`/tournaments/${id}/rounds`),
    api(`/tournaments/${id}/standings`),
  ]);

  const user = getUser();
  // Интерфейс скрывает недоступные действия; сервер всё равно проверяет права (403)
  const canManage = !!user && (hasRole('admin') || (hasRole('organizer') && user.id === t.organizer_id));
  const myEntry = user ? participants.find((p) => p.user.id === user.id) : null;
  const reload = () => tournamentPage(root, id);

  root.innerHTML = `
    <p><a href="#/tournaments">Все турниры</a></p>
    <section class="t-hero">
      <div>
        <div class="actions">${badge(t.status, t.status_label)} <span class="chip">${esc(t.format_label)}</span></div>
        <h1>${esc(t.title)}</h1>
        <p>${esc(t.description || 'Организатор пока не добавил описание турнира.')}</p>
        <div class="actions" id="player-actions" style="margin-top:20px"></div>
      </div>
      ${t.poster_url ? `<img class="poster" src="${esc(t.poster_url)}" alt="Афиша турнира">` : ''}
    </section>
    <div class="t-facts">
      <div><span>Даты</span><b>${formatDate(t.start_date)} – ${formatDate(t.end_date)}</b></div>
      <div><span>Место</span><b>${esc(t.location)}</b></div>
      <div><span>Контроль времени</span><b>${esc(t.time_control?.name ?? '—')}</b></div>
      <div><span>Заявки до</span><b>${formatDateTime(t.registration_deadline)}</b></div>
      <div><span>Участники</span><b>${t.participants_count} из ${t.max_participants}</b></div>
      <div><span>Туры</span><b>${t.rounds_created ?? 0} из ${t.rounds_count}</b></div>
      <div><span>Допуск</span><b>${t.min_rating ? `рейтинг от ${t.min_rating}` : 'без ограничений'}</b></div>
      <div><span>Организатор</span><b>${esc(t.organizer?.name ?? '—')}</b></div>
    </div>
    <div id="manage"></div>
    <h2>Турнирная таблица</h2>
    <div id="standings"></div>
    <h2>Туры и партии</h2>
    <div id="rounds"></div>
    <h2>Участники</h2>
    <div id="participants"></div>`;

  renderPlayerActions(root.querySelector('#player-actions'), t, myEntry, reload);
  if (canManage) renderManage(root.querySelector('#manage'), t, reload);
  renderStandings(root.querySelector('#standings'), standings);
  renderRounds(root.querySelector('#rounds'), t, rounds, canManage, reload);
  renderParticipants(root.querySelector('#participants'), t, participants, canManage, reload);
}

async function act(promise, message, reload) {
  try {
    await promise;
    flash(message);
    reload();
  } catch (error) {
    // 409 — нарушение бизнес-правила: показываем сообщение сервера
    flash(error.message, 'error');
  }
}

function renderPlayerActions(box, t, myEntry, reload) {
  if (!getUser()) {
    box.innerHTML = t.is_registration_open ? '<a class="btn gold" href="#/login">Войти и подать заявку</a>' : '';
    return;
  }
  if (!hasRole('player')) return;

  const active = myEntry && myEntry.status !== 'withdrawn';
  if (active) {
    box.innerHTML = `<span style="color:#c7d2e3">Ваша заявка:</span> ${badge(myEntry.status, myEntry.status_label)}
      ${t.status === 'registration' ? '<button class="btn ghost" id="withdraw">Отозвать заявку</button>' : ''}`;
    box.querySelector('#withdraw')?.addEventListener('click', () => {
      if (confirm('Отозвать заявку на турнир?')) {
        act(api(`/tournaments/${t.id}/registration`, { method: 'DELETE' }), 'Заявка отозвана', reload);
      }
    });
  } else {
    // Кнопка видна даже при закрытой регистрации — чтобы показать ответ 409 от сервера
    box.innerHTML = `<button class="btn gold" id="register">Подать заявку</button>
      ${t.is_registration_open ? '' : '<span style="color:#9fb0c8">Регистрация закрыта</span>'}`;
    box.querySelector('#register').addEventListener('click', () =>
      act(api(`/tournaments/${t.id}/registration`, { method: 'POST' }), 'Заявка подана', reload));
  }
}

function renderManage(box, t, reload) {
  const transitions = NEXT_STATUS[t.status] || [];
  box.innerHTML = `
    <div class="card manage">
      <h3>Управление турниром</h3>
      <div class="actions">
        <a class="btn secondary" href="#/tournaments/${t.id}/edit">Редактировать</a>
        ${transitions.map(([status, label]) => `<button class="${status === 'cancelled' ? 'danger' : ''}" data-status="${status}">${label}</button>`).join('')}
        ${t.status === 'ongoing' ? '<button id="new-round">Новый тур (жеребьёвка)</button>' : ''}
        <button class="danger" id="delete">Удалить</button>
      </div>
      <form id="poster-form" class="actions" style="margin-top:12px">
        <input type="file" name="poster" accept="image/*" style="max-width:280px">
        <button class="secondary" type="submit">Загрузить афишу</button>
      </form>
    </div>`;

  box.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.status === 'cancelled' && !confirm('Отменить турнир? Действие необратимо.')) return;
    act(api(`/tournaments/${t.id}/status`, { method: 'PATCH', body: { status: button.dataset.status } }), 'Статус изменён', reload);
  }));

  box.querySelector('#new-round')?.addEventListener('click', () =>
    act(api(`/tournaments/${t.id}/rounds`, { method: 'POST', body: { auto_pairing: true } }), 'Тур создан, пары составлены', reload));

  box.querySelector('#delete').addEventListener('click', async () => {
    if (!confirm(`Удалить турнир «${t.title}»?`)) return;
    try {
      await api(`/tournaments/${t.id}`, { method: 'DELETE' });
      flash('Турнир удалён');
      location.hash = '#/tournaments';
    } catch (error) {
      flash(error.message, 'error');
    }
  });

  box.querySelector('#poster-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const file = event.target.elements.poster.files[0];
    if (!file) return flash('Выберите файл изображения', 'error');
    const data = new FormData();
    data.append('poster', file);
    // Без Content-Type: application/json — браузер отправит multipart/form-data
    act(api(`/tournaments/${t.id}/poster`, { method: 'POST', formData: data }), 'Афиша загружена', reload);
  });
}

function renderStandings(box, rows) {
  if (!rows.length) {
    box.innerHTML = '<div class="card empty">Таблица появится, когда организатор допустит участников.</div>';
    return;
  }
  box.innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Место</th><th>Игрок</th><th>Рейтинг</th><th>Очки</th><th>Бухгольц</th><th>Партий</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr class="${r.place <= 3 ? `place-${r.place}` : ''}"><td>${r.place}</td><td>${esc(r.user.name)}</td><td>${r.rating_at_start}</td>
        <td class="points">${r.points}</td><td>${r.buchholz}</td><td>${r.games_played}</td></tr>`).join('')}
      </tbody>
    </table></div>`;
}

function renderRounds(box, t, rounds, canManage, reload) {
  if (!rounds.length) {
    box.innerHTML = '<div class="card empty">Туры ещё не начались. Пары появятся после жеребьёвки.</div>';
    return;
  }

  box.innerHTML = rounds.map((round) => `
    <div class="card round-card">
      <div class="round-head">
        <h3 style="margin:0">Тур ${round.number}</h3> ${badge(round.status, round.status_label)}
        <span class="muted">${formatDateTime(round.starts_at)}</span>
        ${canManage && round.status === 'ongoing' ? `<button class="secondary" data-complete="${round.id}">Завершить тур</button>` : ''}
      </div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Доска</th><th>Белые</th><th>Результат</th><th>Чёрные</th></tr></thead>
        <tbody>${round.games.map((g) => `
          <tr>
            <td>${g.board_number}</td>
            <td>${esc(g.white?.name ?? '')}</td>
            <td>${canManage && round.status === 'ongoing' && !g.is_bye
              ? `<select data-game="${g.id}">${RESULTS.map(([v, l]) => `<option value="${v}" ${v === g.result ? 'selected' : ''}>${l}</option>`).join('')}</select>`
              : `<span class="result">${esc(g.result_notation)}</span>`}</td>
            <td>${g.is_bye ? '<span class="muted">без пары (+1)</span>' : esc(g.black?.name ?? '')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`).join('');

  box.querySelectorAll('[data-game]').forEach((select) => select.addEventListener('change', () =>
    act(api(`/games/${select.dataset.game}`, { method: 'PATCH', body: { result: select.value } }), 'Результат сохранён', reload)));

  box.querySelectorAll('[data-complete]').forEach((button) => button.addEventListener('click', () =>
    act(api(`/rounds/${button.dataset.complete}/complete`, { method: 'POST' }), 'Тур завершён', reload)));
}

function renderParticipants(box, t, participants, canManage, reload) {
  if (!participants.length) {
    box.innerHTML = '<div class="card empty">Заявок пока нет — станьте первым участником.</div>';
    return;
  }

  const editable = canManage && ['draft', 'registration'].includes(t.status);
  box.innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>№</th><th>Игрок</th><th>Рейтинг</th><th>Статус</th>${editable ? '<th>Действия</th>' : ''}</tr></thead>
      <tbody>${participants.map((p) => `
        <tr>
          <td>${p.start_number ?? '—'}</td>
          <td>${esc(p.user.name)}</td>
          <td>${p.rating_at_start}</td>
          <td>${badge(p.status, p.status_label)}</td>
          ${editable ? `<td class="actions">
            ${p.status !== 'confirmed' ? `<button class="secondary" data-user="${p.user.id}" data-to="confirmed">Допустить</button>` : ''}
            ${p.status !== 'withdrawn' ? `<button class="secondary" data-user="${p.user.id}" data-to="withdrawn">Отклонить</button>` : ''}
          </td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table></div>`;

  box.querySelectorAll('[data-user]').forEach((button) => button.addEventListener('click', () =>
    act(api(`/tournaments/${t.id}/participants/${button.dataset.user}`, { method: 'PATCH', body: { status: button.dataset.to } }),
      'Статус заявки изменён', reload)));
}
