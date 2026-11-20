// Vice City Nights — the editor. Wires the controls to the cover engine:
// photos (upload or samples), layouts, grades, lettering, per-panel crop,
// 60-step undo/redo, live preview and PNG export in the three post sizes.
// Photos are read on this machine and never leave it.
import { drawCover, renderCoverCanvas, panelAt, layoutPanels, EXPORT_SIZES, LAYOUTS, GRADES, TITLE_FONTS, TITLE_COLORS } from './cover.js';
import { defaultState, snapshotState, restoreState, History } from './state.js';
import { runShot } from './shots.js';

const state = defaultState();
state.photos = [];
const history = new History(60);

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

let shotCoverMode = false;

function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.exportSize) ?? EXPORT_SIZES[0];
}

function sizePreview() {
  const size = currentSize();
  const scale = size.w >= size.h ? 900 / size.w : 900 / size.h;
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
}

function redraw() {
  if (shotCoverMode) {
    const size = currentSize();
    canvas.width = size.w;
    canvas.height = size.h;
  } else {
    sizePreview();
  }
  drawCover(ctx, state, canvas.width, canvas.height);
  syncControls();
  undoBtn.disabled = !history.canUndo;
  redoBtn.disabled = !history.canRedo;
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function loadSample(name) {
  return loadImage(`samples/${name}.jpg`);
}

// --- history: arm before a continuous edit, commit when it ends ---------

let armedSnap = null;
function armEdit() {
  if (!armedSnap) armedSnap = snapshotState(state);
}
function disarmEdit() {
  if (!armedSnap) return;
  if (JSON.stringify(armedSnap) !== JSON.stringify(snapshotState(state))) history.push(armedSnap);
  armedSnap = null;
  redraw();
}
function commitBefore() {
  history.push(snapshotState(state));
}

// --- photos --------------------------------------------------------------

const photoInput = document.getElementById('photos');
const panelPhotoSelect = document.getElementById('panel-photo');

function refreshPhotoOptions() {
  panelPhotoSelect.innerHTML = '';
  state.photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name || `Photo ${i + 1}`;
    panelPhotoSelect.appendChild(opt);
  });
  const crop = state.assignments[state.selectedPanel] ?? state.assignments[0];
  panelPhotoSelect.value = String(crop?.photo ?? 0);
}

function addPhotos(images) {
  commitBefore();
  for (const img of images) state.photos.push(img);
  if (state.fillMode === 'each') spreadPhotos();
  refreshPhotoOptions();
  redraw();
  setStatus(`${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded — click a panel to crop it.`);
}

function spreadPhotos() {
  const n = Math.max(1, state.photos.length);
  state.assignments.forEach((a, i) => { a.photo = i % n; });
}

photoInput.addEventListener('change', async (e) => {
  const files = [...(e.target.files ?? [])];
  if (!files.length) return;
  const images = [];
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      img.name = file.name;
      images.push(img);
    } catch {
      setStatus(`Could not read ${file.name} — try a JPG or PNG.`);
    }
  }
  if (images.length) addPhotos(images);
  photoInput.value = '';
});

for (const name of ['pier', 'boulevard']) {
  document.getElementById(`sample-${name}`).addEventListener('click', async () => {
    try {
      const img = await loadSample(name);
      img.name = `${name} (sample)`;
      commitBefore();
      state.photos = [img];
      if (state.fillMode === 'each') spreadPhotos();
      refreshPhotoOptions();
      redraw();
      setStatus(`Sample photo “${name}” loaded. Add your own photos any time.`);
    } catch {
      setStatus('Sample photo failed to load.');
    }
  });
}

document.getElementById('clear-photos').addEventListener('click', () => {
  if (!state.photos.length) return;
  commitBefore();
  state.photos = [];
  refreshPhotoOptions();
  redraw();
  setStatus('Photos cleared.');
});

document.getElementById('fill-one').addEventListener('change', () => {
  commitBefore();
  state.fillMode = 'one';
  redraw();
});
document.getElementById('fill-each').addEventListener('change', () => {
  commitBefore();
  state.fillMode = 'each';
  spreadPhotos();
  redraw();
});

panelPhotoSelect.addEventListener('change', () => {
  commitBefore();
  const crop = state.assignments[state.selectedPanel] ?? state.assignments[0];
  crop.photo = Number(panelPhotoSelect.value);
  redraw();
});

// --- layout and grade ----------------------------------------------------

function buildChoiceButtons(containerId, items, current, onPick) {
  const box = document.getElementById(containerId);
  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.id = item.id;
    btn.textContent = item.name;
    btn.addEventListener('click', () => {
      commitBefore();
      onPick(item.id);
      redraw();
    });
    box.appendChild(btn);
  }
  const mark = () => {
    for (const btn of box.children) btn.classList.toggle('active', btn.dataset.id === current());
  };
  mark();
  return mark;
}

const markLayout = buildChoiceButtons('layout-choices', LAYOUTS, () => state.layout, (id) => { state.layout = id; });
const markGrade = buildChoiceButtons('grade-choices', GRADES, () => state.grade, (id) => { state.grade = id; });
const markFont = buildChoiceButtons('font-choices', TITLE_FONTS, () => state.titleFont, (id) => { state.titleFont = id; });
const markColor = buildChoiceButtons('color-choices', TITLE_COLORS, () => state.titleColor, (id) => { state.titleColor = id; });

// --- lettering -----------------------------------------------------------

const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const sizeInput = document.getElementById('title-size');
const tiltInput = document.getElementById('tilt');

titleInput.addEventListener('focus', armEdit);
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
titleInput.addEventListener('change', disarmEdit);
subtitleInput.addEventListener('focus', armEdit);
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
subtitleInput.addEventListener('change', disarmEdit);
sizeInput.addEventListener('pointerdown', armEdit);
sizeInput.addEventListener('input', () => { state.titleSize = Number(sizeInput.value); redraw(); });
sizeInput.addEventListener('change', disarmEdit);
tiltInput.addEventListener('pointerdown', armEdit);
tiltInput.addEventListener('input', () => { state.tilt = Number(tiltInput.value); redraw(); });
tiltInput.addEventListener('change', disarmEdit);

document.getElementById('badge').addEventListener('change', (e) => {
  commitBefore();
  state.badge = e.target.checked;
  redraw();
});
const starsInput = document.getElementById('stars');
starsInput.addEventListener('pointerdown', armEdit);
starsInput.addEventListener('input', () => { state.stars = Number(starsInput.value); redraw(); });
starsInput.addEventListener('change', disarmEdit);

// --- per-panel crop ------------------------------------------------------

const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('pan-x');
const panYInput = document.getElementById('pan-y');
const panelLabel = document.getElementById('panel-label');

function selectedCrop() {
  return state.assignments[state.selectedPanel] ?? state.assignments[0];
}

function selectPanel(index) {
  const count = layoutPanels(state.layout, 100, 100).panels.length;
  state.selectedPanel = Math.max(0, Math.min(count - 1, index));
  refreshPhotoOptions();
  redraw();
}

function bindCropSlider(input, apply) {
  input.addEventListener('pointerdown', armEdit);
  input.addEventListener('input', () => { apply(Number(input.value)); redraw(); });
  input.addEventListener('change', disarmEdit);
}
bindCropSlider(zoomInput, (v) => { selectedCrop().zoom = v; });
bindCropSlider(panXInput, (v) => { selectedCrop().dx = v; });
bindCropSlider(panYInput, (v) => { selectedCrop().dy = v; });

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(state.layout, p.x, p.y, canvas.width, canvas.height);
  if (hit === -1) return;
  canvas.setPointerCapture(e.pointerId);
  if (hit !== state.selectedPanel) selectPanel(hit);
  armEdit();
  drag = { x: p.x, y: p.y };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = layoutPanels(state.layout, canvas.width, canvas.height).panels[state.selectedPanel];
  const crop = selectedCrop();
  const img = state.photos[crop.photo] ?? state.photos[0];
  if (img && panel) {
    const base = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight);
    const pw = img.naturalWidth * base * crop.zoom;
    const ph = img.naturalHeight * base * crop.zoom;
    const ox = Math.max(1, (pw - panel.w) / 2);
    const oy = Math.max(1, (ph - panel.h) / 2);
    crop.dx = Math.max(-1, Math.min(1, crop.dx + (p.x - drag.x) / ox));
    crop.dy = Math.max(-1, Math.min(1, crop.dy + (p.y - drag.y) / oy));
  }
  drag = { x: p.x, y: p.y };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; disarmEdit(); });
canvas.addEventListener('pointercancel', () => { drag = null; disarmEdit(); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  armEdit();
  const crop = selectedCrop();
  crop.zoom = Math.max(1, Math.min(3, crop.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
  disarmEdit();
}, { passive: false });

// --- undo / redo ---------------------------------------------------------

function applySnapshot(snap) {
  restoreState(state, snap);
  refreshPhotoOptions();
  redraw();
}
undoBtn.addEventListener('click', () => {
  const snap = history.undo(snapshotState(state));
  if (snap) { applySnapshot(snap); setStatus('Undid.'); }
});
redoBtn.addEventListener('click', () => {
  const snap = history.redo(snapshotState(state));
  if (snap) { applySnapshot(snap); setStatus('Redid.'); }
});
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || e.target.matches('input[type=text]')) return;
  if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undoBtn.click(); }
  if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redoBtn.click(); }
});

// --- export --------------------------------------------------------------

function downloadCanvas(coverCanvas, filename) {
  coverCanvas.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

const exportSizeSelect = document.getElementById('export-size');
for (const s of EXPORT_SIZES) {
  const opt = document.createElement('option');
  opt.value = s.id;
  opt.textContent = s.name;
  exportSizeSelect.appendChild(opt);
}
exportSizeSelect.value = state.exportSize;
exportSizeSelect.addEventListener('change', () => {
  state.exportSize = exportSizeSelect.value;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const size = currentSize();
  downloadCanvas(renderCoverCanvas(state, size), `vice-city-nights-${size.w}x${size.h}.png`);
  setStatus(`Exported ${size.w} x ${size.h} PNG.`);
});
document.getElementById('export-all').addEventListener('click', () => {
  EXPORT_SIZES.forEach((size, i) => {
    setTimeout(() => downloadCanvas(renderCoverCanvas(state, size), `vice-city-nights-${size.w}x${size.h}.png`), i * 450);
  });
  setStatus('Exporting all three sizes…');
});

// --- control sync ----------------------------------------------------------

function syncControls() {
  markLayout();
  markGrade();
  markFont();
  markColor();
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  sizeInput.value = String(state.titleSize);
  tiltInput.value = String(state.tilt);
  document.getElementById('badge').checked = state.badge;
  starsInput.value = String(state.stars);
  document.getElementById('stars-value').textContent = `${state.stars} / 5`;
  exportSizeSelect.value = state.exportSize;
  const count = layoutPanels(state.layout, 100, 100).panels.length;
  panelLabel.textContent = state.fillMode === 'one'
    ? `Photo (all ${count} panels)`
    : `Panel ${state.selectedPanel + 1} of ${count}`;
  const crop = selectedCrop();
  zoomInput.value = String(crop.zoom);
  panXInput.value = String(crop.dx);
  panYInput.value = String(crop.dy);
  document.getElementById('zoom-value').textContent = `${crop.zoom.toFixed(2)}x`;
  panelPhotoSelect.disabled = state.fillMode !== 'each';
  document.getElementById('fill-one').checked = state.fillMode === 'one';
  document.getElementById('fill-each').checked = state.fillMode === 'each';
}

// --- start -----------------------------------------------------------------

async function start() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('80px "Bebas Neue"'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch { /* fall back to system fonts if a font file fails */ }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      loadSample,
      setPhotos: (imgs) => { state.photos = imgs; refreshPhotoOptions(); },
      apply: (patch) => { Object.assign(state, patch); },
      setShotCover: (size) => { shotCoverMode = true; state.exportSize = size.id; },
      redraw,
    });
    return;
  }
  // Preload both samples so the first cover is ready in one click.
  try {
    const [pier, boulevard] = await Promise.all([loadSample('pier'), loadSample('boulevard')]);
    pier.name = 'pier (sample)';
    boulevard.name = 'boulevard (sample)';
    state.photos = [pier, boulevard];
  } catch { /* samples optional */ }
  refreshPhotoOptions();
  redraw();
  setStatus('Ready — pick a layout, a grade and a caption, then export.');
}

start();
