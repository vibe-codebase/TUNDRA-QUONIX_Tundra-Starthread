import type { Sky } from './sim';
import DATA from './skies.json';

export type Level = Sky & { id: string; name: string; chapter: number; hint?: string; trick: number };
export const CHAPTERS = [
  { name: 'First Light', short: 'First Light', blurb: 'The first stars of evening. Draw each constellation in a single unbroken line.' },
  { name: 'Comet Paths', short: 'Comets', blurb: 'Comet lines run one way only, the way their arrows point.' },
  { name: 'Double Stars', short: 'Doubles', blurb: 'Double lines are traced twice, once along each strand.' },
];
const NAMES: [string, string, string?][] = [
  ['f1', 'The Kettle', 'Touch a star, then slide along a line to the next. Light every line in one unbroken thread.'],
  ['f2', 'The Heron', 'Stuck? Undo a step. A star where an odd number of lines meet is a good place to begin, or to end.'],
  ['f3', 'The Lantern'], ['f4', 'The Fox'], ['f5', 'The Kite'], ['f6', 'The Bell'], ['f7', 'The Willow'], ['f8', 'The Shepherd'],
  ['m1', 'The Swallow', 'Comet lines go one way only. Follow their arrows.'],
  ['m2', 'The Ferry'], ['m3', 'The Arrow'], ['m4', 'The Compass'], ['m5', 'The Weathervane'], ['m6', 'The Hare'], ['m7', 'The Mariner'], ['m8', 'The Comet'],
  ['d1', 'The Bridge', 'A double line must be traced twice, once along each strand.'],
  ['d2', 'The Loom'], ['d3', 'The Hourglass'], ['d4', 'The Spindle'], ['d5', 'The Owl'], ['d6', 'The Crown'], ['d7', 'The Lighthouse'], ['d8', 'The Great Wheel'],
];
const D = DATA as unknown as Record<string, Sky & { trick: number }>;
/** Within each chapter the skies come in order of trickiness; names and first hints follow their place. */
const ORDER = [0, 1, 2].flatMap((c) => NAMES.slice(c * 8, c * 8 + 8).map(([id]) => id).sort((a, b) => D[a].trick - D[b].trick || a.localeCompare(b)));
export const LEVELS: Level[] = NAMES.map(([, name, hint], i) => ({ ...D[ORDER[i]], id: ORDER[i], name, hint, chapter: Math.floor(i / 8) }));
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
