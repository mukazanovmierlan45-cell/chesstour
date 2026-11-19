// Доска в перспективе: фигуры стоят вертикально и сами разыгрывают партию.
import { pieceSVG } from './pieces.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

// Итальянская партия, Джуоко пиано: 1.e4 e5 2.Кf3 Кc6 3.Сc4 Сc5 4.c3 Кf6 5.d4 ed 6.cd Сb4+ 7.Сd2 С:d2+ 8.Кb:d2 d5
export const GAME = [
  ['e2', 'e4', 'e4'], ['e7', 'e5', 'e5'], ['g1', 'f3', 'Кf3'], ['b8', 'c6', 'Кc6'],
  ['f1', 'c4', 'Сc4'], ['f8', 'c5', 'Сc5'], ['c2', 'c3', 'c3'], ['g8', 'f6', 'Кf6'],
  ['d2', 'd4', 'd4'], ['e5', 'd4', 'e:d4'], ['c3', 'd4', 'c:d4'], ['c5', 'b4', 'Сb4+'],
  ['c1', 'd2', 'Сd2'], ['b4', 'd2', 'С:d2+'], ['b1', 'd2', 'К:d2'], ['d7', 'd5', 'd5'],
];

const FILES = 'abcdefgh';
const at = (sq) => [FILES.indexOf(sq[0]), 8 - Number(sq[1])]; // [столбец, строка сверху]

export function renderBoard3d(el, { onMove = () => {}, interval = 1500 } = {}) {
  el.innerHTML = `
    <div class="b3d">
      <div class="b3d-frame">
        <div class="b3d-files">${[...FILES].map((f) => `<span>${f}</span>`).join('')}</div>
        <div class="b3d-ranks">${[8, 7, 6, 5, 4, 3, 2, 1].map((r) => `<span>${r}</span>`).join('')}</div>
        <div class="b3d-grid"></div>
      </div>
    </div>`;
  const grid = el.querySelector('.b3d-grid');
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      grid.insertAdjacentHTML('beforeend', `<div class="b3d-sq ${(r + f) % 2 ? 'dark' : ''}" data-sq="${FILES[f]}${8 - r}"></div>`);
    }
  }

  let board = {};
  const put = (sq, code) => {
    const [f, r] = at(sq);
    const color = code === code.toUpperCase() ? 'w' : 'b';
    const node = document.createElement('div');
    node.className = `b3d-piece ${color}`;
    node.style.transform = `translate(${f * 100}%, ${r * 100}%)`;
    node.style.zIndex = String(r + 1);
    node.innerHTML = `<div class="stand">${pieceSVG(code.toLowerCase(), color)}</div>`;
    grid.append(node);
    board[sq] = node;
  };
  const setup = () => {
    grid.querySelectorAll('.b3d-piece').forEach((n) => n.remove());
    grid.querySelectorAll('.hl').forEach((n) => n.classList.remove('hl'));
    board = {};
    START.split('/').forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { f += Number(ch); continue; }
        put(`${FILES[f]}${8 - r}`, ch);
        f++;
      }
    });
  };
  setup();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let i = 0;
  const step = () => {
    if (!el.isConnected) return clearInterval(timer);
    if (i >= GAME.length) {
      i = 0;
      el.classList.add('resetting');
      setTimeout(() => { setup(); onMove(-1); el.classList.remove('resetting'); }, 600);
      return;
    }
    const [from, to] = GAME[i];
    const node = board[from];
    const captured = board[to];
    if (captured) {
      captured.classList.add('captured');
      setTimeout(() => captured.remove(), 700);
    }
    delete board[from];
    board[to] = node;
    const [f, r] = at(to);
    node.style.zIndex = String(r + 1);
    node.style.transform = `translate(${f * 100}%, ${r * 100}%)`;
    node.classList.remove('hop');
    void node.offsetWidth; // перезапуск анимации прыжка
    node.classList.add('hop');
    grid.querySelectorAll('.hl').forEach((n) => n.classList.remove('hl'));
    grid.querySelector(`[data-sq="${from}"]`).classList.add('hl');
    grid.querySelector(`[data-sq="${to}"]`).classList.add('hl');
    onMove(i);
    i++;
  };
  const timer = setInterval(step, interval);
  return () => clearInterval(timer);
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
