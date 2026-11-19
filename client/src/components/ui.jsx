import { Link } from 'react-router-dom';
import { avatarColor, formatDate, initials, monthShort } from '../lib/format.js';
import { pieceSVG } from '../lib/pieces.js';
import { floating } from '../lib/board3d.js';

export const Badge = ({ value, label }) => <span className={`badge ${value}`}>{label ?? value}</span>;

export const Avatar = ({ name, size = '' }) => (
  <span className={`avatar ${size}`} style={{ background: avatarColor(name) }} aria-hidden="true">{initials(name)}</span>
);

export const Person = ({ name }) => <span className="person"><Avatar name={name} />{name}</span>;

/** Декоративные фигуры: SVG генерируется библиотекой pieces.js. */
export const Pieces = ({ list, className, color }) => (
  <div className={className} aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: list.map((t) => pieceSVG(t, color)).join('') }} />
);

/** Слой парящих фигур с параллаксом. items: [type, color, options] */
export const FloatingLayer = ({ items, className = 'fp-layer' }) => (
  <div className={className} aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: items.map(([t, c, o]) => floating(t, c, o)).join('') }} />
);

export const FieldError = ({ errors, name }) =>
  errors?.[name] ? <div className="field-error">{[].concat(errors[name]).join(' ')}</div> : null;

export const Empty = ({ glyph = '♘', children }) => (
  <div className="card empty"><span className="empty-glyph">{glyph}</span>{children}</div>
);

export const Loading = () => <p className="muted" style={{ padding: '24px 0' }}>Загрузка…</p>;

/** Карточка турнира — каталог и главная. */
export function TournamentCard({ t }) {
  const taken = t.participants_count ?? 0;
  const percent = Math.min(100, Math.round((taken / t.max_participants) * 100));
  const chips = [t.format_label, t.time_control?.name, t.min_rating ? `рейтинг от ${t.min_rating}` : null].filter(Boolean);
  return (
    <article className="t-card">
      <div className="t-top">
        <div className="t-date"><b>{new Date(t.start_date).getDate()}</b><span>{monthShort(t.start_date)}</span></div>
        <div>
          <Badge value={t.status} label={t.status_label} />
          <h3><Link to={`/tournaments/${t.id}`}>{t.title}</Link></h3>
          <div className="t-meta">{t.location}, до {formatDate(t.end_date)}</div>
        </div>
      </div>
      <div className="chips">{chips.map((c) => <span className="chip" key={c}>{c}</span>)}</div>
      <div className="places">
        <span>Участников: {taken} из {t.max_participants}</span>
        <div className={`bar ${percent >= 100 ? 'full' : ''}`}><i style={{ width: `${percent}%` }} /></div>
      </div>
    </article>
  );
}

export const Skeletons = ({ n = 3 }) => Array.from({ length: n }, (_, i) => <div className="t-card skeleton" key={i} />);

/** Хук-помощник: выполнить действие API, показать уведомление и перезагрузить данные. */
export function useAction(flash, reload) {
  return async (promise, message) => {
    try {
      await promise;
      flash(message);
      reload?.();
    } catch (error) {
      flash(error.message, 'error'); // 409 — нарушение бизнес-правила: показываем сообщение сервера
    }
  };
}
