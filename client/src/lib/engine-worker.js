// Фоновый поток: считает варианты, не подвешивая интерфейс.
import { analyse } from './chess.js';

self.onmessage = ({ data }) => {
  const { id, pos, depth } = data;
  self.postMessage({ id, result: analyse(pos, depth) });
};
