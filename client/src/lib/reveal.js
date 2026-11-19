// Появление при прокрутке: текст «печатается» буква за буквой с мигающим курсором,
// карточки и прочие блоки мягко всплывают.
const BLOCKS = [
  '.b3d-scene', '.stage-caption .actions', '.step-card', '.t-card', '.club > .card', '.players-center > a', '.chip-float',
  '.role-rows li', '.split-light > .actions', '.piece-row', '.t-facts', '.podium', '.table-wrap',
  '.card:not(.t-card)', '.tabs', '.section-head > a', '.footer-inner > div',
].join(',');
// Печатается только текст, помеченный в разметке: data-type="h" — заголовок с курсором,
// "p" — описание (быстрее, после заголовка своего раздела), "t" — текст карточки.
// Помечаются только статичные строки: React их больше не перерисовывает.
const HEADINGS = '[data-type="h"]';
const LEADS = '[data-type="p"]';
const PARAS = '[data-type="t"]';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Оборачивает каждую букву в span, сохраняя вложенные теги (b, a, nbsp). */
function splitChars(el) {
  const chars = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const ch of child.textContent) {
          if (ch === '\n' || (ch === ' ' && false)) { frag.append(ch); continue; }
          const span = document.createElement('span');
          span.className = 'ch';
          span.textContent = ch;
          frag.append(span);
          chars.push(span);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !['BR', 'svg'].includes(child.tagName)) {
        walk(child);
      }
    });
  };
  walk(el);
  return chars;
}

const sectionOf = (el) => el.closest('section, .page-head, .t-hero, .auth-side, .split > div, footer, main') ?? document.body;
const chains = new WeakMap();

function type(el) {
  const chars = el._chars;
  if (!chars?.length) return Promise.resolve();
  const heading = el.matches(HEADINGS);
  const step = heading ? 42 : Math.max(6, Math.min(18, 900 / chars.length)); // описания успевают за ~1 секунду
  const caret = document.createElement('span');
  caret.className = `caret ${heading ? '' : 'thin'}`;
  caret.setAttribute('aria-hidden', 'true');
  chars[0].before(caret);
  el.classList.add('typing');
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      // несколько букв за кадр, если шаг меньше длительности кадра
      const batch = Math.max(1, Math.round(16 / step));
      for (let k = 0; k < batch && i < chars.length; k++, i++) chars[i].classList.add('on');
      chars[Math.min(i, chars.length) - 1].after(caret);
      if (i < chars.length) { setTimeout(tick, step * batch); return; }
      el.classList.remove('typing');
      el.classList.add('typed');
      setTimeout(() => caret.remove(), heading ? 900 : 200);
      resolve();
    };
    tick();
  });
}

function startTyping(el) {
  const chained = el.matches(HEADINGS) || el.matches(LEADS);
  if (!chained) { type(el); return; }
  // в одном разделе заголовок и описание печатаются по очереди
  const section = sectionOf(el);
  const prev = chains.get(section) ?? Promise.resolve();
  const next = prev.then(() => type(el));
  chains.set(section, next);
}

export function initReveal(root = document.body) {
  if (reduced() || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target;
    if (el.dataset.rv === 'type') { startTyping(el); return; }
    el.classList.add('in');
    const delay = parseFloat(el.style.getPropertyValue('--rd')) || 0;
    setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.removeProperty('--rd'); }, 1000 + delay);
  }), { rootMargin: '0px 0px -5% 0px', threshold: 0.01 });

  const skipBlock = (el) => el.closest('.hero, .topbar, .flash, .train, .fp') || el.dataset.rv;
  const skipText = (el) => el.closest('.topbar, .flash, .train, .fp, .coach') || el.dataset.rv;

  const tag = () => {
    root.querySelectorAll(`${HEADINGS}, ${LEADS}, ${PARAS}`).forEach((el) => {
      if (skipText(el) || !el.textContent.trim()) return;
      el.dataset.rv = 'type';
      el._chars = splitChars(el);
      el.classList.add('typewriter');
      io.observe(el);
    });
    root.querySelectorAll(BLOCKS).forEach((el) => {
      if (skipBlock(el) || el.parentElement.closest('.reveal')) return;
      el.dataset.rv = 'block';
      const siblings = [...el.parentElement.children];
      el.style.setProperty('--rd', `${(siblings.indexOf(el) % 6) * 90}ms`);
      el.classList.add('reveal');
      io.observe(el);
    });
  };

  tag();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; tag(); });
  }).observe(root, { childList: true, subtree: true });
}
