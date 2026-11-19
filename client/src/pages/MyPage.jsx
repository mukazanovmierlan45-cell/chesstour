import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, LABELS } from '../lib/format.js';
import { Badge, Empty, Loading } from '../components/ui.jsx';

export default function MyPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([api('/my/tournaments'), api('/my/games')])
      .then(([t, g]) => setData({ tournaments: t.data, games: g.data }))
      .catch((error) => setData({ error: error.message }));
  }, []);

  return (
    <div className="container">
      <div className="page-head">
        <div><h1 data-type="h">Мои турниры</h1><p data-type="p">Заявки, статусы допуска и сыгранные партии</p></div>
        <span className="actions"><Link className="btn" to="/training">Тренировка с роботом</Link><Link className="btn secondary" to="/tournaments?status=registration">Найти турнир</Link></span>
      </div>
      {!data && <Loading />}
      {data?.error && <Empty glyph="♚">{data.error}</Empty>}
      {data?.tournaments && (
        <>
          {data.tournaments.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Турнир</th><th>Даты</th><th>Статус турнира</th><th>Моя заявка</th></tr></thead>
              <tbody>{data.tournaments.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/tournaments/${t.id}`}>{t.title}</Link></td>
                  <td>{formatDate(t.start_date)}</td>
                  <td><Badge value={t.status} label={t.status_label} /></td>
                  <td>{t.my_registration ? <Badge value={t.my_registration.status} label={LABELS.participant[t.my_registration.status]} /> : '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>Вы ещё не подавали заявок. <Link to="/tournaments?status=registration">Найдите турнир</Link>.</Empty>}
          <h2>Мои партии</h2>
          {data.games.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Турнир</th><th>Тур</th><th>Белые</th><th>Результат</th><th>Чёрные</th></tr></thead>
              <tbody>{data.games.map((g) => (
                <tr key={g.id}>
                  <td>{g.round?.tournament?.title ?? ''}</td><td>{g.round?.number ?? ''}</td>
                  <td>{g.white?.name ?? ''}</td><td className="result">{g.result_notation}</td>
                  <td>{g.is_bye ? 'без пары' : g.black?.name ?? ''}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty>Сыгранных партий пока нет.</Empty>}
        </>
      )}
    </div>
  );
}
