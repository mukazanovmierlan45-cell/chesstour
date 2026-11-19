import { api } from '../api.js';
import { getUser } from '../auth.js';
import { renderBoard } from '../board.js';
import { tournamentCard } from './tournaments.js';

export async function homePage(root) {
  const user = getUser();
  const primary = user
    ? '<a class="btn gold" href="#/tournaments?status=registration">Найти турнир</a>'
    : '<a class="btn gold" href="#/register">Создать аккаунт</a>';

  root.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <div>
          <h1>Гамбит<span class="line2">турниры шахматного клуба — от заявки до итоговой таблицы</span></h1>
          <p class="lead">Подавайте заявки на блиц, рапид и классику, смотрите пары каждого тура и следите за таблицей
            прямо во время турнира. Судьи проводят жеребьёвку и вносят результаты в пару кликов.</p>
          <div class="actions">
            ${primary}
            <a class="btn ghost" href="#/tournaments">Все турниры</a>
          </div>
          <p class="facts" id="facts"></p>
        </div>
        <div class="board-wrap">
          <div class="board" id="hero-board" role="img" aria-label="Шахматная доска: разыгрывается Итальянская партия"></div>
          <div class="board-caption"><span>Итальянская партия</span><span class="move" id="hero-move">Начальная позиция</span></div>
        </div>
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
      <div class="grid" id="open-list"><p class="muted">Загружаем турниры…</p></div>
    </section>

    <section class="section" id="live-section" hidden>
      <div class="section-head">
        <div>
          <h2>Играются сейчас</h2>
          <p>Пары текущего тура и таблица обновляются по мере внесения результатов</p>
        </div>
      </div>
      <div class="grid" id="live-list"></div>
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
          <a class="btn gold" href="#/register">Зарегистрироваться</a>
        </div>
        <div class="role">
          <span class="glyph" aria-hidden="true">♜</span>
          <h3>Организаторам</h3>
          <p>Положение о турнире, допуск участников, жеребьёвка туров, результаты и афиша.</p>
          <a href="#/login">Войти как организатор</a>
        </div>
        <div class="role">
          <span class="glyph" aria-hidden="true">♛</span>
          <h3>Руководителю клуба</h3>
          <p>Справочник контролей времени, роли пользователей и статистика по турнирам и игрокам.</p>
          <a href="#/login">Войти как администратор</a>
        </div>
      </div>
    </section>

    ${user ? '' : `
    <div class="cta-band">
      <div><h2>Следующий турнир уже скоро</h2><p>Создайте аккаунт за минуту и подайте заявку.</p></div>
      <a class="btn" href="#/register">Создать аккаунт</a>
    </div>`}`;

  renderBoard(root.querySelector('#hero-board'), { caption: root.querySelector('#hero-move') });

  const safe = (promise) => promise.catch(() => null);
  const [open, live] = await Promise.all([
    safe(api('/tournaments', { query: { status: 'registration', sort: 'start_date', order: 'asc', per_page: 3 } })),
    safe(api('/tournaments', { query: { status: 'ongoing', per_page: 3 } })),
  ]);

  const openList = root.querySelector('#open-list');
  if (!open) {
    openList.innerHTML = '<div class="card empty">Сервер API недоступен. Запустите его и обновите страницу.</div>';
    return;
  }
  openList.innerHTML = open.data.length
    ? open.data.map(tournamentCard).join('')
    : '<div class="card empty">Сейчас нет турниров с открытой регистрацией. Загляните позже.</div>';

  if (live && live.data.length) {
    root.querySelector('#live-section').hidden = false;
    root.querySelector('#live-list').innerHTML = live.data.map(tournamentCard).join('');
  }

  const openCount = open.meta.total;
  const liveCount = live ? live.meta.total : 0;
  const word = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  root.querySelector('#facts').innerHTML =
    `Сейчас играется <b>${liveCount}</b> ${word(liveCount, 'турнир', 'турнира', 'турниров')}, `
    + `регистрация открыта на <b>${openCount}</b> ${word(openCount, 'турнир', 'турнира', 'турниров')}.`;
}
