import { api } from '../api.js';
import { badge, esc, formatDate } from '../ui.js';

const STATUSES = { '': 'Все статусы', draft: 'Черновик', registration: 'Регистрация', ongoing: 'Идёт', finished: 'Завершён', cancelled: 'Отменён' };
const FORMATS = { '': 'Любая система', swiss: 'Швейцарская', round_robin: 'Круговая' };
const SORTS = { start_date: 'Дате начала', title: 'Названию', created_at: 'Дате создания', max_participants: 'Числу мест' };

const options = (map, selected) =>
  Object.entries(map).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');

// Параметры списка живут в строке адреса: #/tournaments?status=...&page=2
function readParams() {
  const query = location.hash.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(query));
}

export async function tournamentsPage(root) {
  const params = { sort: 'start_date', order: 'asc', per_page: '6', page: '1', ...readParams() };
  const { data: timeControls } = await api('/time-controls');

  root.innerHTML = `
    <div class="page-head">
      <div><h1>Турниры клуба</h1><p>Блиц, рапид и классика — выберите турнир и подайте заявку</p></div>
    </div>
    <form id="filters" class="card filters">
      <div class="row"><label>Поиск</label><input name="search" value="${esc(params.search || '')}" placeholder="Название или место"></div>
      <div class="row"><label>Статус</label><select name="status">${options(STATUSES, params.status || '')}</select></div>
      <div class="row"><label>Система</label><select name="format">${options(FORMATS, params.format || '')}</select></div>
      <div class="row"><label>Контроль времени</label><select name="time_control_id">
        <option value="">Любой</option>
        ${timeControls.map((tc) => `<option value="${tc.id}" ${String(tc.id) === params.time_control_id ? 'selected' : ''}>${esc(tc.name)}</option>`).join('')}
      </select></div>
      <div class="row"><label>Начало с</label><input type="date" name="date_from" value="${esc(params.date_from || '')}"></div>
      <div class="row"><label>по</label><input type="date" name="date_to" value="${esc(params.date_to || '')}"></div>
      <div class="row"><label>Сортировать по</label><select name="sort">${options(SORTS, params.sort)}</select></div>
      <div class="row"><label>Порядок</label><select name="order">${options({ asc: 'По возрастанию', desc: 'По убыванию' }, params.order)}</select></div>
      <div class="actions"><button type="submit">Применить</button><button type="button" class="secondary" id="reset">Сбросить</button></div>
    </form>
    <div id="list"><p class="muted">Загрузка…</p></div>`;

  const form = root.querySelector('#filters');
  const apply = (extra = {}) => {
    const values = { ...Object.fromEntries(new FormData(form)), per_page: params.per_page, page: '1', ...extra };
    const query = new URLSearchParams(Object.entries(values).filter(([, v]) => v !== '')).toString();
    location.hash = `#/tournaments?${query}`;
  };
  form.addEventListener('submit', (event) => { event.preventDefault(); apply(); });
  root.querySelector('#reset').addEventListener('click', () => { location.hash = '#/tournaments'; });

  const list = root.querySelector('#list');
  try {
    const response = await api('/tournaments', { query: params });
    renderList(list, response, (page) => apply({ page: String(page) }));
  } catch (error) {
    list.innerHTML = `<div class="card">${esc(error.message)}</div>`;
  }
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// Карточка турнира — используется и в каталоге, и на главной
export function tournamentCard(t) {
  const start = new Date(t.start_date);
  const taken = t.participants_count ?? 0;
  const percent = Math.min(100, Math.round((taken / t.max_participants) * 100));
  const chips = [t.format_label, t.time_control?.name, t.min_rating ? `рейтинг от ${t.min_rating}` : null].filter(Boolean);
  return `
    <article class="t-card">
      <div class="t-top">
        <div class="t-date"><b>${start.getDate()}</b><span>${MONTHS[start.getMonth()]}</span></div>
        <div>
          ${badge(t.status, t.status_label)}
          <h3><a href="#/tournaments/${t.id}">${esc(t.title)}</a></h3>
          <div class="t-meta">${esc(t.location)}, до ${formatDate(t.end_date)}</div>
        </div>
      </div>
      <div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      <div class="places">
        <span>Участников: ${taken} из ${t.max_participants}</span>
        <div class="bar ${percent >= 100 ? 'full' : ''}"><i style="width:${percent}%"></i></div>
      </div>
    </article>`;
}

function renderList(root, { data, meta }, goTo) {
  if (!data.length) {
    root.innerHTML = '<div class="card empty">Турниров по этим условиям нет. Измените фильтры или сбросьте их.</div>';
    return;
  }

  root.innerHTML = `
    <p class="muted">Найдено турниров: ${meta.total}</p>
    <div class="grid">${data.map(tournamentCard).join('')}</div>
    <div class="pager">
      <button class="secondary" id="prev" ${meta.current_page <= 1 ? 'disabled' : ''}>Назад</button>
      <span>Страница ${meta.current_page} из ${meta.last_page}</span>
      <button class="secondary" id="next" ${meta.current_page >= meta.last_page ? 'disabled' : ''}>Вперёд</button>
    </div>`;

  root.querySelector('#prev').addEventListener('click', () => goTo(meta.current_page - 1));
  root.querySelector('#next').addEventListener('click', () => goTo(meta.current_page + 1));
}
