// Доска в перспективе: фигуры стоят вертикально и сами разыгрывают партию.
import { pieceSVG } from './pieces.js';

import { colorOf, sqName } from './chess.js';

// Итальянская партия для демонстрации: 1.e4 e5 2.Кf3 Кc6 3.Сc4 Сc5 4.c3 Кf6 5.d4 ed 6.cd Сb4+ 7.Сd2 С:d2+ 8.Кb:d2 d5
export const GAME = [
  ['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['f8', 'c5'], ['c2', 'c3'], ['g8', 'f6'],
  ['d2', 'd4'], ['e5', 'd4'], ['c3', 'd4'], ['c5', 'b4'], ['c1', 'd2'], ['b4', 'd2'], ['b1', 'd2'], ['d7', 'd5'],
];

const FILES = 'abcdefgh';
const place = (node, i) => {
  node.dataset.i = i;
  node.style.transform = `translate(${(i % 8) * 100}%, ${Math.floor(i / 8) * 100}%)`;
};

/** Доска в перспективе. Позиция задаётся массивом из 64 клеток (a8 = 0 … h1 = 63). */
export function createBoard3d(el) {
  el.innerHTML = `
    <div class="b3d">
      <div class="b3d-frame">
        <div class="b3d-files">${[...FILES].map((f) => `<span>${f}</span>`).join('')}</div>
        <div class="b3d-ranks">${[8, 7, 6, 5, 4, 3, 2, 1].map((r) => `<span>${r}</span>`).join('')}</div>
        <div class="b3d-grid"></div>
      </div>
    </div>`;
  const grid = el.querySelector('.b3d-grid');
  const squares = [];
  for (let i = 0; i < 64; i++) {
    const sq = document.createElement('div');
    sq.className = `b3d-sq ${(Math.floor(i / 8) + (i % 8)) % 2 ? 'dark' : ''}`;
    sq.dataset.i = i;
    sq.setAttribute('aria-label', sqName(i));
    grid.append(sq);
    squares.push(sq);
  }
  let nodes = new Array(64).fill(null);

  const create = (code, i) => {
    const color = colorOf(code);
    const node = document.createElement('div');
    node.className = `b3d-piece ${color}`;
    node.innerHTML = `<div class="stand">${pieceSVG(code.toLowerCase(), color)}</div>`;
    place(node, i);
    grid.append(node);
    return node;
  };
  const remove = (node) => {
    node.classList.add('captured');
    setTimeout(() => node.remove(), 600);
  };
  const slide = (from, to) => {
    const node = nodes[from];
    nodes[from] = null;
    nodes[to] = node;
    place(node, to);
    node.classList.remove('hop');
    void node.offsetWidth; // перезапуск анимации прыжка
    node.classList.add('hop');
  };

  return {
    el,
    setPosition(board) {
      grid.querySelectorAll('.b3d-piece').forEach((n) => n.remove());
      nodes = board.map((code, i) => (code ? create(code, i) : null));
    },
    /** Анимация хода; move — объект из chess.js (from, to, enPassant, castle, promo). */
    playMove(m) {
      const captureAt = m.enPassant ? m.to + (colorOf(m.piece) === 'w' ? 8 : -8) : m.to;
      if (nodes[captureAt]) { remove(nodes[captureAt]); nodes[captureAt] = null; }
      slide(m.from, m.to);
      if (m.castle) {
        const [rf, rt] = m.castle === 'K' ? [m.from + 3, m.from + 1] : [m.from - 4, m.from - 1];
        setTimeout(() => slide(rf, rt), 180);
      }
      if (m.promo) {
        const color = colorOf(m.piece);
        setTimeout(() => { nodes[m.to].querySelector('.stand').innerHTML = pieceSVG('q', color); }, 500);
      }
    },
    /** Подсветка: last — последний ход, selected — выбранная клетка, targets — куда можно пойти, check — король под шахом. */
    mark({ last = [], selected = -1, targets = [], captures = [], check = -1 } = {}) {
      squares.forEach((sq, i) => {
        sq.classList.toggle('hl', last.includes(i));
        sq.classList.toggle('sel', i === selected);
        sq.classList.toggle('target', targets.includes(i) && !captures.includes(i));
        sq.classList.toggle('capture', captures.includes(i));
        sq.classList.toggle('check', i === check);
      });
    },
    /** handler получает все клетки под курсором — от ближней к дальней: фигуры в 3D закрывают друг друга. */
    onSquare(handler) {
      grid.addEventListener('click', (event) => {
        const stack = document.elementsFromPoint(event.clientX, event.clientY)
          .map((e) => e.closest?.('[data-i]'))
          .filter((e) => e && grid.contains(e))
          .map((e) => Number(e.dataset.i));
        const hit = event.target.closest('[data-i]');
        if (!stack.length && hit) stack.push(Number(hit.dataset.i));
        if (stack.length) handler([...new Set(stack)]);
      });
    },
    fade(out) { el.classList.toggle('resetting', out); },
  };
}

/** Парящая фигура для декоративных композиций. */
export function floating(type, color, { x, y, size, rot = 0, depth = 1, blur = 0, delay = 0, mobile = true }) {
  return `<div class="fp ${mobile ? '' : 'hide-m'}" style="left:${x}%;top:${y}%;width:${size}px;--d:${depth};--r:${rot}deg;--delay:${delay}s;${blur ? `filter:blur(${blur}px);` : ''}">
    <div class="fp-in">${pieceSVG(type, color)}</div></div>`;
}

/** Параллакс: фигуры слегка следуют за курсором. */
export function parallax(scope) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  scope.addEventListener('pointermove', (event) => {
    const rect = scope.getBoundingClientRect();
    scope.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
    scope.style.setProperty('--my', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
  });
}
