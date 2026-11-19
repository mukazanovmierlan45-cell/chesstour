import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { FieldError, Loading } from '../components/ui.jsx';

const REQUIRED = ['title', 'time_control_id', 'format', 'location', 'start_date', 'end_date', 'registration_deadline', 'max_participants', 'rounds_count'];
const EMPTY = {
  title: '', description: '', time_control_id: '', format: 'swiss', location: '', start_date: '', end_date: '',
  registration_deadline: '', max_participants: 16, rounds_count: 5, min_rating: '',
};

/** Клиентская проверка до отправки: обязательные поля и согласованность дат. */
function validate(v) {
  const errors = {};
  REQUIRED.forEach((f) => { if (String(v[f] ?? '').trim() === '') errors[f] = 'Обязательное поле'; });
  if (v.start_date && v.end_date && v.end_date < v.start_date) errors.end_date = 'Дата окончания раньше даты начала';
  if (v.registration_deadline && v.start_date && v.registration_deadline.slice(0, 10) > v.start_date) {
    errors.registration_deadline = 'Приём заявок должен закончиться до начала турнира';
  }
  if (Number(v.max_participants) < 2) errors.max_participants = 'Не меньше 2 участников';
  if (Number(v.rounds_count) < 1) errors.rounds_count = 'Не меньше 1 тура';
  return errors;
}

export default function TournamentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const flash = useToast();
  const [timeControls, setTimeControls] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api('/time-controls'), id ? api(`/tournaments/${id}`) : Promise.resolve(null)])
      .then(([tc, existing]) => {
        setTimeControls(tc.data);
        if (existing) {
          const t = existing.data;
          setValues({
            ...EMPTY, ...t, time_control_id: t.time_control?.id ?? '', min_rating: t.min_rating ?? '',
            description: t.description ?? '', registration_deadline: t.registration_deadline?.slice(0, 16) ?? '',
          });
        }
      })
      .catch((error) => flash(error.message, 'error'));
  }, [id, flash]);

  const field = (name) => ({
    id: name, name, value: values[name] ?? '', className: errors[name] ? 'invalid' : '',
    onChange: (e) => setValues({ ...values, [name]: e.target.value }),
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      title: values.title, description: values.description, format: values.format, location: values.location,
      start_date: values.start_date, end_date: values.end_date,
      registration_deadline: values.registration_deadline.replace('T', ' '),
      time_control_id: Number(values.time_control_id), max_participants: Number(values.max_participants),
      rounds_count: Number(values.rounds_count), min_rating: values.min_rating === '' ? null : Number(values.min_rating),
    };
    setBusy(true);
    try {
      const { data } = await api(id ? `/tournaments/${id}` : '/tournaments', { method: id ? 'PATCH' : 'POST', body });
      flash('Турнир сохранён');
      navigate(`/tournaments/${data.id}`);
    } catch (error) {
      if (error.status === 422) setErrors(error.errors);
      else flash(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!timeControls) return <div className="container"><Loading /></div>;

  const row = (name, label, input) => (
    <div className="row"><label htmlFor={name}>{label}</label>{input}<FieldError errors={errors} name={name} /></div>
  );
  return (
    <div className="container">
      <div className="page-head"><div><h1>{id ? 'Редактирование турнира' : 'Новый турнир'}</h1><p>Поля со звёздочкой обязательны</p></div></div>
      <form className="card" onSubmit={onSubmit} noValidate>
        {row('title', 'Название *', <input {...field('title')} />)}
        {row('description', 'Описание', <textarea {...field('description')} />)}
        <div className="inline">
          {row('time_control_id', 'Контроль времени *', (
            <select {...field('time_control_id')}>
              <option value="">— выберите —</option>
              {timeControls.map((tc) => <option value={tc.id} key={tc.id}>{tc.name}</option>)}
            </select>
          ))}
          {row('format', 'Система *', (
            <select {...field('format')}><option value="swiss">Швейцарская</option><option value="round_robin">Круговая</option></select>
          ))}
          {row('location', 'Место проведения *', <input {...field('location')} />)}
        </div>
        <div className="inline">
          {row('start_date', 'Дата начала *', <input type="date" {...field('start_date')} />)}
          {row('end_date', 'Дата окончания *', <input type="date" {...field('end_date')} />)}
          {row('registration_deadline', 'Приём заявок до *', <input type="datetime-local" {...field('registration_deadline')} />)}
        </div>
        <div className="inline">
          {row('max_participants', 'Мест *', <input type="number" min="2" {...field('max_participants')} />)}
          {row('rounds_count', 'Туров *', <input type="number" min="1" {...field('rounds_count')} />)}
          {row('min_rating', 'Мин. рейтинг', <input type="number" min="0" {...field('min_rating')} />)}
        </div>
        <div className="actions">
          <button type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
          <Link to={id ? `/tournaments/${id}` : '/tournaments'}>Отмена</Link>
        </div>
      </form>
    </div>
  );
}
