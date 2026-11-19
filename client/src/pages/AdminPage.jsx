import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Empty, FieldError, Loading, useAction } from '../components/ui.jsx';
import { LABELS } from '../lib/format.js';

const ROLES = { player: 'Игрок', organizer: 'Организатор', admin: 'Администратор' };
const TYPES = { classical: 'Классика', rapid: 'Рапид', blitz: 'Блиц', bullet: 'Пуля' };
const EMPTY_TC = { name: '', type: 'rapid', base_minutes: '', increment_seconds: 0 };

export default function AdminPage() {
  const { user: me } = useAuth();
  const flash = useToast();
  const [data, setData] = useState(null);
  const [tc, setTc] = useState(EMPTY_TC);
  const [errors, setErrors] = useState({});

  const load = useCallback(() => Promise.all([
    api('/stats/overview'), api('/time-controls'), api('/users', { query: { per_page: 50 } }),
  ]).then(([s, t, u]) => setData({ stats: s.data, timeControls: t.data, users: u.data }))
    .catch((error) => setData({ error: error.message })), []);
  useEffect(() => { load(); }, [load]);
  const act = useAction(flash, load);

  const addTimeControl = async (event) => {
    event.preventDefault();
    const found = {};
    if (!tc.name.trim()) found.name = 'Обязательное поле';
    if (!(Number(tc.base_minutes) > 0)) found.base_minutes = 'Укажите минуты (больше 0)';
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await api('/time-controls', { method: 'POST', body: { ...tc, base_minutes: Number(tc.base_minutes), increment_seconds: Number(tc.increment_seconds || 0) } });
      flash('Контроль времени добавлен');
      setTc(EMPTY_TC);
      load();
    } catch (error) {
      if (error.status === 422) setErrors(error.errors);
      else flash(error.message, 'error');
    }
  };
  const set = (e) => setTc({ ...tc, [e.target.name]: e.target.value });

  if (!data) return <div className="container"><Loading /></div>;
  if (data.error) return <div className="container"><Empty glyph="♚">{data.error}</Empty></div>;
  const { stats, timeControls, users } = data;

  return (
    <div className="container">
      <div className="page-head"><div><h1 data-type="h">Администрирование</h1><p data-type="p">Статистика клуба, контроли времени и роли пользователей</p></div></div>
      <div className="grid">
        <div className="card"><h2 style={{ marginTop: 0 }}>Турниры: {stats.tournaments.total}</h2>
          {Object.entries(stats.tournaments.by_status).map(([k, v]) => <div key={k}>{LABELS.tournament[k] ?? k}: <b>{v}</b></div>)}</div>
        <div className="card"><h2 style={{ marginTop: 0 }}>Партии: {stats.games.total}</h2>
          {Object.entries(stats.games.by_result).map(([k, v]) => <div key={k}>{LABELS.result[k] ?? k}: <b>{v}</b></div>)}</div>
        <div className="card"><h2 style={{ marginTop: 0 }}>Самые активные игроки</h2>
          {stats.most_active_players.length ? stats.most_active_players.map((p) => <div key={p.name}>{p.name} — {p.games_played} партий</div>) : <span className="muted">нет данных</span>}</div>
      </div>

      <h2>Контроли времени</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Название</th><th>Вид</th><th>Время</th><th>Турниров</th><th /></tr></thead>
        <tbody>{timeControls.map((t) => (
          <tr key={t.id}>
            <td>{t.name}</td><td>{t.type_label}</td><td>{t.short}</td><td>{t.tournaments_count ?? 0}</td>
            <td><button className="danger" onClick={() => confirm('Удалить контроль времени?') && act(api(`/time-controls/${t.id}`, { method: 'DELETE' }), 'Удалено')}>Удалить</button></td>
          </tr>
        ))}</tbody>
      </table></div>
      <form className="card" noValidate style={{ marginTop: 12 }} onSubmit={addTimeControl}>
        <div className="inline">
          <div className="row"><label htmlFor="tc-name">Название</label><input id="tc-name" name="name" value={tc.name} onChange={set} placeholder="Рапид 25+10" className={errors.name ? 'invalid' : ''} /><FieldError errors={errors} name="name" /></div>
          <div className="row"><label htmlFor="tc-type">Вид</label><select id="tc-type" name="type" value={tc.type} onChange={set}>{Object.entries(TYPES).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select><FieldError errors={errors} name="type" /></div>
          <div className="row"><label htmlFor="tc-min">Минут</label><input id="tc-min" type="number" name="base_minutes" min="1" value={tc.base_minutes} onChange={set} className={errors.base_minutes ? 'invalid' : ''} /><FieldError errors={errors} name="base_minutes" /></div>
          <div className="row"><label htmlFor="tc-inc">Добавление, с</label><input id="tc-inc" type="number" name="increment_seconds" min="0" value={tc.increment_seconds} onChange={set} /><FieldError errors={errors} name="increment_seconds" /></div>
        </div>
        <button type="submit">Добавить контроль</button>
      </form>

      <h2>Пользователи</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Имя</th><th>Email</th><th>Рейтинг</th><th>Роль</th><th /></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}>
            <td>{u.name}</td><td>{u.email ?? ''}</td><td>{u.rating}</td>
            <td><select value={u.role} disabled={u.id === me.id} aria-label={`Роль: ${u.name}`}
              onChange={(e) => act(api(`/users/${u.id}`, { method: 'PATCH', body: { role: e.target.value } }), 'Роль изменена')}>
              {Object.entries(ROLES).map(([v, l]) => <option value={v} key={v}>{l}</option>)}
            </select></td>
            <td>{u.id !== me.id && <button className="danger" onClick={() => confirm('Удалить пользователя?') && act(api(`/users/${u.id}`, { method: 'DELETE' }), 'Пользователь удалён')}>Удалить</button>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
