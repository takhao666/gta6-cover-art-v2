// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, drawn at its export size.
// `layout`, `grade`, `photo`, `caption`, `subtitle`, `font`, `color` and
// `size` pick the scene. window.__shotReady is set once painted.
import { EXPORT_SIZES } from './cover.js';

export async function runShot(shot, query, hooks) {
  const names = (query.get('photos') ?? query.get('photo') ?? 'pier').split(',').map((s) => s.trim()).filter(Boolean);
  const imgs = [];
  for (const name of names) imgs.push(await hooks.loadSample(name));
  hooks.setPhotos(imgs);
  const size = EXPORT_SIZES.find((s) => s.id === (query.get('size') ?? '1080x1080')) ?? EXPORT_SIZES[0];
  const fillMode = query.get('fill') ?? 'one';
  const assignments = Array.from({ length: 9 }, (_, i) => ({
    photo: fillMode === 'each' ? i % imgs.length : 0, zoom: 1, dx: 0, dy: 0,
  }));
  const patch = {
    layout: query.get('layout') ?? 'grid4',
    grade: query.get('grade') ?? 'sunset',
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'neon shore',
    titleFont: query.get('font') ?? 'anton',
    titleColor: query.get('color') ?? 'sunset',
    exportSize: size.id,
    fillMode,
    assignments,
  };
  if (query.get('stars') !== null) patch.stars = Number(query.get('stars'));
  if (query.get('badge') !== null) patch.badge = query.get('badge') === '1';
  hooks.apply(patch);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    hooks.setShotCover(size);
  }
  hooks.redraw();
  await document.fonts.ready;
  hooks.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
