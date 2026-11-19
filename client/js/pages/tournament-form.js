import { api } from '../api.js';
import { checkRequired, clearFieldErrors, esc, flash, formData, showFieldErrors } from '../ui.js';

const REQUIRED = ['title', 'time_control_id', 'format', 'location', 'start_date', 'end_date',
  'registration_deadline', 'max_participants', 'rounds_count'];

export async function tournamentFormPage(root, id) {
  const [{ data: timeControls }, existing] = await Promise.all([
    api('/time-controls'),
    id ? api(`/tournaments/${id}`).then((r) => r.data) : Promise.resolve(null),
  ]);
  const t = existing || {};
  const deadline = t.registration_deadline ? t.registration_deadline.slice(0, 16) : '';

  root.innerHTML = `
    <h1>${id ? 'Редактирование турнира' : 'Новый турнир'}</h1>
    <form id="tournament-form" class="card" novalidate>
      <div class="row"><label for="title">Название *</label><input id="title" name="title" value="${esc(t.title || '')}"></div>
      <div class="row"><label for="description">Описание</label><textarea id="description" name="description">${esc(t.description || '')}</textarea></div>
      <div class="inline">
        <div class="row"><label for="time_control_id">Контроль времени *</label>
          <select id="time_control_id" name="time_control_id"><option value="">— выберите —</option>
            ${timeControls.map((tc) => `<option value="${tc.id}" ${tc.id === t.time_control?.id ? 'selected' : ''}>${esc(tc.name)}</option>`).join('')}
          </select></div>
        <div class="row"><label for="format">Система *</label>
          <select id="format" name="format">
            <option value="swiss" ${t.format === 'swiss' ? 'selected' : ''}>Швейцарская</option>
            <option value="round_robin" ${t.format === 'round_robin' ? 'selected' : ''}>Круговая</option>
          </select></div>
        <div class="row"><label for="location">Место проведения *</label><input id="location" name="location" value="${esc(t.location || '')}"></div>
      </div>
      <div class="inline">
        <div class="row"><label for="start_date">Дата начала *</label><input type="date" id="start_date" name="start_date" value="${esc(t.start_date || '')}"></div>
        <div class="row"><label for="end_date">Дата окончания *</label><input type="date" id="end_date" name="end_date" value="${esc(t.end_date || '')}"></div>
        <div class="row"><label for="registration_deadline">Приём заявок до *</label><input type="datetime-local" id="registration_deadline" name="registration_deadline" value="${esc(deadline)}"></div>
      </div>
      <div class="inline">
        <div class="row"><label for="max_participants">Мест *</label><input type="number" min="2" id="max_participants" name="max_participants" value="${esc(t.max_participants || 16)}"></div>
        <div class="row"><label for="rounds_count">Туров *</label><input type="number" min="1" id="rounds_count" name="rounds_count" value="${esc(t.rounds_count || 5)}"></div>
        <div class="row"><label for="min_rating">Мин. рейтинг</label><input type="number" min="0" id="min_rating" name="min_rating" value="${esc(t.min_rating ?? '')}"></div>
      </div>
      <div class="actions"><button type="submit">Сохранить</button><a href="#/tournaments${id ? `/${id}` : ''}">Отмена</a></div>
    </form>`;

  const form = root.querySelector('#tournament-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    if (!checkRequired(form, REQUIRED)) return;

    const body = formData(form);
    body.registration_deadline = body.registration_deadline.replace('T', ' ');
    body.min_rating = body.min_rating === '' ? null : Number(body.min_rating);
    ['time_control_id', 'max_participants', 'rounds_count'].forEach((key) => { body[key] = Number(body[key]); });

    try {
      const { data } = await api(id ? `/tournaments/${id}` : '/tournaments', { method: id ? 'PATCH' : 'POST', body });
      flash('Турнир сохранён');
      location.hash = `#/tournaments/${data.id}`;
    } catch (error) {
      if (error.status === 422) showFieldErrors(form, error.errors);
      else flash(error.message, 'error');
    }
  });
}
