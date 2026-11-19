// Небольшой шахматный движок: правила, проверка шаха, мат и пат, простой соперник.
// Клетки — индексы 0..63, строка 0 — восьмая горизонталь (a8 = 0, h1 = 63).

const FILES = 'abcdefgh';
export const sqName = (i) => FILES[i % 8] + (8 - Math.floor(i / 8));
export const sqIndex = (name) => FILES.indexOf(name[0]) + (8 - Number(name[1])) * 8;
export const colorOf = (p) => (p ? (p === p.toUpperCase() ? 'w' : 'b') : null);
const other = (c) => (c === 'w' ? 'b' : 'w');

export function startPosition() {
  const b = [...'rnbqkbnrpppppppp', ...Array(32).fill(null), ...'PPPPPPPPRNBQKBNR'];
  return { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1 };
}

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const on = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;

/** Атакована ли клетка i фигурами цвета by. */
export function attacked(pos, i, by) {
  const r = Math.floor(i / 8), f = i % 8, b = pos.b;
  const is = (rr, ff, types) => {
    if (!on(rr, ff)) return false;
    const p = b[rr * 8 + ff];
    return p && colorOf(p) === by && types.includes(p.toLowerCase());
  };
  const pr = by === 'w' ? r + 1 : r - 1; // откуда бьёт пешка
  if (is(pr, f - 1, 'p') || is(pr, f + 1, 'p')) return true;
  if (KNIGHT.some(([dr, df]) => is(r + dr, f + df, 'n'))) return true;
  if (KING.some(([dr, df]) => is(r + dr, f + df, 'k'))) return true;
  const ray = (dirs, types) => dirs.some(([dr, df]) => {
    let rr = r + dr, ff = f + df;
    while (on(rr, ff)) {
      const p = b[rr * 8 + ff];
      if (p) return colorOf(p) === by && types.includes(p.toLowerCase());
      rr += dr; ff += df;
    }
    return false;
  });
  return ray(ROOK, 'rq') || ray(BISHOP, 'bq');
}

export const inCheck = (pos, color) => attacked(pos, pos.b.indexOf(color === 'w' ? 'K' : 'k'), other(color));

function pseudo(pos) {
  const moves = [], b = pos.b, me = pos.turn;
  const add = (from, to, extra = {}) => moves.push({ from, to, piece: b[from], captured: b[to], ...extra });
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || colorOf(p) !== me) continue;
    const r = Math.floor(i / 8), f = i % 8, type = p.toLowerCase();
    if (type === 'p') {
      const dir = me === 'w' ? -1 : 1, last = me === 'w' ? 0 : 7, start = me === 'w' ? 6 : 1;
      const one = (r + dir) * 8 + f;
      if (on(r + dir, f) && !b[one]) {
        add(i, one, r + dir === last ? { promo: true } : {});
        const two = (r + 2 * dir) * 8 + f;
        if (r === start && !b[two]) add(i, two, { double: true });
      }
      for (const df of [-1, 1]) {
        if (!on(r + dir, f + df)) continue;
        const t = (r + dir) * 8 + f + df;
        if (b[t] && colorOf(b[t]) !== me) add(i, t, r + dir === last ? { promo: true } : {});
        else if (t === pos.ep) add(i, t, { enPassant: true, captured: me === 'w' ? 'p' : 'P' });
      }
    } else if (type === 'n' || type === 'k') {
      for (const [dr, df] of type === 'n' ? KNIGHT : KING) {
        if (!on(r + dr, f + df)) continue;
        const t = (r + dr) * 8 + f + df;
        if (!b[t] || colorOf(b[t]) !== me) add(i, t);
      }
      if (type === 'k') {
        const home = me === 'w' ? 60 : 4, opp = other(me);
        const [kSide, qSide] = me === 'w' ? ['K', 'Q'] : ['k', 'q'];
        if (i === home && !attacked(pos, home, opp)) {
          if (pos.castle[kSide] && !b[home + 1] && !b[home + 2] && !attacked(pos, home + 1, opp) && !attacked(pos, home + 2, opp)) add(i, home + 2, { castle: 'K' });
          if (pos.castle[qSide] && !b[home - 1] && !b[home - 2] && !b[home - 3] && !attacked(pos, home - 1, opp) && !attacked(pos, home - 2, opp)) add(i, home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = type === 'r' ? ROOK : type === 'b' ? BISHOP : [...ROOK, ...BISHOP];
      for (const [dr, df] of dirs) {
        let rr = r + dr, ff = f + df;
        while (on(rr, ff)) {
          const t = rr * 8 + ff;
          if (b[t]) { if (colorOf(b[t]) !== me) add(i, t); break; }
          add(i, t);
          rr += dr; ff += df;
        }
      }
    }
  }
  return moves;
}

export function makeMove(pos, m) {
  const b = pos.b.slice(), castle = { ...pos.castle }, me = pos.turn;
  b[m.to] = m.promo ? (me === 'w' ? 'Q' : 'q') : b[m.from];
  b[m.from] = null;
  if (m.enPassant) b[m.to + (me === 'w' ? 8 : -8)] = null;
  if (m.castle) {
    const [rf, rt] = m.castle === 'K' ? [m.from + 3, m.from + 1] : [m.from - 4, m.from - 1];
    b[rt] = b[rf]; b[rf] = null;
  }
  const lose = { 60: 'KQ', 4: 'kq', 63: 'K', 56: 'Q', 7: 'k', 0: 'q' };
  for (const sq of [m.from, m.to]) for (const right of lose[sq] || '') castle[right] = false;
  return { b, castle, turn: other(me), ep: m.double ? (m.from + m.to) / 2 : -1 };
}

export const legalMoves = (pos) => pseudo(pos).filter((m) => !inCheck(makeMove(pos, m), pos.turn));

/** Состояние партии после хода: 'play' | 'check' | 'mate' | 'stalemate'. */
export function status(pos) {
  const check = inCheck(pos, pos.turn);
  if (legalMoves(pos).length) return check ? 'check' : 'play';
  return check ? 'mate' : 'stalemate';
}

const LETTER = { n: 'К', b: 'С', r: 'Л', q: 'Ф', k: 'Кр', p: '' };
/** Запись хода в русской нотации: Кf3, e:d4, 0-0, e8Ф+ */
export function notation(pos, m) {
  const after = makeMove(pos, m), st = status(after);
  const suffix = st === 'mate' ? '#' : st === 'check' ? '+' : '';
  if (m.castle) return (m.castle === 'K' ? '0-0' : '0-0-0') + suffix;
  const type = m.piece.toLowerCase();
  const take = m.captured ? ':' : (type === 'p' ? '' : '');
  const from = type === 'p' && m.captured ? sqName(m.from)[0] : '';
  return `${LETTER[type]}${from}${take}${sqName(m.to)}${m.promo ? 'Ф' : ''}${suffix}`;
}

// ---- Оценка позиции и перебор ----
export const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Таблицы позиционных бонусов (с точки зрения белых, строка 0 — восьмая горизонталь)
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

/** Оценка в сантипешках с точки зрения стороны, которая ходит. */
export function evaluate(pos) {
  let score = 0;
  pos.b.forEach((p, i) => {
    if (!p) return;
    const type = p.toLowerCase(), white = colorOf(p) === 'w';
    const v = VALUE[type] + PST[type][white ? i : (7 - Math.floor(i / 8)) * 8 + (i % 8)];
    score += white ? v : -v;
  });
  return pos.turn === 'w' ? score : -score;
}

const MATE = 100000;
const gain = (m) => (m.captured ? VALUE[m.captured.toLowerCase()] * 10 - VALUE[m.piece.toLowerCase()] : 0) + (m.promo ? 8000 : 0);
const order = (moves) => moves.sort((a, c) => gain(c) - gain(a));

// Перебор только взятий, чтобы не обрывать расчёт посреди размена
function quiesce(pos, alpha, beta, depth = 0) {
  const stand = evaluate(pos);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (depth > 5) return alpha;
  for (const m of order(legalMoves(pos).filter((x) => x.captured || x.promo))) {
    const score = -quiesce(makeMove(pos, m), -beta, -alpha, depth + 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(pos, depth, alpha, beta, ply = 1) {
  const moves = legalMoves(pos);
  if (!moves.length) return inCheck(pos, pos.turn) ? -MATE + ply : 0;
  if (depth <= 0) return quiesce(pos, alpha, beta);
  for (const m of order(moves)) {
    const score = -search(makeMove(pos, m), depth - 1, -beta, -alpha, ply + 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

/** Оценка каждого хода позиции (лучшие первыми); score — для стороны, которая ходит. */
export function analyse(pos, depth = 2) {
  return order(legalMoves(pos))
    .map((m) => ({ ...m, score: -search(makeMove(pos, m), depth - 1, -MATE - 1, MATE + 1) }))
    .sort((a, c) => c.score - a.score);
}

export const isMateScore = (score) => Math.abs(score) > MATE - 1000;

/** Ход компьютера; noise — сколько сантипешек «шума» добавлять (чем больше, тем слабее игра). */
export function bestMove(pos, depth = 3, noise = 12) {
  const scored = analyse(pos, depth).map((m) => ({ ...m, pick: m.score + Math.random() * noise }));
  return scored.sort((a, c) => c.pick - a.pick)[0] ?? null;
}
