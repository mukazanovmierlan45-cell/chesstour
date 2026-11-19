import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, formatDateTime } from '../lib/format.js';
import { pieceSVG } from '../lib/pieces.js';
import { Avatar, Badge, Empty, Loading, Person, useAction } from '../components/ui.jsx';

const NEXT_STATUS = {
  draft: [['registration', 'Открыть регистрацию'], ['cancelled', 'Отменить']],
  registration: [['ongoing', 'Начать турнир'], ['cancelled', 'Отменить']],
  ongoing: [['finished', 'Завершить турнир'], ['cancelled', 'Отменить']],
};
const RESULTS = [['pending', '*'], ['white_win', '1-0'], ['draw', '½-½'], ['black_win', '0-1']];

export default function TournamentPage() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const flash = useToast();
  const [state, setState] = useState(null);

  const load = useCallback(() => Promise.all([
    api(`/tournaments/${id}`), api(`/tournaments/${id}/participants`), api(`/tournaments/${id}/rounds`), api(`/tournaments/${id}/standings`),
  ]).then(([t, participants, rounds, standings]) => setState({
    t: t.data, participants: participants.data, rounds: rounds.data, standings: standings.data,
  })).catch((error) => setState({ error })), [id]);

  useEffect(() => { setState(null); load(); }, [load]);
  const act = useAction(flash, load);

  if (!state) return <div className="container"><Loading /></div>;
  if (state.error) return <div className="container"><Empty glyph="♚">{state.error.status === 404 ? 'Турнир не найден.' : state.error.message}</Empty></div>;

  const { t, participants, rounds, standings } = state;
  // интерфейс скрывает недоступные действия; сервер всё равно проверяет права (403)
  const canManage = !!user && (hasRole('admin') || (hasRole('organizer') && user.id === t.organizer_id));
  const myEntry = user ? participants.find((p) => p.user.id === user.id) : null;

  return (
    <div className="container">
      <p><Link to="/tournaments">Все турниры</Link></p>
      <section className="t-hero">
        <div>
          <div className="actions"><Badge value={t.status} label={t.status_label} /> <span className="chip">{t.format_label}</span></div>
          <h1 data-type="h" key={`h-${t.id}`}>{t.title}</h1>
          <p data-type="p" key={`p-${t.id}`}>{t.description || 'Организатор пока не добавил описание турнира.'}</p>
          <PlayerActions t={t} myEntry={myEntry} act={act} />
        </div>
        {t.poster_url
          ? <img className="poster" src={t.poster_url} alt="Афиша турнира" />
          : <div className="t-hero-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: pieceSVG('k', 'w') + pieceSVG('q', 'b') }} />}
      </section>

      <div className="t-facts">
        <div><span>Даты</span><b>{formatDate(t.start_date)} – {formatDate(t.end_date)}</b></div>
        <div><span>Место</span><b>{t.location}</b></div>
        <div><span>Контроль времени</span><b>{t.time_control?.name ?? '—'}</b></div>
        <div><span>Заявки до</span><b>{formatDateTime(t.registration_deadline)}</b></div>
        <div><span>Участники</span><b>{t.participants_count} из {t.max_participants}</b></div>
        <div><span>Туры</span><b>{t.rounds_created ?? 0} из {t.rounds_count}</b>
          <span className="dots" aria-hidden="true">{Array.from({ length: t.rounds_count }, (_, i) => <i key={i} className={i < (t.rounds_created ?? 0) ? 'on' : ''} />)}</span></div>
        <div><span>Допуск</span><b>{t.min_rating ? `рейтинг от ${t.min_rating}` : 'без ограничений'}</b></div>
        <div><span>Организатор</span><b>{t.organizer?.name ?? '—'}</b></div>
      </div>

      {t.status === 'finished' && standings.length >= 3 && <Podium rows={standings} />}
      {canManage && <ManagePanel t={t} act={act} flash={flash} />}

      <h2>Турнирная таблица</h2>
      <Standings rows={standings} />
      <h2>Туры и партии</h2>
      <Rounds rounds={rounds} canManage={canManage} act={act} />
      <h2>Участники</h2>
      <Participants t={t} participants={participants} canManage={canManage} act={act} />
    </div>
  );
}

function PlayerActions({ t, myEntry, act }) {
  const { user, hasRole } = useAuth();
  if (!user) return t.is_registration_open ? <div className="actions" style={{ marginTop: 20 }}><Link className="btn gold" to="/login">Войти и подать заявку</Link></div> : null;
  if (!hasRole('player')) return null;

  if (myEntry && myEntry.status !== 'withdrawn') {
    return (
      <div className="actions" style={{ marginTop: 20 }}>
        <span style={{ color: '#c7d2e3' }}>Ваша заявка:</span> <Badge value={myEntry.status} label={myEntry.status_label} />
        {t.status === 'registration' && (
          <button className="btn ghost" onClick={() => confirm('Отозвать заявку на турнир?')
            && act(api(`/tournaments/${t.id}/registration`, { method: 'DELETE' }), 'Заявка отозвана')}>Отозвать заявку</button>
        )}
      </div>
    );
  }
  // кнопка видна и при закрытой регистрации — чтобы показать ответ 409 от сервера
  return (
    <div className="actions" style={{ marginTop: 20 }}>
      <button className="btn gold" onClick={() => act(api(`/tournaments/${t.id}/registration`, { method: 'POST' }), 'Заявка подана')}>Подать заявку</button>
      {!t.is_registration_open && <span style={{ color: '#9fb0c8' }}>Регистрация закрыта</span>}
    </div>
  );
}

function ManagePanel({ t, act, flash }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const transitions = NEXT_STATUS[t.status] || [];

  const remove = async () => {
    if (!confirm(`Удалить турнир «${t.title}»?`)) return;
    try {
      await api(`/tournaments/${t.id}`, { method: 'DELETE' });
      flash('Турнир удалён');
      navigate('/tournaments');
    } catch (error) {
      flash(error.message, 'error');
    }
  };
  const upload = (event) => {
    event.preventDefault();
    if (!file) { flash('Выберите файл изображения', 'error'); return; }
    const data = new FormData();
    data.append('poster', file);
    // без Content-Type: application/json — браузер отправит multipart/form-data
    act(api(`/tournaments/${t.id}/poster`, { method: 'POST', formData: data }), 'Афиша загружена');
  };

  return (
    <div className="card manage">
      <h3>Управление турниром</h3>
      <div className="actions">
        <Link className="btn secondary" to={`/tournaments/${t.id}/edit`}>Редактировать</Link>
        {transitions.map(([status, label]) => (
          <button key={status} className={status === 'cancelled' ? 'danger' : ''} onClick={() => {
            if (status === 'cancelled' && !confirm('Отменить турнир? Действие необратимо.')) return;
            act(api(`/tournaments/${t.id}/status`, { method: 'PATCH', body: { status } }), 'Статус изменён');
          }}>{label}</button>
        ))}
        {t.status === 'ongoing' && (
          <button onClick={() => act(api(`/tournaments/${t.id}/rounds`, { method: 'POST', body: { auto_pairing: true } }), 'Тур создан, пары составлены')}>Новый тур (жеребьёвка)</button>
        )}
        <button className="danger" onClick={remove}>Удалить</button>
      </div>
      <form className="actions" style={{ marginTop: 12 }} onSubmit={upload}>
        <input type="file" accept="image/*" style={{ maxWidth: 280 }} onChange={(e) => setFile(e.target.files[0] ?? null)} />
        <button className="secondary" type="submit">Загрузить афишу</button>
      </form>
    </div>
  );
}

function Podium({ rows }) {
  const [first, second, third] = rows;
  const step = (r, cls) => (
    <div className={`step ${cls}`}>
      <Avatar name={r.user.name} size="lg" />
      <b>{r.user.name}</b>
      <span>{r.points} очк.</span>
      <div className="block">{r.place}</div>
    </div>
  );
  return <section className="podium" aria-label="Призёры турнира">{step(second, 'p2')}{step(first, 'p1')}{step(third, 'p3')}</section>;
}

function Standings({ rows }) {
  if (!rows.length) return <div className="card empty">Таблица появится, когда организатор допустит участников.</div>;
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Место</th><th>Игрок</th><th>Рейтинг</th><th>Очки</th><th>Бухгольц</th><th>Партий</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.user.name} className={r.place <= 3 ? `place-${r.place}` : ''}>
          <td>{r.place}</td><td><Person name={r.user.name} /></td><td>{r.rating_at_start}</td>
          <td className="points">{r.points}</td><td>{r.buchholz}</td><td>{r.games_played}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

function Rounds({ rounds, canManage, act }) {
  if (!rounds.length) return <div className="card empty">Туры ещё не начались. Пары появятся после жеребьёвки.</div>;
  return rounds.map((round) => (
    <div className="card round-card" key={round.id}>
      <div className="round-head">
        <h3 style={{ margin: 0 }}>Тур {round.number}</h3> <Badge value={round.status} label={round.status_label} />
        <span className="muted">{formatDateTime(round.starts_at)}</span>
        {canManage && round.status === 'ongoing' && (
          <button className="secondary" onClick={() => act(api(`/rounds/${round.id}/complete`, { method: 'POST' }), 'Тур завершён')}>Завершить тур</button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}><table>
        <thead><tr><th>Доска</th><th>Белые</th><th>Результат</th><th>Чёрные</th></tr></thead>
        <tbody>{round.games.map((g) => (
          <tr key={g.id}>
            <td>{g.board_number}</td>
            <td>{g.white && <Person name={g.white.name} />}</td>
            <td>{canManage && round.status === 'ongoing' && !g.is_bye ? (
              <select value={g.result} aria-label={`Результат партии на доске ${g.board_number}`}
                onChange={(e) => act(api(`/games/${g.id}`, { method: 'PATCH', body: { result: e.target.value } }), 'Результат сохранён')}>
                {RESULTS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}
              </select>
            ) : <span className="result">{g.result_notation}</span>}</td>
            <td>{g.is_bye ? <span className="muted">без пары (+1)</span> : g.black && <Person name={g.black.name} />}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  ));
}

function Participants({ t, participants, canManage, act }) {
  if (!participants.length) return <div className="card empty">Заявок пока нет — станьте первым участником.</div>;
  const editable = canManage && ['draft', 'registration'].includes(t.status);
  const setStatus = (p, status) => act(api(`/tournaments/${t.id}/participants/${p.user.id}`, { method: 'PATCH', body: { status } }), 'Статус заявки изменён');
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>№</th><th>Игрок</th><th>Рейтинг</th><th>Статус</th>{editable && <th>Действия</th>}</tr></thead>
      <tbody>{participants.map((p) => (
        <tr key={p.user.id}>
          <td>{p.start_number ?? '—'}</td>
          <td><Person name={p.user.name} /></td>
          <td>{p.rating_at_start}</td>
          <td><Badge value={p.status} label={p.status_label} /></td>
          {editable && (
            <td className="actions">
              {p.status !== 'confirmed' && <button className="secondary" onClick={() => setStatus(p, 'confirmed')}>Допустить</button>}
              {p.status !== 'withdrawn' && <button className="secondary" onClick={() => setStatus(p, 'withdrawn')}>Отклонить</button>}
            </td>
          )}
        </tr>
      ))}</tbody>
    </table></div>
  );
}
