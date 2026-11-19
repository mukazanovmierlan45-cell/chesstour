// Партия на главном экране: показ Итальянской партии и игра человека против компьютера.
import { GAME, createBoard3d } from './board3d.js';
import { bestMove, legalMoves, makeMove, notation, sqIndex, startPosition, status } from './chess.js';

const HINT = 'Ваш ход белыми: нажмите на фигуру, затем на подсвеченную клетку.';

export function mountChess(root) {
  const board = createBoard3d(root.querySelector('#stage-board'));
  const statusEl = root.querySelector('#play-status');
  const movesEl = root.querySelector('#moves');
  const controls = root.querySelector('#play-controls');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = root.classList.contains('stage') ? root : root.querySelector('.stage');

  let mode = 'demo';
  let pos = startPosition();
  let history = []; // { san, before, move }
  let selected = -1;
  let thinking = false;
  let demoTimer = null;

  const alive = () => root.isConnected;
  const renderMoves = () => {
    movesEl.innerHTML = history.reduce((html, h, i) => html
      + (i % 2 === 0 ? `<li><span class="mn">${i / 2 + 1}.</span>` : '')
      + `<span class="mv played ${i === history.length - 1 ? 'current' : ''}">${h.san}</span>`
      + (i % 2 === 1 || i === history.length - 1 ? '</li>' : ''), '');
  };
  const kingInCheck = () => (['check', 'mate'].includes(status(pos)) ? pos.b.indexOf(pos.turn === 'w' ? 'K' : 'k') : -1);
  const lastMarks = () => {
    const last = history.at(-1)?.move;
    return { last: last ? [last.from, last.to] : [], check: kingInCheck() };
  };

  const setStatus = (text, tone = '') => {
    statusEl.textContent = text;
    statusEl.className = `play-status ${tone}`;
  };

  const renderControls = () => {
    controls.innerHTML = mode === 'demo'
      ? '<button class="pill light" data-act="play">Сыграть самому</button>'
      : `<button class="btn light" data-act="new">Новая партия</button>
         <button class="btn ghost" data-act="undo" ${history.length < 2 || thinking ? 'disabled' : ''}>Отменить ход</button>
         <button class="btn ghost" data-act="demo">Смотреть показ</button>`;
  };
  controls.addEventListener('click', (event) => {
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (act === 'play' || act === 'new') startGame();
    if (act === 'undo') undo();
    if (act === 'demo') startDemo();
  });

  // ---------- Показ ----------
  function startDemo() {
    mode = 'demo';
    clearInterval(demoTimer);
    pos = startPosition(); history = []; selected = -1; thinking = false;
    board.setPosition(pos.b); board.mark(); renderMoves(); renderControls();
    stage.classList.remove('playing');
    setStatus('Итальянская партия разыгрывается сама — или нажмите на доску и сыграйте с компьютером.');
    if (reduced) return;
    let i = 0;
    demoTimer = setInterval(() => {
      if (!alive() || mode !== 'demo') return clearInterval(demoTimer);
      if (i >= GAME.length) {
        i = 0;
        board.fade(true);
        setTimeout(() => {
          if (mode !== 'demo') return;
          pos = startPosition(); history = [];
          board.setPosition(pos.b); board.mark(); renderMoves(); board.fade(false);
        }, 600);
        return;
      }
      const [from, to] = GAME[i++];
      const move = legalMoves(pos).find((m) => m.from === sqIndex(from) && m.to === sqIndex(to));
      apply(move);
    }, 1500);
  }

  // ---------- Игра ----------
  function startGame() {
    mode = 'play';
    clearInterval(demoTimer);
    board.fade(false);
    pos = startPosition(); history = []; selected = -1; thinking = false;
    board.setPosition(pos.b); board.mark(); renderMoves(); renderControls();
    stage.classList.add('playing');
    setStatus(HINT);
  }

  function apply(move) {
    history.push({ san: notation(pos, move), before: pos, move });
    board.playMove(move);
    pos = makeMove(pos, move);
    renderMoves();
    board.mark(lastMarks());
  }

  function afterMove() {
    const st = status(pos);
    if (st === 'mate') return finish(pos.turn === 'b' ? 'Мат! Вы победили компьютер.' : 'Мат — победили чёрные. Попробуйте ещё раз.', pos.turn === 'b' ? 'win' : 'lose');
    if (st === 'stalemate') return finish('Пат — ничья.', '');
    if (pos.turn === 'b') {
      thinking = true; renderControls();
      setStatus('Соперник думает…');
      setTimeout(() => {
        if (!alive() || mode !== 'play') return;
        apply(bestMove(pos, 2, 15));
        thinking = false; renderControls();
        afterMove();
      }, 500);
    } else {
      setStatus(st === 'check' ? 'Шах! Защитите короля.' : HINT, st === 'check' ? 'lose' : '');
    }
  }

  function finish(text, tone) {
    thinking = false;
    setStatus(text, tone);
    renderControls();
  }

  function undo() {
    if (thinking || history.length < 2) return;
    // откатываем свой ход и ответ компьютера
    const steps = pos.turn === 'w' ? 2 : 1;
    pos = history[history.length - steps].before;
    history = history.slice(0, -steps);
    selected = -1;
    board.setPosition(pos.b);
    board.mark(lastMarks());
    renderMoves(); renderControls();
    setStatus(HINT);
  }

  board.onSquare((stack) => {
    if (mode === 'demo') { startGame(); return; }
    if (thinking || pos.turn !== 'w' || ['mate', 'stalemate'].includes(status(pos))) return;
    const moves = legalMoves(pos);
    if (selected >= 0) {
      // ход на любую подходящую клетку под курсором, даже если её заслоняет фигура
      const move = stack.map((i) => moves.find((m) => m.from === selected && m.to === i)).find(Boolean);
      if (move) {
        selected = -1;
        apply(move);
        renderControls();
        afterMove();
        return;
      }
    }
    // выбираем ближайшую к зрителю свою фигуру, у которой есть ходы
    const i = stack.find((k) => k !== selected && moves.some((m) => m.from === k)) ?? stack[0];
    const own = moves.filter((m) => m.from === i);
    if (own.length && i !== selected) {
      selected = i;
      board.mark({
        ...lastMarks(), selected: i,
        targets: own.map((m) => m.to),
        captures: own.filter((m) => m.captured).map((m) => m.to),
      });
    } else {
      selected = -1;
      board.mark(lastMarks());
      if (pos.b[i] && i !== selected) setStatus(pos.b[i] === pos.b[i].toUpperCase() ? 'У этой фигуры сейчас нет ходов.' : 'Это фигура соперника — вы играете белыми.');
    }
  });

  startDemo();
}
