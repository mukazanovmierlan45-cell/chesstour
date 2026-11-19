// Форматирование и небольшие помощники отображения, общие для страниц.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Экранирование для модулей, которые строят HTML строкой (тренировка). */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—');
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const shortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
export const monthShort = (iso) => MONTHS_SHORT[new Date(iso).getMonth()];

/** Склонение: plural(5, 'тур', 'тура', 'туров') */
export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Инициалы и стабильный цвет аватара по имени. */
const AVATAR_COLORS = ['#111111', '#3d3d3b', '#8b5a33', '#c62828', '#5e5e5a', '#26405e'];
export const initials = (name = '') => String(name).split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
export function avatarColor(name = '') {
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
/** Аватар строкой — для модулей без React (тренировка). */
export const avatar = (name = '', size = '') =>
  `<span class="avatar ${size}" style="background:${avatarColor(name)}" aria-hidden="true">${esc(initials(name))}</span>`;

/** Подписи значений (совпадают с label() перечислений бэкенда) — для полей, где API отдаёт только код. */
export const LABELS = {
  participant: { pending: 'Заявка', confirmed: 'Допущен', withdrawn: 'Снялся' },
  tournament: { draft: 'Черновик', registration: 'Регистрация', ongoing: 'Идёт', finished: 'Завершён', cancelled: 'Отменён' },
  result: { pending: 'Не сыграна', white_win: 'Победа белых', black_win: 'Победа чёрных', draw: 'Ничья', bye: 'Без пары' },
};
