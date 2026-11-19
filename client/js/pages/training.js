import { getUser } from '../auth.js';
import { colorOf, inCheck, isMateScore, legalMoves, makeMove, notation, sqName, startPosition, status } from '../chess.js';
import { analyseAsync, moveAccuracy, winPercent } from '../engine.js';
import { pieceSVG } from '../pieces.js';
import { avatar, esc } from '../ui.js';

const LEVELS = {
  novice: { label: 'Новичок', noise: 260 },
  amateur: { label: 'Любитель', noise: 80 },
  master: { label: 'Кандидат в мастера', noise: 8 },
};

// Классы ходов — как в разборе партий на шахматных сайтах
const KINDS = {
  best: { label: 'Лучший ход', icon: '★' },
  excellent: { label: 'Отличный ход', icon: '!' },
  good: { label: 'Хороший ход', icon: '✓' },
  inaccuracy: { label: 'Неточность', icon: '?!' },
  mistake: { label: 'Ошибка', icon: '?' },
  blunder: { label: 'Зевок', icon: '??' },
};
const ACC = { p: 'пешку', n: 'коня', b: 'слона', r: 'ладью', q: 'ферзя', k: 'короля' };
const DAT = { p: 'пешке', n: 'коню', b: 'слону', r: 'ладье', q: 'ферзю', k: 'королю' };

const ROBOT = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="30" y="2" width="4" height="10" rx="2" fill="#111"/><circle cx="32" cy="4" r="4" fill="#c62828"/>
  <rect x="8" y="12" width="48" height="40" rx="14" fill="#111"/><rect x="14" y="20" width="36" height="20" rx="10" fill="#2b2b2b"/>
  <circle class="eye" cx="24" cy="30" r="4.5" fill="#6be3a8"/><circle class="eye" cx="40" cy="30" r="4.5" fill="#6be3a8"/>
  <rect x="24" y="44" width="16" height="3" rx="1.5" fill="#6b6b67"/><rect x="2" y="26" width="6" height="14" rx="3" fill="#111"/><rect x="56" y="26" width="6" height="14" rx="3" fill="#111"/></svg>`;

const sameMove = (a, b) => a.from === b.from && a.to === b.to;
const fmtEval = (cp) => (isMateScore(cp) ? `${cp > 0 ? '' : '−'}M` : `${cp > 0 ? '+' : cp < 0 ? '−' : ''}${(Math.abs(cp) / 100).toFixed(1)}`);

export function trainingPage(root) {
  const user = getUser();
  const s = {
    side: 'w', level: 'amateur', pos: startPosition(), history: [], selected: -1,
    analysis: null, busy: false, over: false, hint: 0, hints: 0, review: [], whiteEval: 0,
  };

  root.innerHTML = `
    <div class="page-head">
      <div><h1>Тренировка с роботом</h1><p>Сыграйте партию, а тренер Гамбит разберёт каждый ваш ход — как в разборе партий на шахматных сайтах.</p></div>
    </div>
    <div class="train">
      <div class="train-board">
        <div class="player-strip" id="strip-top"></div>
        <div class="board-row">
          <div class="evalbar" id="evalbar" aria-label="Оценка позиции"><div class="evalbar-fill"></div><span class="evalbar-num">0.0</span></div>
          <div class="board2d" id="board"><div class="b2-squares"></div><div class="b2-pieces"></div><svg class="b2-arrows" viewBox="0 0 8 8" aria-hidden="true">
            <defs><marker id="ah-good" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0 0 L3 1.5 L0 3 Z" fill="#1d9a5b"/></marker>
            <marker id="ah-bad" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0 0 L3 1.5 L0 3 Z" fill="#d83a2e"/></marker></defs></svg></div>
        </div>
        <div class="player-strip" id="strip-bottom"></div>
      </div>
      <aside class="coach">
        <div class="coach-head">
          <div class="robot">${ROBOT}</div>
          <div><b>Тренер Гамбит</b><small id="coach-state">готов к партии</small></div>
          <span class="eval-chip" id="eval-chip">0.0</span>
        </div>
        <div class="bubble" id="bubble"></div>
        <div class="setup" id="setup">
          <div class="seg-label">Играть</div>
          <div class="seg" data-name="side"><button data-v="w" class="on">Белыми</button><button data-v="b">Чёрными</button></div>
          <div class="seg-label">Соперник</div>
          <div class="seg" data-name="level">${Object.entries(LEVELS).map(([k, l]) => `<button data-v="${k}" class="${k === 'amateur' ? 'on' : ''}">${l.label}</button>`).join('')}</div>
          <button class="start" id="start">Начать партию</button>
        </div>
        <div class="coach-actions" id="actions" hidden>
          <button class="secondary" id="hint">Подсказка</button>
          <button class="secondary" id="undo">Вернуть ход</button>
          <button class="secondary" id="restart">Новая партия</button>
        </div>
        <div class="summary" id="summary" hidden></div>
        <ol class="review" id="review"></ol>
      </aside>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const boardEl = $('#board');
  const squaresEl = boardEl.querySelector('.b2-squares');
  const piecesEl = boardEl.querySelector('.b2-pieces');
  const arrowsEl = boardEl.querySelector('.b2-arrows');
  const alive = () => root.isConnected;

  // ---------- Доска ----------
  const view = (i) => (s.side === 'w' ? i : 63 - i); // клетка → позиция на экране
  const xy = (i) => [view(i) % 8, Math.floor(view(i) / 8)];

  function drawSquares() {
    squaresEl.innerHTML = '';
    for (let v = 0; v < 64; v++) {
      const i = s.side === 'w' ? v : 63 - v;
      const r = Math.floor(i / 8), f = i % 8;
      const sq = document.createElement('div');
      sq.className = `b2-sq ${(r + f) % 2 ? 'dark' : ''}`;
      sq.dataset.i = i;
      const name = sqName(i);
      if (v % 8 === 0) sq.insertAdjacentHTML('beforeend', `<span class="c-rank">${name[1]}</span>`);
      if (v >= 56) sq.insertAdjacentHTML('beforeend', `<span class="c-file">${name[0]}</span>`);
      squaresEl.append(sq);
    }
  }

  let nodes = [];
  function drawPieces() {
    piecesEl.innerHTML = '';
    nodes = s.pos.b.map((code, i) => {
      if (!code) return null;
      const n = document.createElement('div');
      n.className = `b2-piece ${colorOf(code)}`;
      n.dataset.i = i;
      n.innerHTML = pieceSVG(code.toLowerCase(), colorOf(code));
      const [x, y] = xy(i);
      n.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
      piecesEl.append(n);
      return n;
    });
  }

  function animate(m) {
    const color = colorOf(m.piece);
    const capAt = m.enPassant ? m.to + (color === 'w' ? 8 : -8) : m.to;
    if (nodes[capAt]) { nodes[capAt].classList.add('gone'); const dead = nodes[capAt]; setTimeout(() => dead.remove(), 250); nodes[capAt] = null; }
    const move = (from, to) => {
      const n = nodes[from]; nodes[from] = null; nodes[to] = n; n.dataset.i = to;
      const [x, y] = xy(to);
      n.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    };
    move(m.from, m.to);
    if (m.castle) { const [rf, rt] = m.castle === 'K' ? [m.from + 3, m.from + 1] : [m.from - 4, m.from - 1]; move(rf, rt); }
    if (m.promo) nodes[m.to].innerHTML = pieceSVG('q', color);
  }

  function mark({ selected = -1, targets = [] } = {}) {
    const last = s.history.at(-1)?.move;
    const king = inCheck(s.pos, s.pos.turn) ? s.pos.b.indexOf(s.pos.turn === 'w' ? 'K' : 'k') : -1;
    squaresEl.querySelectorAll('.b2-sq').forEach((sq) => {
      const i = Number(sq.dataset.i);
      sq.classList.toggle('last', !!last && (i === last.from || i === last.to));
      sq.classList.toggle('sel', i === selected);
      sq.classList.toggle('hint', s.hint === 1 && s.analysis && i === s.analysis[0].from);
      sq.classList.toggle('target', targets.includes(i) && !s.pos.b[i]);
      sq.classList.toggle('capture', targets.includes(i) && !!s.pos.b[i]);
      sq.classList.toggle('check', i === king);
    });
  }

  function arrows(list = []) {
    arrowsEl.querySelectorAll('line').forEach((l) => l.remove());
    list.forEach(({ from, to, kind }) => {
      const [x1, y1] = xy(from), [x2, y2] = xy(to);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1 + 0.5); line.setAttribute('y1', y1 + 0.5);
      line.setAttribute('x2', x2 + 0.5 - (dx / len) * 0.32); line.setAttribute('y2', y2 + 0.5 - (dy / len) * 0.32);
      line.setAttribute('class', kind);
      line.setAttribute('marker-end', `url(#ah-${kind})`);
      arrowsEl.append(line);
    });
  }

  // ---------- Тренер ----------
  function say(html, kind = null) {
    const k = kind && KINDS[kind];
    $('#bubble').innerHTML = `${k ? `<span class="kind ${kind}"><i>${k.icon}</i>${k.label}</span>` : ''}<p>${html}</p>`;
    $('#bubble').classList.remove('pop'); void $('#bubble').offsetWidth; $('#bubble').classList.add('pop');
  }
  const state = (text, thinking = false) => {
    $('#coach-state').textContent = text;
    root.querySelector('.robot').classList.toggle('thinking', thinking);
  };

  function setEval(cpWhite) {
    s.whiteEval = cpWhite;
    const pct = winPercent(cpWhite);
    const bar = $('#evalbar');
    bar.classList.toggle('flipped', s.side === 'b');
    bar.querySelector('.evalbar-fill').style.height = `${pct}%`;
    bar.querySelector('.evalbar-num').textContent = fmtEval(cpWhite).replace('+', '');
    bar.classList.toggle('black-better', cpWhite < 0);
    $('#eval-chip').textContent = fmtEval(cpWhite);
  }
  const toWhite = (score, pos) => (pos.turn === 'w' ? score : -score);

  function strips() {
    const bot = `<span class="avatar bot">${ROBOT}</span><span><b>Гамбит-бот</b><small>${LEVELS[s.level].label}</small></span>`;
    const me = `${avatar(user?.name ?? 'Вы')}<span><b>${esc(user?.name ?? 'Вы')}</b><small>${s.side === 'w' ? 'белые' : 'чёрные'}</small></span>`;
    $('#strip-top').innerHTML = bot;
    $('#strip-bottom').innerHTML = me;
  }

  function renderReview() {
    const rows = [];
    s.history.forEach((h, i) => {
      if (i % 2 === 0) rows.push([]);
      rows.at(-1).push(h);
    });
    $('#review').innerHTML = rows.map((pair, n) => `<li><span class="mn">${n + 1}.</span>${pair.map((h) => `
      <span class="rv ${h.kind ?? ''}" title="${h.kind ? KINDS[h.kind].label : ''}">${h.kind ? `<i>${KINDS[h.kind].icon}</i>` : ''}${h.san}</span>`).join('')}</li>`).join('');
    $('#review').scrollTop = $('#review').scrollHeight;
  }

  // ---------- Ход игры ----------
  function apply(move, extra = {}) {
    const san = notation(s.pos, move);
    animate(move);
    s.history.push({ san, move, before: s.pos, ...extra });
    s.pos = makeMove(s.pos, move);
    s.selected = -1; s.hint = 0;
    mark(); renderReview();
    return s.history.at(-1);
  }

  async function userTurn() {
    if (!alive()) return;
    state('ваш ход — я слежу', true);
    s.analysis = null;
    const pos = s.pos;
    const a = await analyseAsync(pos, 2);
    if (!alive() || pos !== s.pos) return;
    s.analysis = a;
    setEval(toWhite(a[0].score, pos));
    state('ваш ход');
  }

  function classify(lossWin, isBest) {
    if (isBest || lossWin <= 0.5) return 'best';
    if (lossWin <= 2) return 'excellent';
    if (lossWin <= 5) return 'good';
    if (lossWin <= 10) return 'inaccuracy';
    if (lossWin <= 20) return 'mistake';
    return 'blunder';
  }

  async function onUserMove(move) {
    s.busy = true;
    state('анализирую ваш ход…', true);
    const before = s.pos;
    const a = s.analysis ?? await analyseAsync(before, 2);
    const best = a[0];
    const mine = a.find((x) => sameMove(x, move) && !!x.promo === !!move.promo) ?? a.at(-1);
    const bestSan = notation(before, best);
    const wpBest = winPercent(best.score), wpMine = winPercent(mine.score);
    const kind = classify(wpBest - wpMine, sameMove(best, mine));
    const entry = apply(move, { kind, acc: moveAccuracy(wpBest, wpMine) });
    renderReview();

    const st = status(s.pos);
    if (st === 'mate' || st === 'stalemate') {
      say(st === 'mate' ? 'Мат! Отличная победа — посмотрите итоги партии ниже.' : 'Пат — ничья. Если у вас было преимущество, в следующий раз оставьте королю соперника свободную клетку.', kind);
      arrows([]);
      setEval(st === 'mate' ? (colorOf(move.piece) === 'w' ? 99999 : -99999) : 0);
      return finish();
    }

    const b = await analyseAsync(s.pos, 2); // ответы соперника
    if (!alive()) return;
    setEval(toWhite(b[0].score, s.pos));
    explain(entry, move, before, best, bestSan, b);

    // ход соперника с учётом уровня
    state('соперник думает…', true);
    const noise = LEVELS[s.level].noise;
    const reply = b.map((x) => ({ ...x, pick: x.score + Math.random() * noise })).sort((x, y) => y.pick - x.pick)[0];
    await new Promise((r) => setTimeout(r, 650));
    if (!alive() || s.over) return;
    apply(reply);
    const st2 = status(s.pos);
    if (st2 === 'mate') { say('Мат от бота. Ничего страшного — нажмите «Вернуть ход» и найдите защиту, или начните заново.', null); setEval(colorOf(reply.piece) === 'w' ? 99999 : -99999); return finish(); }
    if (st2 === 'stalemate') { say('Пат — ничья.', null); return finish(); }
    s.busy = false;
    await userTurn();
    if (st2 === 'check' && alive()) state('вам шах — защитите короля');
  }

  function explain(entry, move, before, best, bestSan, replies) {
    const kind = entry.kind, type = move.piece.toLowerCase(), ply = s.history.length;
    const after = s.pos, threat = replies[0];
    const list = [];
    if (['best', 'excellent', 'good'].includes(kind)) {
      let why;
      if (move.castle) why = 'Рокировка — король в безопасности, а ладья выходит в игру.';
      else if (move.captured) why = `Вы забрали ${ACC[move.captured.toLowerCase()]} — материальный перевес на вашей стороне.`;
      else if (inCheck(after, after.turn)) why = 'Шах! Вы перехватываете инициативу.';
      else if (ply <= 16 && 'nb'.includes(type) && [0, 7].includes(Math.floor(move.from / 8))) why = 'Развиваете лёгкие фигуры — главный принцип дебюта.';
      else if (type === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(sqName(move.to))) why = 'Пешка в центре контролирует ключевые клетки.';
      else why = kind === 'best' ? 'Это ход движка — точнее не сыграть.' : 'Сильный ход, движок почти согласен.';
      if (kind === 'good' && !sameMove(best, move)) { why += ` Чуть точнее было <b>${bestSan}</b>.`; list.push({ ...best, kind: 'good' }); }
      say(why, kind);
    } else {
      let why = `Лучше было <b>${bestSan}</b>.`;
      list.push({ ...best, kind: 'good' });
      if (threat && isMateScore(threat.score) && threat.score > 0) {
        why += ' После вашего хода у соперника есть мат — следите за королём!';
        list.push({ ...threat, kind: 'bad' });
      } else if (threat?.captured) {
        why += ` Соперник отвечает <b>${notation(after, threat)}</b> и забирает ${ACC[threat.captured.toLowerCase()]}.`;
        list.push({ ...threat, kind: 'bad' });
      } else if (isMateScore(best.score) && best.score > 0) {
        why += ' Здесь был мат — поищите шахи!';
      } else if (best.captured) {
        why += ` Этот ход выигрывал ${ACC[best.captured.toLowerCase()]}.`;
      } else {
        why += ' Позиция заметно ухудшилась — проверьте, какие фигуры остались без защиты.';
      }
      if (type === 'q' && ply <= 10) why += ' И не выводите ферзя слишком рано: лёгкие фигуры соперника будут гонять его с темпом.';
      say(why, kind);
    }
    arrows(list);
  }

  function finish() {
    s.over = true; s.busy = false;
    state('партия окончена');
    const mine = s.history.filter((h) => h.kind);
    const acc = mine.length ? Math.round(mine.reduce((sum, h) => sum + h.acc, 0) / mine.length) : 0;
    const count = (k) => mine.filter((h) => h.kind === k).length;
    $('#summary').hidden = false;
    $('#summary').innerHTML = `
      <div class="acc"><b>${acc}%</b><span>точность ваших ходов</span></div>
      <ul>${Object.entries(KINDS).map(([k, v]) => `<li class="${k}"><i>${v.icon}</i>${v.label}<b>${count(k)}</b></li>`).join('')}</ul>
      <p class="muted">Подсказок использовано: ${s.hints}</p>`;
    $('#hint').disabled = true;
  }

  // ---------- Управление ----------
  async function start() {
    Object.assign(s, { pos: startPosition(), history: [], selected: -1, analysis: null, busy: false, over: false, hint: 0, hints: 0 });
    $('#setup').hidden = true;
    $('#actions').hidden = false;
    $('#summary').hidden = true;
    $('#hint').disabled = false;
    drawSquares(); drawPieces(); mark(); arrows(); renderReview(); strips(); setEval(0);
    if (s.side === 'b') {
      say('Вы играете чёрными. Я сделаю первый ход за бота — а потом буду разбирать каждый ваш ход.');
      state('соперник думает…', true);
      const a = await analyseAsync(s.pos, 2);
      const opening = a.slice(0, 4)[Math.floor(Math.random() * 4)];
      await new Promise((r) => setTimeout(r, 500));
      if (!alive()) return;
      apply(opening);
    } else {
      say('Ваш ход белыми. Перетащите фигуру или нажмите на неё, а затем на клетку. После каждого хода я скажу, насколько он хорош.');
    }
    userTurn();
  }

  function tryMove(from, to) {
    const move = legalMoves(s.pos).find((m) => m.from === from && m.to === to);
    if (!move) return false;
    arrows([]);
    onUserMove(move);
    return true;
  }

  const canAct = () => !s.busy && !s.over && s.pos.turn === s.side && $('#setup').hidden;

  function select(i) {
    const own = legalMoves(s.pos).filter((m) => m.from === i);
    s.selected = own.length ? i : -1;
    mark({ selected: s.selected, targets: own.map((m) => m.to) });
  }

  // Нажатие и перетаскивание
  let drag = null;
  boardEl.addEventListener('pointerdown', (event) => {
    if (!canAct()) return;
    const sq = event.target.closest('[data-i]');
    if (!sq) return;
    const i = Number(sq.dataset.i);
    if (s.selected >= 0 && s.selected !== i && tryMove(s.selected, i)) return;
    if (s.pos.b[i] && colorOf(s.pos.b[i]) === s.side) {
      select(i);
      const node = nodes[i];
      const rect = boardEl.getBoundingClientRect();
      drag = { i, node, rect, moved: false };
      node.classList.add('dragging');
      boardEl.setPointerCapture(event.pointerId);
    } else {
      s.selected = -1; mark();
    }
  });
  boardEl.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { rect, node } = drag;
    const size = rect.width / 8;
    const x = (event.clientX - rect.left) / size - 0.5, y = (event.clientY - rect.top) / size - 0.5;
    drag.moved = true;
    node.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
  });
  boardEl.addEventListener('pointerup', (event) => {
    if (!drag) return;
    const { i, node, rect, moved } = drag;
    drag = null;
    node.classList.remove('dragging');
    const vx = Math.floor((event.clientX - rect.left) / (rect.width / 8));
    const vy = Math.floor((event.clientY - rect.top) / (rect.height / 8));
    const target = vx >= 0 && vx < 8 && vy >= 0 && vy < 8 ? (s.side === 'w' ? vy * 8 + vx : 63 - (vy * 8 + vx)) : -1;
    if (moved && target >= 0 && target !== i && tryMove(i, target)) return;
    const [x, y] = xy(i);
    node.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
  });

  root.querySelectorAll('.seg').forEach((seg) => seg.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    s[seg.dataset.name] = b.dataset.v;
    if (seg.dataset.name === 'side') { drawSquares(); drawPieces(); }
    strips();
  }));
  $('#start').addEventListener('click', start);
  $('#restart').addEventListener('click', () => {
    $('#setup').hidden = false; $('#actions').hidden = true; $('#summary').hidden = true;
    say('Выберите цвет и силу соперника — и начнём новую партию.');
    state('готов к партии');
  });
  $('#hint').addEventListener('click', () => {
    if (!canAct() || !s.analysis) return;
    const best = s.analysis[0];
    s.hints++;
    if (s.hint === 0) {
      s.hint = 1;
      mark();
      say(`Подсказка: присмотритесь к ${DAT[best.piece.toLowerCase()]} на ${sqName(best.from)}. Нажмите «Подсказка» ещё раз, чтобы увидеть ход.`);
    } else {
      s.hint = 2;
      mark();
      arrows([{ ...best, kind: 'good' }]);
      say(`Лучший ход — <b>${notation(s.pos, best)}</b>.`);
    }
  });
  $('#undo').addEventListener('click', () => {
    if (s.busy || s.history.length < 1) return;
    // откатываем до последнего хода игрока включительно
    let k = s.history.length - 1;
    while (k >= 0 && colorOf(s.history[k].move.piece) !== s.side) k--;
    if (k < 0) return;
    s.pos = s.history[k].before;
    s.history = s.history.slice(0, k);
    s.over = false; $('#summary').hidden = true; $('#hint').disabled = false;
    drawPieces(); mark(); arrows(); renderReview();
    say('Ход возвращён. Попробуйте найти вариант сильнее — подсказка поможет.');
    userTurn();
  });

  drawSquares(); drawPieces(); mark(); strips();
  say(`Привет${user ? `, ${esc(user.name.split(' ')[0])}` : ''}! Я тренер Гамбит. Выберите цвет и силу соперника — после каждого вашего хода я покажу, был ли он лучшим, и подскажу, где можно было сыграть сильнее.`);
}
