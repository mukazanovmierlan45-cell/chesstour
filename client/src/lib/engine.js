// Обёртка над движком: расчёт в Web Worker, а если он недоступен — в основном потоке.
import { analyse } from './chess.js';

let worker = null;
let seq = 0;
const pending = new Map();

try {
  worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    pending.get(data.id)?.resolve(data.result);
    pending.delete(data.id);
  };
  // если поток не запустился — досчитываем ожидающие запросы в основном потоке
  worker.onerror = () => {
    worker = null;
    pending.forEach(({ resolve, pos, depth }) => resolve(analyse(pos, depth)));
    pending.clear();
  };
} catch {
  worker = null;
}

/** Все ходы позиции с оценками, лучшие первыми. */
export function analyseAsync(pos, depth = 2) {
  if (!worker) return new Promise((resolve) => setTimeout(() => resolve(analyse(pos, depth)), 0));
  return new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, { resolve, pos, depth });
    worker.postMessage({ id, pos, depth });
  });
}

/** Вероятность выигрыша (0–100) по оценке в сантипешках — та же формула, что у Lichess. */
export const winPercent = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-3000, Math.min(3000, cp)))) - 1);

/** Точность хода (0–100) по падению вероятности выигрыша. */
export const moveAccuracy = (before, after) =>
  Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, before - after)) - 3.1669));
