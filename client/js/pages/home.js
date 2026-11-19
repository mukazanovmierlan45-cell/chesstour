import { api } from '../api.js';
import { getUser } from '../auth.js';
import { renderBoard, MOVES } from '../board.js';
import { avatar, esc, plural, shortDate } from '../ui.js';
import { tournamentCard } from './tournaments.js';

const safe = (promise) => promise.catch(() => null);

export async function homePage(root) {
  const user = getUser();
  const primary = user
    ? '<a class="btn gold" href="#/tournaments?status=registration">Найти турнир</a>'
    : '<a class="btn gold" href="#/register">Создать аккаунт</a>';

  root.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <h1>Гамбит<span class="line2">турниры шахматного клуба — от заявки до итоговой таблицы</span></h1>
          <p class="lead">Подавайте заявки на блиц, рапид и классику, смотрите пары каждого тура и следите за таблицей
            прямо во время турнира. Судьи проводят жеребьёвку и вносят результаты в пару кликов.</p>
          <div class="actions">
            ${primary}
            <a class="btn ghost" href="#/tournaments">Все турниры</a>
          </div>
          <p class="facts" id="facts"></p>
        </div>
        <figure class="broadcast">
          <figcaption class="broadcast-head"><span>Дебют дня</span><b>Итальянская партия</b></figcaption>
          <div class="board" id="hero-board" role="img" aria-label="Шахматная доска: разыгрывается Итальянская партия"></div>
          <ol class="moves" id="hero-moves">
            ${MOVES.reduce((html, [, , san], i) => html
              + (i % 2 === 0 ? `<li><span class="mn">${i / 2 + 1}.</span>` : '')
              + `<span class="mv" data-i="${i}">${san}</span>`
              + (i % 2 === 1 ? '</li>' : ''), '')}
          </ol>
        </figure>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Открыта регистрация</h2>
          <p>Ближайшие турниры, на которые ещё можно подать заявку</p>
        </div>
        <a class="btn secondary" href="#/tournaments?status=registration">Смотреть все</a>
      </div>
      <div class="grid" id="open-list">${'<div class="t-card skeleton"></div>'.repeat(3)}</div>
    </section>

    <section class="section" id="club-life" hidden>
      <div class="section-head"><div><h2>Жизнь клуба</h2><p>Последние сыгранные партии и лидеры текущих турниров</p></div></div>
      <div class="club">
        <div class="card feed-card"><h3>Последние результаты</h3><ul class="feed" id="feed"></ul></div>
        <div class="card leaders-card"><h3 id="leaders-title">Лидеры</h3><ol class="leaders" id="leaders"></ol></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Как проходит турнир</h2><p>Весь путь хранится в одной системе — ничего не теряется в переписках</p></div></div>
      <ol class="flow">
        <li><div class="num">1</div><h3>Заявка</h3><p>Игрок подаёт заявку, система сама проверяет срок, свободные места и рейтинг.</p></li>
        <li><div class="num">2</div><h3>Допуск</h3><p>Организатор подтверждает участников, стартовые номера расставляются по рейтингу.</p></li>
        <li><div class="num">3</div><h3>Жеребьёвка</h3><p>Пары тура составляются автоматически по швейцарской или круговой системе.</p></li>
        <li><div class="num">4</div><h3>Таблица</h3><p>Результаты партий сразу попадают в таблицу с очками и коэффициентом Бухгольца.</p></li>
      </ol>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Для каждого в клубе</h2></div></div>
      <div class="roles">
        <div class="role main">
          <span class="glyph" aria-hidden="true">♞</span>
          <h3>Игрокам</h3>
          <p>Заявки в один клик, статус допуска, свои пары и история партий во всех турнирах клуба.</p>
          <a class="btn gold" href="${user ? '#/my' : '#/register'}">${user ? 'Мои турниры' : 'Зарегистрироваться'}</a>
        </div>
        <div class="role">
          <span class="glyph" aria-hidden="true">♜</span>
          <h3>Организаторам</h3>
          <p>Положение о турнире, допуск участников, жеребьёвка туров, результаты и афиша.</p>
          <a href="${user ? '#/tournaments/new' : '#/login'}">${user ? 'Создать турнир' : 'Войти как организатор'}</a>
        </div>
        <div class="role">
          <span class="glyph" aria-hidden="true">♛</span>
          <h3>Руководителю клуба</h3>
          <p>Справочник контролей времени, роли пользователей и статистика по турнирам и игрокам.</p>
          <a href="${user ? '#/admin' : '#/login'}">${user ? 'Администрирование' : 'Войти как администратор'}</a>
        </div>
      </div>
    </section>

    ${user ? '' : `
    <div class="cta-band">
      <div><h2>Следующий турнир уже скоро</h2><p>Создайте аккаунт за минуту и подайте заявку.</p></div>
      <a class="btn" href="#/register">Создать аккаунт</a>
    </div>`}`;

  const moves = root.querySelectorAll('#hero-moves .mv');
  renderBoard(root.querySelector('#hero-board'), {
    coords: true,
    onMove: (i) => moves.forEach((m, k) => {
      m.classList.toggle('played', k <= i);
      m.classList.toggle('current', k === i);
    }),
  });

  const [open, live, finished] = await Promise.all([
    safe(api('/tournaments', { query: { status: 'registration', sort: 'start_date', order: 'asc', per_page: 3 } })),
    safe(api('/tournaments', { query: { status: 'ongoing', per_page: 3 } })),
    safe(api('/tournaments', { query: { status: 'finished', sort: 'start_date', order: 'desc', per_page: 2 } })),
  ]);

  const openList = root.querySelector('#open-list');
  if (!open) {
    openList.innerHTML = '<div class="card empty"><span class="empty-glyph">♚</span>Сервер API недоступен. Запустите ЗАПУСТИТЬ.bat и обновите страницу.</div>';
    return;
  }
  openList.innerHTML = open.data.length
    ? open.data.map(tournamentCard).join('')
    : '<div class="card empty"><span class="empty-glyph">♘</span>Сейчас нет турниров с открытой регистрацией. Загляните позже.</div>';

  const liveCount = live ? live.meta.total : 0;
  root.querySelector('#facts').innerHTML =
    `Сейчас играется <b>${liveCount}</b> ${plural(liveCount, 'турнир', 'турнира', 'турниров')}, `
    + `регистрация открыта на <b>${open.meta.total}</b> ${plural(open.meta.total, 'турнир', 'турнира', 'турниров')}.`;

  renderClubLife(root, [...(live?.data ?? []), ...(finished?.data ?? [])]);
}

async function renderClubLife(root, tournaments) {
  if (!tournaments.length) return;

  const [roundsList, standings] = await Promise.all([
    Promise.all(tournaments.map((t) => safe(api(`/tournaments/${t.id}/rounds`)))),
    safe(api(`/tournaments/${tournaments[0].id}/standings`)),
  ]);

  const games = [];
  roundsList.forEach((res, k) => (res?.data ?? []).forEach((round) => round.games.forEach((g) => {
    if (g.is_bye || g.result === 'pending' || !g.black) return;
    games.push({ ...g, tournament: tournaments[k], round });
  })));
  games.sort((a, b) => new Date(b.round.starts_at) - new Date(a.round.starts_at) || a.board_number - b.board_number);

  const leaders = (standings?.data ?? []).slice(0, 5);
  if (!games.length && !leaders.length) return;
  root.querySelector('#club-life').hidden = false;

  const side = (player, won) => `<span class="side ${won ? 'won' : ''}">${avatar(player.name)}<span>${esc(player.name)}</span></span>`;
  root.querySelector('#feed').innerHTML = games.length
    ? games.slice(0, 6).map((g) => `
      <li>
        <div class="duel">
          ${side(g.white, g.result === 'white_win')}
          <span class="score">${esc(g.result_notation)}</span>
          ${side(g.black, g.result === 'black_win')}
        </div>
        <a class="feed-meta" href="#/tournaments/${g.tournament.id}">${esc(g.tournament.title)}, тур ${g.round.number}, ${shortDate(g.round.starts_at)}</a>
      </li>`).join('')
    : '<li class="muted">Результатов пока нет — первый тур ещё впереди.</li>';

  root.querySelector('#leaders-title').innerHTML =
    `Лидеры: <a href="#/tournaments/${tournaments[0].id}">${esc(tournaments[0].title)}</a>`;
  root.querySelector('#leaders').innerHTML = leaders.length
    ? leaders.map((r) => `
      <li class="${r.place <= 3 ? `top top-${r.place}` : ''}">
        <span class="place">${r.place}</span>
        ${avatar(r.user.name)}
        <span class="who-name">${esc(r.user.name)}<small>рейтинг ${r.rating_at_start}</small></span>
        <span class="pts">${r.points}</span>
      </li>`).join('')
    : '<li class="muted">Таблица появится после допуска участников.</li>';
}
