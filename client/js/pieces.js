// Объёмные фигуры в SVG: силуэт строится из полупрофиля (как на токарном станке),
// цилиндрическую светотень даёт горизонтальный градиент, шары — радиальный.
// Градиенты #pw/#pb/#sw/#sb объявлены один раз в index.html.

const BASE = [[30, 168], [33, 174], [33, 180], [38, 184], [38, 193]];

const SHAPES = {
  p: { half: [[10, 86], [9, 92], [20, 96], [22, 100], [12, 104], [13, 130], [18, 154], [26, 164]], spheres: [[50, 70, 18]] },
  b: {
    half: [[4, 24], [12, 32], [19, 46], [21, 60], [17, 74], [10, 82], [20, 86], [22, 90], [11, 94], [12, 128], [17, 152], [26, 164]],
    spheres: [[50, 17, 7]], slit: 'M57 40 L45 57',
  },
  r: { half: [[6, 40], [6, 28], [16, 28], [16, 40], [20, 40], [20, 28], [31, 28], [31, 54], [22, 62], [19, 138], [22, 154], [28, 164]] },
  q: {
    half: [[6, 30], [12, 46], [18, 30], [22, 50], [31, 34], [27, 64], [20, 76], [27, 82], [27, 88], [14, 92], [14, 128], [19, 152], [27, 164]],
    spheres: [[50, 20, 7], [32, 28, 3.5], [68, 28, 3.5], [19, 33, 3.5], [81, 33, 3.5]],
  },
  k: {
    half: [[8, 44], [20, 44], [28, 50], [26, 64], [19, 78], [27, 84], [27, 90], [14, 94], [15, 128], [20, 152], [27, 164]],
    cross: true,
  },
  n: {
    path: 'M30 170 C30 150 34 132 42 118 C36 116 26 112 20 106 C14 100 12 92 16 86 C20 80 30 74 40 72 C40 64 42 56 48 50 L46 34 L57 45 C71 48 83 58 87 77 C93 101 87 132 81 150 C79 158 77 164 76 170 Z',
    eye: [44, 66],
  },
};

const half = (pts) => {
  const left = pts.map(([w, y]) => `${50 - w} ${y}`);
  const right = pts.slice().reverse().map(([w, y]) => `${50 + w} ${y}`);
  return `M${left.join(' L')} L${right.join(' L')} Z`;
};

/** SVG-строка фигуры: type — p n b r q k, color — 'w' | 'b'. */
export function pieceSVG(type, color, extra = '') {
  const s = SHAPES[type];
  const fill = color === 'w' ? 'url(#pw)' : 'url(#pb)';
  const sphere = color === 'w' ? 'url(#sw)' : 'url(#sb)';
  const line = color === 'w' ? '#9b9b98' : '#4a4a4a';
  let body = '';

  if (s.path) {
    body += `<path d="${s.path}" fill="${fill}" stroke="${line}" stroke-width=".8"/>`;
    body += `<path d="M50 52 C62 56 74 70 76 92" fill="none" stroke="${color === 'w' ? '#fff' : '#6b6b6b'}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    body += `<ellipse cx="${s.eye[0]}" cy="${s.eye[1]}" rx="3" ry="2.2" fill="${color === 'w' ? '#3a3a3a' : '#9a9a9a'}"/>`;
    body += `<circle cx="21" cy="93" r="1.8" fill="${color === 'w' ? '#6d6d6b' : '#777'}"/>`;
    body += `<path d="${half(BASE)}" fill="${fill}" stroke="${line}" stroke-width=".8"/>`;
  } else {
    body += `<path d="${half([...s.half, ...BASE])}" fill="${fill}" stroke="${line}" stroke-width=".8" stroke-linejoin="round"/>`;
  }
  if (s.cross) {
    body += `<rect x="46" y="6" width="8" height="38" rx="2" fill="${fill}" stroke="${line}" stroke-width=".8"/>`;
    body += `<rect x="38" y="16" width="24" height="8" rx="2" fill="${fill}" stroke="${line}" stroke-width=".8"/>`;
  }
  (s.spheres || []).filter(([, , r]) => r > 0).forEach(([cx, cy, r]) => {
    body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${sphere}"/>`;
  });
  if (s.slit) body += `<path d="${s.slit}" stroke="${color === 'w' ? '#8d8d8a' : '#000'}" stroke-width="2.4" stroke-linecap="round"/>`;
  // красное сукно на подошве
  body += '<rect x="13" y="191" width="74" height="6" rx="3" fill="#c62828"/>';

  return `<svg class="piece-svg" viewBox="0 0 100 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true" ${extra}>${body}</svg>`;
}

/** Определения градиентов — вставляются в страницу один раз. */
export const PIECE_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="pw" x1="0" x2="1"><stop offset="0" stop-color="#a9a9a6"/><stop offset=".22" stop-color="#f3f3f1"/><stop offset=".36" stop-color="#ffffff"/><stop offset=".7" stop-color="#dcdcd9"/><stop offset="1" stop-color="#8f8f8c"/></linearGradient>
    <linearGradient id="pb" x1="0" x2="1"><stop offset="0" stop-color="#050505"/><stop offset=".24" stop-color="#3b3b3b"/><stop offset=".36" stop-color="#5e5e5e"/><stop offset=".62" stop-color="#1b1b1b"/><stop offset="1" stop-color="#030303"/></linearGradient>
    <radialGradient id="sw" cx=".36" cy=".32" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e6e6e3"/><stop offset="1" stop-color="#9c9c99"/></radialGradient>
    <radialGradient id="sb" cx=".36" cy=".32" r=".8"><stop offset="0" stop-color="#6e6e6e"/><stop offset=".45" stop-color="#262626"/><stop offset="1" stop-color="#030303"/></radialGradient>
  </defs>
</svg>`;
