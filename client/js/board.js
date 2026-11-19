// Живая доска: Итальянская партия разыгрывается на главном экране
const START = {
  a8: 'br', b8: 'bn', c8: 'bb', d8: 'bq', e8: 'bk', f8: 'bb', g8: 'bn', h8: 'br',
  a7: 'bp', b7: 'bp', c7: 'bp', d7: 'bp', e7: 'bp', f7: 'bp', g7: 'bp', h7: 'bp',
  a2: 'wp', b2: 'wp', c2: 'wp', d2: 'wp', e2: 'wp', f2: 'wp', g2: 'wp', h2: 'wp',
  a1: 'wr', b1: 'wn', c1: 'wb', d1: 'wq', e1: 'wk', f1: 'wb', g1: 'wn', h1: 'wr',
};
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
export const MOVES = [
  ['e2', 'e4', 'e4'], ['e7', 'e5', 'e5'], ['g1', 'f3', 'Кf3'], ['b8', 'c6', 'Кc6'],
  ['f1', 'c4', 'Сc4'], ['f8', 'c5', 'Сc5'], ['c2', 'c3', 'c3'], ['g8', 'f6', 'Кf6'],
];

const pos = (sq) => {
  const file = sq.charCodeAt(0) - 97;
  const rank = 8 - Number(sq[1]);
  return `translate(${file * 100}%, ${rank * 100}%)`;
};

export function renderBoard(el, { animate = true, coords = false, onMove = () => {} } = {}) {
  el.innerHTML = '';
  for (let r = 8; r >= 1; r--) {
    for (let f = 0; f < 8; f++) {
      const sq = document.createElement('div');
      sq.className = `sq ${(f + r) % 2 === 1 ? 'dark' : ''}`;
      sq.dataset.sq = String.fromCharCode(97 + f) + r;
      if (coords && f === 0) sq.insertAdjacentHTML('beforeend', `<span class="coord rank">${r}</span>`);
      if (coords && r === 1) sq.insertAdjacentHTML('beforeend', `<span class="coord file">${String.fromCharCode(97 + f)}</span>`);
      el.append(sq);
    }
  }

  let pieces = {};
  const place = () => {
    el.querySelectorAll('.piece').forEach((p) => p.remove());
    el.querySelectorAll('.hl').forEach((s) => s.classList.remove('hl'));
    pieces = {};
    Object.entries(START).forEach(([sq, code]) => {
      const p = document.createElement('span');
      p.className = `piece ${code[0]}`;
      p.textContent = GLYPH[code[1]];
      p.style.transform = pos(sq);
      p.setAttribute('aria-hidden', 'true');
      el.append(p);
      pieces[sq] = p;
    });
  };
  place();

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduced) return () => {};

  let i = 0;
  const timer = setInterval(() => {
    if (!el.isConnected) return clearInterval(timer);
    if (i >= MOVES.length) {
      i = 0;
      place();
      onMove(-1);
      return;
    }
    const [from, to] = MOVES[i++];
    const piece = pieces[from];
    delete pieces[from];
    pieces[to] = piece;
    piece.style.transform = pos(to);
    el.querySelectorAll('.hl').forEach((s) => s.classList.remove('hl'));
    el.querySelector(`[data-sq="${from}"]`).classList.add('hl');
    el.querySelector(`[data-sq="${to}"]`).classList.add('hl');
    onMove(i - 1);
  }, 1400);

  return () => clearInterval(timer);
}
