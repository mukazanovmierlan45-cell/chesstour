// Живая доска: Итальянская партия разыгрывается на главном экране
const START = {
  a8: 'br', b8: 'bn', c8: 'bb', d8: 'bq', e8: 'bk', f8: 'bb', g8: 'bn', h8: 'br',
  a7: 'bp', b7: 'bp', c7: 'bp', d7: 'bp', e7: 'bp', f7: 'bp', g7: 'bp', h7: 'bp',
  a2: 'wp', b2: 'wp', c2: 'wp', d2: 'wp', e2: 'wp', f2: 'wp', g2: 'wp', h2: 'wp',
  a1: 'wr', b1: 'wn', c1: 'wb', d1: 'wq', e1: 'wk', f1: 'wb', g1: 'wn', h1: 'wr',
};
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const MOVES = [
  ['e2', 'e4', '1. e4'], ['e7', 'e5', '1… e5'], ['g1', 'f3', '2. Кf3'], ['b8', 'c6', '2… Кc6'],
  ['f1', 'c4', '3. Сc4'], ['f8', 'c5', '3… Сc5'], ['c2', 'c3', '4. c3'], ['g8', 'f6', '4… Кf6'],
];

const pos = (sq) => {
  const file = sq.charCodeAt(0) - 97;
  const rank = 8 - Number(sq[1]);
  return `translate(${file * 100}%, ${rank * 100}%)`;
};

export function renderBoard(el, { animate = true, caption = null } = {}) {
  el.innerHTML = '';
  for (let r = 8; r >= 1; r--) {
    for (let f = 0; f < 8; f++) {
      const sq = document.createElement('div');
      sq.className = `sq ${(f + r) % 2 === 1 ? 'dark' : ''}`;
      sq.dataset.sq = String.fromCharCode(97 + f) + r;
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
  if (!animate || reduced) {
    if (caption) caption.textContent = 'Итальянская партия';
    return () => {};
  }

  let i = 0;
  const timer = setInterval(() => {
    if (!el.isConnected) return clearInterval(timer);
    if (i >= MOVES.length) {
      i = 0;
      place();
      if (caption) caption.textContent = 'Начальная позиция';
      return;
    }
    const [from, to, label] = MOVES[i++];
    const piece = pieces[from];
    delete pieces[from];
    pieces[to] = piece;
    piece.style.transform = pos(to);
    el.querySelectorAll('.hl').forEach((s) => s.classList.remove('hl'));
    el.querySelector(`[data-sq="${from}"]`).classList.add('hl');
    el.querySelector(`[data-sq="${to}"]`).classList.add('hl');
    if (caption) caption.textContent = label;
  }, 1400);

  return () => clearInterval(timer);
}
