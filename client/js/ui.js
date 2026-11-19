const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Экранирование любых данных с сервера перед вставкой в HTML. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function flash(message, type = 'ok') {
  const box = document.getElementById('flash');
  box.textContent = message;
  box.className = `flash ${type === 'error' ? 'error' : ''}`;
  box.hidden = false;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { box.hidden = true; }, 4000);
}

export const badge = (value, label) => `<span class="badge ${esc(value)}">${esc(label ?? value)}</span>`;

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—');
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Вывод ошибок 422 рядом с полями формы. */
export function showFieldErrors(form, errors = {}) {
  clearFieldErrors(form);
  Object.entries(errors).forEach(([field, messages]) => {
    const input = form.elements[field];
    const text = Array.isArray(messages) ? messages.join(' ') : messages;
    const error = document.createElement('div');
    error.className = 'field-error';
    error.textContent = text;
    if (input && input.closest) {
      input.classList.add('invalid');
      input.closest('.row')?.append(error);
    } else {
      form.prepend(error);
    }
  });
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
}

/** Клиентская проверка обязательных полей до отправки. */
export function checkRequired(form, fields) {
  const errors = {};
  fields.forEach((name) => {
    const input = form.elements[name];
    if (input && String(input.value).trim() === '') errors[name] = ['Обязательное поле'];
  });
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return false;
  }
  return true;
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());
