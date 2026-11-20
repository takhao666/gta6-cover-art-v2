// Vice City Nights — the cover engine. Pure canvas drawing: layouts, grades,
// lettering, grain and vignette. No DOM, no network; the editor in main.js
// owns the state and this module turns a state into a cover at any size.

export const LAYOUTS = [
  { id: 'grid4', name: 'Four Panel Grid' },
  { id: 'hero3', name: 'Hero And Three' },
  { id: 'bleed', name: 'Full Bleed' },
  { id: 'tilted', name: 'Tilted Snapshots' },
  { id: 'nine', name: 'Nine Panel' },
  { id: 'duo', name: 'Split Duo' },
];

export const GRADES = [
  { id: 'sunset', name: 'Sunset' },
  { id: 'neon', name: 'Neon Nights' },
  { id: 'pink', name: 'Vice Pink' },
  { id: 'noir', name: 'Noir' },
  { id: 'original', name: 'Original' },
];

export const TITLE_FONTS = [
  { id: 'anton', name: 'Anton', family: 'Anton' },
  { id: 'bebas', name: 'Bebas Neue', family: '"Bebas Neue"' },
  { id: 'pacifico', name: 'Pacifico', family: 'Pacifico' },
];

export const TITLE_COLORS = [
  { id: 'white', name: 'White', value: '#ffffff' },
  { id: 'sunset', name: 'Sunset', value: 'gradient' },
  { id: 'pink', name: 'Hot Pink', value: '#ff2e88' },
  { id: 'gold', name: 'Gold', value: '#ffc93c' },
  { id: 'cyan', name: 'Neon Cyan', value: '#39d5ff' },
];

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, name: 'Square 1080 x 1080' },
  { id: '1080x1350', w: 1080, h: 1350, name: 'Portrait 1080 x 1350' },
  { id: '1920x1080', w: 1920, h: 1080, name: 'Wide 1920 x 1080' },
];

/** A tiny deterministic PRNG (mulberry32) so preview and export grain match. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Geometry for a layout at W x H. Returns panels (each {x,y,w,h,rot,border}),
 * a title band ({x,y,w,h} or null), where the title goes ('band' | 'top' |
 * 'overlay') and whether a sunset sky is painted behind the panels.
 */
export function layoutPanels(layout, w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.016));
  const bandH = Math.round(h * 0.2);
  const topH = h - bandH - g;
  const band = { x: 0, y: h - bandH, w, h: bandH };
  switch (layout) {
    case 'grid4': {
      const pw = (w - g) / 2;
      const ph = (topH - g) / 2;
      return {
        panels: [
          { x: 0, y: 0, w: pw, h: ph, rot: 0 },
          { x: pw + g, y: 0, w: pw, h: ph, rot: 0 },
          { x: 0, y: ph + g, w: pw, h: ph, rot: 0 },
          { x: pw + g, y: ph + g, w: pw, h: ph, rot: 0 },
        ],
        band, titleAt: 'band', sky: false,
      };
    }
    case 'hero3': {
      const heroW = Math.round(w * 0.6);
      const sideX = heroW + g;
      const sideW = w - sideX;
      const sh = (topH - 2 * g) / 3;
      return {
        panels: [
          { x: 0, y: 0, w: heroW, h: topH, rot: 0 },
          { x: sideX, y: 0, w: sideW, h: sh, rot: 0 },
          { x: sideX, y: sh + g, w: sideW, h: sh, rot: 0 },
          { x: sideX, y: 2 * (sh + g), w: sideW, h: sh, rot: 0 },
        ],
        band, titleAt: 'band', sky: false,
      };
    }
    case 'bleed':
      return { panels: [{ x: 0, y: 0, w, h, rot: 0 }], band: null, titleAt: 'overlay', sky: false };
    case 'tilted': {
      const cw = Math.round(w * 0.42);
      const ch = Math.round(h * 0.44);
      const cy = Math.round(h * 0.26);
      return {
        panels: [
          { x: Math.round(w * 0.03), y: cy, w: cw, h: ch, rot: -0.11, border: true },
          { x: Math.round(w * 0.5) - Math.round(cw / 2), y: cy + Math.round(h * 0.1), w: cw, h: ch, rot: 0.05, border: true },
          { x: Math.round(w * 0.97) - cw, y: cy - Math.round(h * 0.02), w: cw, h: ch, rot: 0.13, border: true },
        ],
        band: { x: 0, y: 0, w, h: Math.round(h * 0.17) },
        titleAt: 'top', sky: true,
      };
    }
    case 'nine': {
      const pw = (w - 2 * g) / 3;
      const ph = (topH - 2 * g) / 3;
      const panels = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          panels.push({ x: c * (pw + g), y: r * (ph + g), w: pw, h: ph, rot: 0 });
        }
      }
      return { panels, band, titleAt: 'band', sky: false };
    }
    case 'duo': {
      const leftW = Math.round(w * 0.55);
      return {
        panels: [
          { x: 0, y: 0, w: leftW, h: topH, rot: 0 },
          { x: leftW + g, y: 0, w: w - leftW - g, h: topH, rot: 0 },
        ],
        band, titleAt: 'band', sky: false,
      };
    }
    default:
      return layoutPanels('grid4', w, h);
  }
}

/** Which panel (index) contains point (x, y) in cover space, or -1. */
export function panelAt(layout, x, y, w, h) {
  const { panels } = layoutPanels(layout, w, h);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function drawPhoto(ctx, img, panel, crop, noir) {
  const zoom = crop?.zoom ?? 1;
  const dx = crop?.dx ?? 0;
  const dy = crop?.dy ?? 0;
  const base = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight);
  const scale = base * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const ox = (pw - panel.w) / 2;
  const oy = (ph - panel.h) / 2;
  const x = panel.x + (panel.w - pw) / 2 + dx * ox;
  const y = panel.y + (panel.h - ph) / 2 + dy * oy;
  if (noir) ctx.filter = 'grayscale(1) contrast(1.12) brightness(0.94)';
  ctx.drawImage(img, x, y, pw, ph);
  if (noir) ctx.filter = 'none';
}

function drawPanel(ctx, img, panel, crop, noir) {
  const border = panel.border ? Math.max(6, Math.round(Math.min(panel.w, panel.h) * 0.035)) : 0;
  ctx.save();
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h / 2;
  ctx.translate(cx, cy);
  if (panel.rot) ctx.rotate(panel.rot);
  if (border) {
    ctx.fillStyle = '#fdf8ef';
    ctx.shadowColor = 'rgba(10, 0, 25, 0.55)';
    ctx.shadowBlur = Math.round(Math.min(panel.w, panel.h) * 0.05);
    ctx.shadowOffsetY = Math.round(Math.min(panel.w, panel.h) * 0.02);
    ctx.fillRect(-panel.w / 2 - border, -panel.h / 2 - border, panel.w + 2 * border, panel.h + 2 * border);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.beginPath();
  ctx.rect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  ctx.clip();
  if (img) {
    drawPhoto(ctx, img, { x: -panel.w / 2, y: -panel.h / 2, w: panel.w, h: panel.h }, crop, noir);
  } else {
    const grad = ctx.createLinearGradient(0, -panel.h / 2, 0, panel.h / 2);
    grad.addColorStop(0, '#3a1c5c');
    grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad;
    ctx.fillRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  }
  ctx.restore();
}

function drawSky(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1b0b3b');
  sky.addColorStop(0.35, '#7a1e6e');
  sky.addColorStop(0.62, '#e8446e');
  sky.addColorStop(0.8, '#ff8a3d');
  sky.addColorStop(1, '#ffc93c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Low sun with a soft halo, peeking above the middle snapshot.
  const sunX = w * 0.5;
  const sunY = h * 0.3;
  const sunR = Math.min(w, h) * 0.1;
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  halo.addColorStop(0, 'rgba(255, 220, 140, 0.55)');
  halo.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Warm horizon glow, then a distant skyline silhouette.
  const horizon = ctx.createLinearGradient(0, h * 0.78, 0, h * 0.92);
  horizon.addColorStop(0, 'rgba(255, 140, 80, 0)');
  horizon.addColorStop(1, 'rgba(255, 140, 80, 0.35)');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, h * 0.78, w, h * 0.14);
  ctx.fillStyle = 'rgba(26, 8, 44, 0.9)';
  const base = h * 0.9;
  let x = -w * 0.01;
  const rnd = seededRandom(20261120);
  while (x < w) {
    const bw = w * (0.025 + rnd() * 0.05);
    const bh = h * (0.03 + rnd() * 0.07);
    ctx.fillRect(x, base - bh, bw, bh + h - base);
    if (rnd() > 0.6) ctx.fillRect(x + bw / 2 - 1, base - bh - h * 0.02, 2, h * 0.02);
    x += bw + w * 0.008;
  }
  ctx.fillRect(0, base, w, h - base);
}

function applyGrade(ctx, grade, w, h) {
  const wash = (stops, mode, alpha) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
  if (grade === 'sunset') {
    wash([[0, 'rgba(255, 170, 60, 0.9)'], [0.55, 'rgba(255, 90, 90, 0.7)'], [1, 'rgba(200, 30, 130, 0.9)']], 'soft-light', 0.85);
    wash([[0.6, 'rgba(255, 45, 120, 0)'], [1, 'rgba(255, 45, 120, 0.55)']], 'source-over', 0.35);
  } else if (grade === 'neon') {
    wash([[0, 'rgba(57, 213, 255, 0.9)'], [0.5, 'rgba(255, 46, 136, 0.55)'], [1, 'rgba(255, 46, 136, 0.95)']], 'overlay', 0.55);
    wash([[0, 'rgba(20, 0, 50, 0)'], [1, 'rgba(20, 0, 50, 0.5)']], 'source-over', 0.4);
  } else if (grade === 'pink') {
    wash([[0, 'rgba(255, 46, 136, 0.85)'], [1, 'rgba(255, 120, 200, 0.85)']], 'soft-light', 0.9);
    wash([[0.55, 'rgba(255, 46, 136, 0)'], [1, 'rgba(255, 46, 136, 0.5)']], 'source-over', 0.3);
  } else if (grade === 'noir') {
    wash([[0, 'rgba(10, 10, 30, 0.25)'], [1, 'rgba(10, 10, 30, 0.45)']], 'source-over', 0.5);
  }
  // Warm top light on every grade except noir/original.
  if (grade === 'sunset' || grade === 'neon' || grade === 'pink') {
    const glow = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, w * 0.7);
    glow.addColorStop(0, 'rgba(255, 200, 120, 0.14)');
    glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
}

function addGrainAndVignette(ctx, w, h, seed) {
  const rnd = seededRandom(seed);
  const count = Math.round((w * h) / 700);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.03 + rnd() * 0.05})` : `rgba(0,0,0,${0.03 + rnd() * 0.06})`;
    const s = 1 + Math.floor(rnd() * 2);
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(12, 0, 28, 0)');
  vig.addColorStop(1, 'rgba(12, 0, 28, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function fitFont(ctx, text, family, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawLettering(ctx, state, area, w, h) {
  const title = (state.title || '').trim();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const fontDef = TITLE_FONTS.find((f) => f.id === state.titleFont) ?? TITLE_FONTS[0];
  const colorDef = TITLE_COLORS.find((c) => c.id === state.titleColor) ?? TITLE_COLORS[0];
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((state.tilt ?? -2) * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hasSub = subtitle.length > 0;
  const titleSize = fitFont(
    ctx, title.toUpperCase(), fontDef.family, area.w * 0.94,
    Math.min(area.h * (hasSub ? 0.52 : 0.68), (state.titleSize ?? 100) * (area.h / 200)),
  );
  const titleY = hasSub ? -area.h * 0.14 : 0;
  if (title) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = titleSize * 0.14;
    ctx.shadowOffsetY = titleSize * 0.05;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, titleSize * 0.07);
    ctx.strokeStyle = 'rgba(22, 6, 34, 0.95)';
    ctx.font = `${titleSize}px ${fontDef.family}`;
    ctx.strokeText(title.toUpperCase(), 0, titleY);
    if (colorDef.value === 'gradient') {
      const grad = ctx.createLinearGradient(-area.w / 2, 0, area.w / 2, 0);
      grad.addColorStop(0, '#ff2e88');
      grad.addColorStop(0.5, '#ff8a3d');
      grad.addColorStop(1, '#ffc93c');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = colorDef.value;
    }
    ctx.fillText(title.toUpperCase(), 0, titleY);
    ctx.restore();
  }
  if (hasSub) {
    const subSize = fitFont(ctx, subtitle, 'Pacifico', area.w * 0.8, area.h * 0.26);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = subSize * 0.2;
    ctx.shadowOffsetY = subSize * 0.06;
    ctx.font = `${subSize}px Pacifico`;
    ctx.fillStyle = state.titleColor === 'pink' ? '#ffc93c' : '#ff7ab8';
    ctx.fillText(subtitle, 0, area.h * 0.3);
    ctx.restore();
  }
  ctx.restore();
}

function drawTitleBand(ctx, state, band, w, h) {
  const grad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  grad.addColorStop(0, '#1d0b33');
  grad.addColorStop(1, '#12081f');
  ctx.fillStyle = grad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  const edge = ctx.createLinearGradient(band.x, 0, band.x + band.w, 0);
  edge.addColorStop(0, '#ff2e88');
  edge.addColorStop(0.5, '#ff8a3d');
  edge.addColorStop(1, '#39d5ff');
  ctx.fillStyle = edge;
  ctx.fillRect(band.x, band.y, band.w, Math.max(3, h * 0.004));
  drawLettering(ctx, state, { x: band.x + band.w * 0.06, y: band.y + band.h * 0.06, w: band.w * 0.88, h: band.h * 0.88 }, w, h);
  // Heat meter: gold stars at the band's right edge.
  const stars = state.stars ?? 0;
  if (stars > 0) {
    ctx.save();
    ctx.font = `${Math.round(band.h * 0.22)}px Anton`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffc93c';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('★'.repeat(stars) + '☆'.repeat(5 - stars), band.x + band.w - band.w * 0.03, band.y + band.h * 0.86);
    ctx.restore();
  }
}

function drawBadgeRibbon(ctx, w, h) {
  const text = 'VICE CITY NIGHTS';
  const size = Math.round(Math.min(w, h) * 0.026);
  const bandH = size * 1.7;
  const half = w * 0.16;
  const offset = Math.min(w, h) * 0.085;
  ctx.save();
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(-half, offset - bandH / 2, 2 * half, bandH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px Anton`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, offset);
  ctx.restore();
}

/**
 * Draws the whole cover for `state` onto `ctx` at W x H.
 * state.photos: array of HTMLImageElements (or nulls).
 * state.assignments: per panel {photo, zoom, dx, dy}; panel i uses
 * assignments[i] in 'each' fill mode, assignments[0] in 'one' fill mode.
 */
export function drawCover(ctx, state, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, 0, w, h);
  const geo = layoutPanels(state.layout, w, h);
  if (geo.sky) drawSky(ctx, w, h);
  const noir = state.grade === 'noir';
  const photos = state.photos ?? [];
  geo.panels.forEach((panel, i) => {
    const crop = state.fillMode === 'one'
      ? state.assignments?.[0]
      : state.assignments?.[i] ?? state.assignments?.[0];
    const photoIndex = crop?.photo ?? 0;
    const img = photos[photoIndex] ?? photos[0] ?? null;
    drawPanel(ctx, img, panel, crop, noir);
  });
  applyGrade(ctx, state.grade, w, h);
  const seed = hashText(`${state.title}|${state.subtitle}|${state.layout}|${state.grade}`);
  addGrainAndVignette(ctx, w, h, seed);
  if (geo.titleAt === 'band' && geo.band) {
    drawTitleBand(ctx, state, geo.band, w, h);
  } else if (geo.titleAt === 'top' && geo.band) {
    drawLettering(ctx, state, { x: geo.band.x + w * 0.05, y: geo.band.y + h * 0.01, w: w * 0.9, h: geo.band.h }, w, h);
  } else if (geo.titleAt === 'overlay') {
    const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h);
    scrim.addColorStop(0, 'rgba(10, 2, 22, 0)');
    scrim.addColorStop(1, 'rgba(10, 2, 22, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    drawLettering(ctx, state, { x: w * 0.05, y: h * 0.74, w: w * 0.9, h: h * 0.22 }, w, h);
  }
  if (state.badge) drawBadgeRibbon(ctx, w, h);
}

/** Builds an offscreen canvas of the cover at an export size. */
export function renderCoverCanvas(state, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), state, size.w, size.h);
  return canvas;
}
