import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { parallax } from '../lib/board3d.js';
import { mountChess } from '../lib/play.js';
import { pieceSVG } from '../lib/pieces.js';
import { plural, shortDate } from '../lib/format.js';
import { Avatar, Empty, FloatingLayer, Pieces, Skeletons, TournamentCard } from '../components/ui.jsx';

const safe = (promise) => promise.catch(() => null);

const STEPS = [
  ['Заявка', 'Игрок подаёт заявку в один клик. Система сама проверяет срок приёма, свободные места и рейтинг.', 'p', 'light'],
  ['Допуск', 'Организатор подтверждает участников, а стартовые номера расставляются по рейтингу автоматически.', 'r', 'dark'],
  ['Жеребьёвка', 'Пары тура составляются по швейцарской или круговой системе — без повторных встреч.', 'n', 'light'],
  ['Результаты', 'Судья вносит исход партии, и он сразу виден всем участникам: 1-0, ½-½ или 0-1.', 'q', 'light wide'],
  ['Таблица', 'Очки и коэффициент Бухгольца пересчитываются после каждой партии — итог виден ещё до закрытия турнира.', 'k', 'dark wide'],
];

const HERO_PIECES = [
  ['q', 'b', { x: 9, y: 12, size: 150, rot: -18, depth: 34 }],
  ['n', 'w', { x: 76, y: 8, size: 165, rot: 16, depth: 40, delay: 0.15 }],
  ['p', 'w', { x: 24, y: 46, size: 78, rot: 24, depth: 14, blur: 1.5, delay: 0.3, mobile: false }],
  ['b', 'b', { x: 70, y: 52, size: 130, rot: -12, depth: 30, delay: 0.2, mobile: false }],
  ['p', 'w', { x: 63, y: 84, size: 70, rot: -30, depth: 10, blur: 2.5, delay: 0.4 }],
  ['r', 'w', { x: 88, y: 62, size: 88, rot: 22, depth: 18, blur: 1, delay: 0.35, mobile: false }],
  ['k', 'b', { x: 3, y: 60, size: 108, rot: 14, depth: 22, blur: 0.6, delay: 0.25, mobile: false }],
];

// Положения карточек игроков вокруг заголовка (в % от блока)
const CHIP_SPOTS = [[5, 8], [68, 4], [1, 42], [79, 30], [9, 80], [70, 76], [38, 0], [40, 92]];

function Hero({ user, facts }) {
  const ref = useRef(null);
  useEffect(() => { parallax(ref.current); }, []);
  return (
    <section className="hero" ref={ref}>
      <FloatingLayer items={HERO_PIECES} />
      <div className="hero-center">
        <h1 className="display" data-type="h"><span>Шахматные</span> <span>турниры</span></h1>
        <Link className="pill" to={user ? '/tournaments?status=registration' : '/register'}>{user ? 'Найти турнир' : 'Подать заявку'}</Link>
        <div className="display second" data-type="h">клуба</div>
        <p className="hero-sub" data-type="p">Заявки, жеребьёвка и турнирные таблицы — в одном месте. Вы играете, система считает.</p>
        <p className="hero-facts">{facts ?? ' '}</p>
      </div>
    </section>
  );
}

function Stage() {
  const ref = useRef(null);
  // доской управляет модуль play.js: показ партии и игра против компьютера
  useEffect(() => { mountChess(ref.current); }, []);
  return (
    <section className="stage" ref={ref}>
      <h2 className="display-2" data-type="h">Шестьдесят четыре клетки и одна честная таблица</h2>
      <p className="stage-lead" data-type="p">Нажмите на доску — и сыграйте партию с компьютером прямо здесь</p>
      <div className="b3d-scene" id="stage-board" role="application" aria-label="Шахматная доска: можно сыграть партию белыми против компьютера" />
      <div className="stage-caption">
        <p className="play-status" id="play-status" aria-live="polite" />
        <div className="actions center" id="play-controls" />
        <ol className="moves" id="moves" />
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="dark-sec">
      <div className="wrap">
        <h2 className="display-2 center" data-type="h">Как проходит турнир в «Гамбите»</h2>
        <div className="steps">
          {STEPS.map(([title, text, piece, cls], i) => (
            <article className={`step-card ${cls}`} key={title}>
              <div className="step-head"><span className="num-pill">0{i + 1}</span><h3 data-type="t">{title}</h3></div>
              <p data-type="t">{text}</p>
              <div className="step-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: pieceSVG(piece, cls.includes('dark') ? 'w' : 'b') }} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Players({ data }) {
  const ref = useRef(null);
  useEffect(() => { if (data) parallax(ref.current); }, [data]);
  if (!data) return null;
  const { games, leaders, tournament, people } = data;

  return (
    <section className="players">
      <div className="chips-stage" ref={ref}>
        <div className="chips-layer" aria-hidden="true">
          {people.slice(0, CHIP_SPOTS.length).map((p, i) => (
            <div className="chip-float" key={p.name} style={{ '--x': `${CHIP_SPOTS[i][0]}%`, top: `${CHIP_SPOTS[i][1]}%`, '--delay': `${(i * 0.37).toFixed(2)}s` }}>
              {p.star > 0 && <span className="stars">{'★'.repeat(p.star)}</span>}
              <Avatar name={p.name} /><span><b>{p.name}</b><small>{p.note}</small></span>
            </div>
          ))}
        </div>
        <div className="players-center">
          <h2 className="display-2" data-type="h">Соперники уже за досками</h2>
          <Link className="pill" to="/tournaments">Выбрать турнир</Link>
        </div>
        <FloatingLayer className="fp-pair" items={[['n', 'w', { x: 84, y: 30, size: 115, rot: -20, depth: 20 }], ['p', 'b', { x: 8, y: 70, size: 72, rot: 18, depth: 12, blur: 1 }]]} />
      </div>
      <div className="wrap club">
        <div className="card feed-card">
          <h3>Последние результаты</h3>
          <ul className="feed">
            {games.length ? games.slice(0, 5).map((g) => (
              <li key={`${g.tournament.id}-${g.id}`}>
                <div className="duel">
                  <span className={`side ${g.result === 'white_win' ? 'won' : ''}`}><Avatar name={g.white.name} /><span>{g.white.name}</span></span>
                  <span className="score">{g.result_notation}</span>
                  <span className={`side ${g.result === 'black_win' ? 'won' : ''}`}><Avatar name={g.black.name} /><span>{g.black.name}</span></span>
                </div>
                <Link className="feed-meta" to={`/tournaments/${g.tournament.id}`}>{g.tournament.title}, тур {g.round.number}, {shortDate(g.round.starts_at)}</Link>
              </li>
            )) : <li className="muted">Результатов пока нет — первый тур ещё впереди.</li>}
          </ul>
        </div>
        <div className="card leaders-card">
          <h3>Лидеры: <Link to={`/tournaments/${tournament.id}`}>{tournament.title}</Link></h3>
          <ol className="leaders">
            {leaders.length ? leaders.map((r) => (
              <li key={r.user.name} className={r.place === 1 ? 'top-1' : ''}>
                <span className="place">{r.place}</span>
                <Avatar name={r.user.name} />
                <span className="who-name">{r.user.name}<small>рейтинг {r.rating_at_start}</small></span>
                <span className="pts">{r.points}</span>
              </li>
            )) : <li className="muted">Таблица появится после допуска участников.</li>}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Split({ user }) {
  const rows = [
    ['Игрокам', 'Заявки, свои пары и история партий', user ? '/my' : '/register'],
    ['Организаторам', 'Положение, допуск, жеребьёвка, афиша', user ? '/tournaments/new' : '/login'],
    ['Руководителю клуба', 'Контроли времени, роли, статистика', user ? '/admin' : '/login'],
    ['Тренировка с роботом', 'Партия с ботом и разбор каждого хода', user ? '/training' : '/register'],
    ['ИИ-ассистент', 'Чат с Гамбит-ботом на Groq о шахматах и клубе', user ? '/assistant' : '/register'],
    ['Болельщикам', 'Итоговые таблицы завершённых турниров', '/tournaments?status=finished'],
  ];
  return (
    <section className="split">
      <div className="split-dark">
        <h2 className="display-2" data-type="h">Для каждого в клубе</h2>
        <ul className="role-rows">
          {rows.map(([title, text, to]) => (
            <li key={title}><Link to={to}><span><b>{title}</b><small data-type="t">{text}</small></span><i>+</i></Link></li>
          ))}
        </ul>
        <Pieces className="piece-row" list={['r', 'n', 'b', 'q', 'p']} color="w" />
      </div>
      <div className="split-light">
        <h2 className="display-2" data-type="h" key={user ? 'h-user' : 'h-guest'}>{user ? 'Готовы к следующему туру?' : 'Хотите сыграть в турнире?'}</h2>
        <p data-type="p" key={user ? 'p-user' : 'p-guest'}>{user ? 'Выберите турнир с открытой регистрацией — заявка подаётся в один клик.' : 'Создайте аккаунт игрока за минуту, выберите турнир и подайте заявку. Организатор увидит её сразу.'}</p>
        <div className="actions center">
          {user ? (
            <><Link className="pill" to="/tournaments?status=registration">Найти турнир</Link><Link className="pill ghost-dark" to="/my">Мои турниры</Link></>
          ) : (
            <><Link className="pill" to="/register">Создать аккаунт</Link><Link className="pill ghost-dark" to="/login">Войти</Link></>
          )}
        </div>
        <Pieces className="piece-row" list={['k', 'p', 'b', 'n', 'r']} color="b" />
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [lists, setLists] = useState(null); // { open, live } или { error }
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [open, live, finished] = await Promise.all([
        safe(api('/tournaments', { query: { status: 'registration', sort: 'start_date', order: 'asc', per_page: 3 } })),
        safe(api('/tournaments', { query: { status: 'ongoing', per_page: 3 } })),
        safe(api('/tournaments', { query: { status: 'finished', sort: 'start_date', order: 'desc', per_page: 2 } })),
      ]);
      if (cancelled) return;
      if (!open) { setLists({ error: true }); return; }
      setLists({ open, live });

      // «Жизнь клуба»: последние партии и лидеры текущего турнира
      const tournaments = [...(live?.data ?? []), ...(finished?.data ?? [])];
      if (!tournaments.length) return;
      const [roundsList, standings] = await Promise.all([
        Promise.all(tournaments.map((t) => safe(api(`/tournaments/${t.id}/rounds`)))),
        safe(api(`/tournaments/${tournaments[0].id}/standings`)),
      ]);
      const games = [];
      roundsList.forEach((res, k) => (res?.data ?? []).forEach((round) => round.games.forEach((g) => {
        if (!g.is_bye && g.result !== 'pending' && g.black) games.push({ ...g, tournament: tournaments[k], round });
      })));
      games.sort((a, b) => new Date(b.round.starts_at) - new Date(a.round.starts_at) || a.board_number - b.board_number);
      const leaders = (standings?.data ?? []).slice(0, 5);
      if (!games.length && !leaders.length) return;

      const people = new Map();
      leaders.forEach((r) => people.set(r.user.name, { name: r.user.name, note: `рейтинг ${r.rating_at_start}`, star: r.place <= 3 ? 4 - r.place : 0 }));
      games.forEach((g) => [g.white, g.black].forEach((p) => {
        if (!people.has(p.name)) people.set(p.name, { name: p.name, note: g.tournament.title, star: 0 });
      }));
      if (!cancelled) setPlayers({ games, leaders, tournament: tournaments[0], people: [...people.values()] });
    })();
    return () => { cancelled = true; };
  }, []);

  let facts = null;
  if (lists?.error) facts = 'Сервер API недоступен';
  else if (lists) {
    const liveCount = lists.live?.meta.total ?? 0, openCount = lists.open.meta.total;
    facts = <><b>{liveCount}</b> {plural(liveCount, 'турнир играется', 'турнира играются', 'турниров играются')} сейчас, <b>{openCount}</b> {plural(openCount, 'открыт', 'открыты', 'открыты')} для заявок</>;
  }

  return (
    <div className="page-full">
      <Hero user={user} facts={facts} />
      <Stage />
      <Steps />
      <section className="light-sec">
        <div className="wrap">
          <div className="section-head">
            <div><h2 className="display-2" data-type="h">Открыта регистрация</h2><p data-type="p">Ближайшие турниры, на которые ещё можно подать заявку</p></div>
            <Link className="pill ghost-dark" to="/tournaments?status=registration">Все турниры</Link>
          </div>
          <div className="grid">
            {!lists && <Skeletons />}
            {lists?.error && <Empty glyph="♚">Сервер API недоступен. Запустите ЗАПУСТИТЬ.bat и обновите страницу.</Empty>}
            {lists?.open && (lists.open.data.length
              ? lists.open.data.map((t) => <TournamentCard t={t} key={t.id} />)
              : <Empty>Сейчас нет турниров с открытой регистрацией. Загляните позже.</Empty>)}
          </div>
          {lists?.live?.data.length > 0 && (
            <>
              <div className="section-head" style={{ marginTop: 56 }}>
                <div><h2 className="display-2" data-type="h">Играются сейчас</h2><p data-type="p">Пары текущего тура и таблица обновляются по мере внесения результатов</p></div>
              </div>
              <div className="grid">{lists.live.data.map((t) => <TournamentCard t={t} key={t.id} />)}</div>
            </>
          )}
        </div>
      </section>
      <Players data={players} />
      <Split user={user} />
    </div>
  );
}
