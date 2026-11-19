import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Empty, Skeletons, TournamentCard } from '../components/ui.jsx';

const TABS = { '': 'Все', registration: 'Регистрация', ongoing: 'Идут', finished: 'Завершённые' };
const FORMATS = { '': 'Любая система', swiss: 'Швейцарская', round_robin: 'Круговая' };
const SORTS = { start_date: 'Дате начала', title: 'Названию', created_at: 'Дате создания', max_participants: 'Числу мест' };
const DEFAULTS = { sort: 'start_date', order: 'asc', per_page: '6', page: '1' };

// Параметры списка живут в адресе: /#/tournaments?status=ongoing&page=2 — ссылкой можно поделиться
export default function TournamentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = { ...DEFAULTS, ...Object.fromEntries(searchParams) };
  const [form, setForm] = useState(params);
  const [timeControls, setTimeControls] = useState([]);
  const [result, setResult] = useState(null);
  const key = searchParams.toString();

  useEffect(() => { api('/time-controls').then(({ data }) => setTimeControls(data)).catch(() => {}); }, []);
  useEffect(() => {
    setForm(params);
    setResult(null);
    api('/tournaments', { query: params }).then(setResult).catch((error) => setResult({ error: error.message }));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (patch = {}) => {
    const next = { ...form, page: '1', ...patch };
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== '' && !(DEFAULTS[k] === v && k !== 'page'))));
  };
  const set = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const advancedOpen = ['format', 'time_control_id', 'date_from', 'date_to'].some((k) => params[k]);
  const options = (map) => Object.entries(map).map(([v, l]) => <option value={v} key={v}>{l}</option>);

  return (
    <div className="container">
      <div className="page-head">
        <div><h1 data-type="h">Турниры клуба</h1><p data-type="p">Блиц, рапид и классика — выберите турнир и подайте заявку</p></div>
      </div>
      <nav className="tabs" aria-label="Статус турнира">
        {Object.entries(TABS).map(([value, label]) => (
          <a href="#" key={value} className={(params.status || '') === value ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); apply({ status: value }); }}>{label}</a>
        ))}
      </nav>
      <form className="card filters" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <div className="row search-row"><label htmlFor="search">Поиск</label>
          <input id="search" name="search" type="search" value={form.search ?? ''} onChange={set} placeholder="Название турнира или место проведения" /></div>
        <details className="more" open={advancedOpen}>
          <summary>Ещё фильтры и сортировка</summary>
          <div className="more-grid">
            <div className="row"><label>Система</label><select name="format" value={form.format ?? ''} onChange={set}>{options(FORMATS)}</select></div>
            <div className="row"><label>Контроль времени</label>
              <select name="time_control_id" value={form.time_control_id ?? ''} onChange={set}>
                <option value="">Любой</option>{timeControls.map((tc) => <option value={tc.id} key={tc.id}>{tc.name}</option>)}
              </select></div>
            <div className="row"><label>Начало с</label><input type="date" name="date_from" value={form.date_from ?? ''} onChange={set} /></div>
            <div className="row"><label>по</label><input type="date" name="date_to" value={form.date_to ?? ''} onChange={set} /></div>
            <div className="row"><label>Сортировать по</label><select name="sort" value={form.sort} onChange={set}>{options(SORTS)}</select></div>
            <div className="row"><label>Порядок</label><select name="order" value={form.order} onChange={set}>{options({ asc: 'По возрастанию', desc: 'По убыванию' })}</select></div>
          </div>
        </details>
        <div className="actions">
          <button type="submit">Применить</button>
          <button type="button" className="secondary" onClick={() => setSearchParams({})}>Сбросить</button>
        </div>
      </form>

      {!result && <div className="grid"><Skeletons /></div>}
      {result?.error && <Empty glyph="♚">{result.error}</Empty>}
      {result?.data && (result.data.length === 0 ? (
        <Empty>Турниров по этим условиям нет. Измените фильтры или сбросьте их.</Empty>
      ) : (
        <>
          <p className="muted">Найдено турниров: {result.meta.total}</p>
          <div className="grid">{result.data.map((t) => <TournamentCard t={t} key={t.id} />)}</div>
          <div className="pager">
            <button className="secondary" disabled={result.meta.current_page <= 1} onClick={() => apply({ ...params, page: String(result.meta.current_page - 1) })}>Назад</button>
            <span>Страница {result.meta.current_page} из {result.meta.last_page}</span>
            <button className="secondary" disabled={result.meta.current_page >= result.meta.last_page} onClick={() => apply({ ...params, page: String(result.meta.current_page + 1) })}>Вперёд</button>
          </div>
        </>
      ))}
    </div>
  );
}
