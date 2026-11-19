// Плавное появление блоков при прокрутке: заголовки выезжают по словам, карточки — по очереди.
const BLOCKS = [
  '.section-head > div', '.section-head > a', '.stage-lead', '.b3d-scene', '.stage-caption',
  '.step-card', '.t-card', '.club > .card', '.players-center > a', '.chip-float',
  '.role-rows li', '.split-light > p', '.split-light > .actions', '.piece-row',
  '.page-head p', '.t-hero', '.t-facts', '.podium', '.table-wrap', '.card', '.tabs',
  '.footer-inner > div',
].join(',');
const WORDS = '.display-2, .page-head h1, .t-hero h1, .section-head h2, main h2';

function splitWords(el) {
  let n = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/( +)/).forEach((part) => {
          if (!part) return;
          if (/^ +$/.test(part)) { frag.append(part); return; }
          const outer = document.createElement('span');
          outer.className = 'w';
          const inner = document.createElement('span');
          inner.className = 'wi';
          inner.style.setProperty('--wi', n++);
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
}

export function initReveal(root = document.body) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  const show = (el) => {
    el.classList.add('in');
    const delay = parseFloat(el.style.getPropertyValue('--rd')) || 0;
    // после появления убираем служебные классы, чтобы не мешать hover-эффектам
    if (el.classList.contains('reveal')) setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.removeProperty('--rd'); }, 1000 + delay);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    show(e.target);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -5% 0px', threshold: 0.01 });

  const skip = (el) => el.closest('.hero, .topbar, .flash, .train, .fp') || el.dataset.rv;

  const tag = () => {
    root.querySelectorAll(WORDS).forEach((el) => {
      if (skip(el)) return;
      el.dataset.rv = 'words';
      splitWords(el);
      el.classList.add('reveal-words');
      io.observe(el);
    });
    root.querySelectorAll(BLOCKS).forEach((el) => {
      if (skip(el) || el.parentElement.closest('.reveal')) return;
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
