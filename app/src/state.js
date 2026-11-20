// Vice City Nights — editor state and the 60-step undo/redo history.
// The state holds everything the cover needs except the photo pixels
// themselves, which live in main.js as loaded images.

export function defaultAssignments() {
  return Array.from({ length: 9 }, () => ({ photo: 0, zoom: 1, dx: 0, dy: 0 }));
}

export function defaultState() {
  return {
    layout: 'grid4',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'neon shore',
    titleFont: 'anton',
    titleColor: 'sunset',
    titleSize: 100,
    tilt: -2,
    badge: true,
    stars: 4,
    fillMode: 'one',
    exportSize: '1080x1080',
    selectedPanel: 0,
    assignments: defaultAssignments(),
  };
}

/** A plain snapshot of the state (no images) for history and shots. */
export function snapshotState(state) {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleFont: state.titleFont,
    titleColor: state.titleColor,
    titleSize: state.titleSize,
    tilt: state.tilt,
    badge: state.badge,
    stars: state.stars,
    fillMode: state.fillMode,
    exportSize: state.exportSize,
    selectedPanel: state.selectedPanel,
    assignments: state.assignments,
  }));
}

export function restoreState(state, snap) {
  for (const key of Object.keys(snap)) state[key] = snap[key];
}

/** Undo/redo history, capped at 60 steps. */
export class History {
  constructor(limit = 60) {
    this.limit = limit;
    this.past = [];
    this.future = [];
  }

  /** Record the state before a change. */
  push(snap) {
    this.past.push(snap);
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
  }

  undo(current) {
    if (!this.past.length) return null;
    this.future.push(current);
    return this.past.pop();
  }

  redo(current) {
    if (!this.future.length) return null;
    this.past.push(current);
    return this.future.pop();
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
