import { api } from '../api.js';
import { getUser } from '../auth.js';
import { floating, parallax } from '../board3d.js';
import { mountChess } from '../play.js';
import { pieceSVG } from '../pieces.js';
import { avatar, esc, plural, shortDate } from '../ui.js';
import { tournamentCard } from './tournaments.js';

const safe = (promise) => promise.catch(() => null);

const STEPS = [
  ['Заявка', 'Игрок подаёт заявку в один клик. Система сама проверяет срок приёма, свободные места и рейтинг.', 'p', 'light'],
  ['Допуск', 'Организатор подтверждает участников, а стартовые номера расставляются по рейтингу автоматически.', 'r', 'dark'],
  ['Жеребьёвка', 'Пары тура составляются по швейцарской или круговой системе — без повторных встреч.', 'n', 'light'],
  ['Результаты', 'Судья вносит исход партии, и он сразу виден всем участникам: 1-0, ½-½ или 0-1.', 'q', 'light wide'],
  ['Таблица', 'Очки и коэффициент Бухгольца пересчитываются после каждой партии — итог виден ещё до закрытия турнира.', 'k', 'dark wide'],
];

// Положения карточек игроков вокруг заголовка (в % от блока)
const CHIP_SPOTS = [[5, 8], [68, 4], [1, 42], [79, 30], [9, 80], [70, 76], [38, 0], [40, 92]];

export async function homePage(root) {
  const user = getUser();
  const cta = user
    ? '<a class="pill" href="#/tournaments?status=registration">Найти турнир</a>'
    : '<a class="pill" href="#/register">Подать заявку</a>';

  root.innerHTML = `
    <section class="hero" id="hero">
      <div class="fp-layer" aria-hidden="true">
        ${floating('q', 'b', { x: 9, y: 12, size: 120, rot: -18, depth: 34, delay: 0 })}
        ${floating('n', 'w', { x: 76, y: 8, size: 132, rot: 16, depth: 40, delay: 0.15 })}
        ${floating('p', 'w', { x: 24, y: 46, size: 62, rot: 24, depth: 14, blur: 1.5, delay: 0.3, mobile: false })}
        ${floating('b', 'b', { x: 70, y: 52, size: 104, rot: -12, depth: 30, delay: 0.2, mobile: false })}
        ${floating('p', 'w', { x: 54, y: 74, size: 56, rot: -30, depth: 10, blur: 2.5, delay: 0.4 })}
        ${floating('r', 'w', { x: 88, y: 62, size: 70, rot: 22, depth: 18, blur: 1, delay: 0.35, mobile: false })}
        ${floating('k', 'b', { x: 3, y: 60, size: 86, rot: 14, depth: 22, blur: .6, delay: 0.25, mobile: false })}
      </div>
      <div class="hero-center">
        <h1 class="display"><span>Шахматные</span> <span>турниры</span></h1>
        ${cta}
        <div class="display second">клуба</div>
        <p class="hero-sub">Заявки, жеребьёвка и турнирные таблицы — в одном месте. Вы играете, система считает.</p>
        <p class="hero-facts" id="facts">&nbsp;</p>
      </div>
    </section>

    <section class="stage">
      <h2 class="display-2">Шестьдесят четыре клетки и&nbsp;одна честная таблица</h2>
      <p class="stage-lead">Нажмите на доску — и сыграйте партию с компьютером прямо здесь</p>
      <div class="b3d-scene" id="stage-board" role="application" aria-label="Шахматная доска: можно сыграть партию белыми против компьютера"></div>
      <div class="stage-caption">
        <p class="play-status" id="play-status" aria-live="polite"></p>
        <div class="actions center" id="play-controls"></div>
        <ol class="moves" id="moves"></ol>
      </div>
    </section>

    <section class="dark-sec">
      <div class="wrap">
        <h2 class="display-2 center">Как проходит турнир в&nbsp;«Гамбите»</h2>
        <div class="steps">
          ${STEPS.map(([title, text, piece, cls], i) => `
            <article class="step-card ${cls}">
              <div class="step-head"><span class="num-pill">0${i + 1}</span><h3>${title}</h3></div>
              <p>${text}</p>
              <div class="step-art">${pieceSVG(piece, cls.includes('dark') ? 'w' : 'b')}</div>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="light-sec">
      <div class="wrap">
        <div class="section-head">
          <div><h2 class="display-2">Открыта регистрация</h2><p>Ближайшие турниры, на которые ещё можно подать заявку</p></div>
          <a class="pill ghost-dark" href="#/tournaments?status=registration">Все турниры</a>
        </div>
        <div class="grid" id="open-list">${'<div class="t-card skeleton"></div>'.repeat(3)}</div>
        <div id="live-block" hidden>
          <div class="section-head" style="margin-top:56px"><div><h2 class="display-2">Играются сейчас</h2><p>Пары текущего тура и таблица обновляются по мере внесения результатов</p></div></div>
          <div class="grid" id="live-list"></div>
        </div>
      </div>
    </section>

    <section class="players" id="players" hidden>
      <div class="chips-stage" id="chips-stage">
        <div class="chips-layer" id="chips" aria-hidden="true"></div>
        <div class="players-center">
          <h2 class="display-2">Соперники уже за&nbsp;досками</h2>
          <a class="pill" href="#/tournaments">Выбрать турнир</a>
        </div>
        ${floating('n', 'w', { x: 84, y: 30, size: 92, rot: -20, depth: 20 })}
        ${floating('p', 'b', { x: 8, y: 70, size: 58, rot: 18, depth: 12, blur: 1 })}
      </div>
      <div class="wrap club">
        <div class="card feed-card"><h3>Последние результаты</h3><ul class="feed" id="feed"></ul></div>
        <div class="card leaders-card"><h3 id="leaders-title">Лидеры</h3><ol class="leaders" id="leaders"></ol></div>
      </div>
    </section>

    <section class="split">
      <div class="split-dark">
        <h2 class="display-2">Для каждого в&nbsp;клубе</h2>
        <ul class="role-rows">
          <li><a href="${user ? '#/my' : '#/register'}"><span><b>Игрокам</b><small>Заявки, свои пары и история партий</small></span><i>+</i></a></li>
          <li><a href="${user ? '#/tournaments/new' : '#/login'}"><span><b>Организаторам</b><small>Положение, допуск, жеребьёвка, афиша</small></span><i>+</i></a></li>
          <li><a href="${user ? '#/admin' : '#/login'}"><span><b>Руководителю клуба</b><small>Контроли времени, роли, статистика</small></span><i>+</i></a></li>
          <li><a href="${user ? '#/training' : '#/register'}"><span><b>Тренировка с роботом</b><small>Партия с ботом и разбор каждого хода</small></span><i>+</i></a></li>
          <li><a href="#/tournaments?status=finished"><span><b>Болельщикам</b><small>Итоговые таблицы завершённых турниров</small></span><i>+</i></a></li>
        </ul>
        <div class="piece-row">${['r', 'n', 'b', 'q', 'p'].map((t) => pieceSVG(t, 'w')).join('')}</div>
      </div>
      <div class="split-light">
        <h2 class="display-2">${user ? 'Готовы к&nbsp;следующему туру?' : 'Хотите сыграть в&nbsp;турнире?'}</h2>
        <p>${user ? 'Выберите турнир с открытой регистрацией — заявка подаётся в один клик.' : 'Создайте аккаунт игрока за минуту, выберите турнир и подайте заявку. Организатор увидит её сразу.'}</p>
        <div class="actions center">
          ${user
            ? '<a class="pill" href="#/tournaments?status=registration">Найти турнир</a><a class="pill ghost-dark" href="#/my">Мои турниры</a>'
            : '<a class="pill" href="#/register">Создать аккаунт</a><a class="pill ghost-dark" href="#/login">Войти</a>'}
        </div>
        <div class="piece-row">${['k', 'p', 'b', 'n', 'r'].map((t) => pieceSVG(t, 'b')).join('')}</div>
      </div>
    </section>`;

  parallax(root.querySelector('#hero'));
  mountChess(root);

  const [open, live, finished] = await Promise.all([
    safe(api('/tournaments', { query: { status: 'registration', sort: 'start_date', order: 'asc', per_page: 3 } })),
    safe(api('/tournaments', { query: { status: 'ongoing', per_page: 3 } })),
    safe(api('/tournaments', { query: { status: 'finished', sort: 'start_date', order: 'desc', per_page: 2 } })),
  ]);

  const openList = root.querySelector('#open-list');
  if (!open) {
    openList.innerHTML = '<div class="card empty"><span class="empty-glyph">♚</span>Сервер API недоступен. Запустите ЗАПУСТИТЬ.bat и обновите страницу.</div>';
    root.querySelector('#facts').textContent = 'Сервер API недоступен';
    return;
  }
  openList.innerHTML = open.data.length
    ? open.data.map(tournamentCard).join('')
    : '<div class="card empty"><span class="empty-glyph">♘</span>Сейчас нет турниров с открытой регистрацией. Загляните позже.</div>';

  if (live?.data.length) {
    root.querySelector('#live-block').hidden = false;
    root.querySelector('#live-list').innerHTML = live.data.map(tournamentCard).join('');
  }

  const liveCount = live ? live.meta.total : 0;
  root.querySelector('#facts').innerHTML =
    `<b>${liveCount}</b> ${plural(liveCount, 'турнир играется', 'турнира играются', 'турниров играются')} сейчас, `
    + `<b>${open.meta.total}</b> ${plural(open.meta.total, 'открыт', 'открыты', 'открыты')} для заявок`;

  renderPlayers(root, [...(live?.data ?? []), ...(finished?.data ?? [])]);
}

async function renderPlayers(root, tournaments) {
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
  root.querySelector('#players').hidden = false;

  // Карточки игроков вокруг заголовка: лидеры с рейтингом, затем соперники из ленты
  const people = new Map();
  leaders.forEach((r) => people.set(r.user.name, { name: r.user.name, note: `рейтинг ${r.rating_at_start}`, star: r.place <= 3 ? 4 - r.place : 0 }));
  games.forEach((g) => [g.white, g.black].forEach((p) => {
    if (!people.has(p.name)) people.set(p.name, { name: p.name, note: g.tournament.title, star: 0 });
  }));
  root.querySelector('#chips').innerHTML = [...people.values()].slice(0, CHIP_SPOTS.length).map((p, i) => `
    <div class="chip-float" style="--x:${CHIP_SPOTS[i][0]}%;top:${CHIP_SPOTS[i][1]}%;--delay:${(i * 0.37).toFixed(2)}s">
      ${p.star ? `<span class="stars">${'★'.repeat(p.star)}</span>` : ''}
      ${avatar(p.name)}<span><b>${esc(p.name)}</b><small>${esc(p.note)}</small></span>
    </div>`).join('');
  parallax(root.querySelector('#chips-stage'));

  const side = (player, won) => `<span class="side ${won ? 'won' : ''}">${avatar(player.name)}<span>${esc(player.name)}</span></span>`;
  root.querySelector('#feed').innerHTML = games.length
    ? games.slice(0, 5).map((g) => `
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
      <li class="${r.place === 1 ? 'top-1' : ''}">
        <span class="place">${r.place}</span>
        ${avatar(r.user.name)}
        <span class="who-name">${esc(r.user.name)}<small>рейтинг ${r.rating_at_start}</small></span>
        <span class="pts">${r.points}</span>
      </li>`).join('')
    : '<li class="muted">Таблица появится после допуска участников.</li>';
}
