// TV Monk face mood definitions
// Each mood has a background color and pixel patterns for 3 drawable directions

export type TvMood = 'off' | 'booting' | 'neutral' | 'happy' | 'sad' | 'scared' | 'love' | 'angry' | 'enraged' | 'glitching';
export type FaceDirection = 'south' | 'south-east' | 'south-west';

export type FacePixel = readonly [row: number, col: number, r: number, g: number, b: number];

export type MoodDefinition = {
  readonly bg: readonly [number, number, number];
  readonly faces: Record<FaceDirection, readonly FacePixel[]>;
};

const B: readonly [number, number, number] = [0, 0, 0];
const W: readonly [number, number, number] = [255, 255, 255];
const TEAR: readonly [number, number, number] = [80, 160, 240];

function px(r: number, c: number, color: readonly [number, number, number]): FacePixel {
  return [r, c, color[0], color[1], color[2]];
}

const EMPTY_FACES: Record<FaceDirection, readonly FacePixel[]> = {
  south: [], 'south-east': [], 'south-west': [],
};

// TV off — black screen, no face
const OFF: MoodDefinition = { bg: [5, 5, 5], faces: EMPTY_FACES };

// Booting — black/white static (rendered dynamically like glitching)
const BOOTING: MoodDefinition = { bg: [10, 10, 10], faces: EMPTY_FACES };

// Neutral — dot eyes, flat mouth
const NEUTRAL: MoodDefinition = {
  bg: [140, 200, 220],
  faces: {
    south: [
      ...[3, 4].flatMap(r => [px(r, 3, B), px(r, 8, B)]),
      ...[4, 5, 6, 7].map(c => px(7, c, B)),
    ],
    'south-east': [
      ...[3, 4].map(r => px(r, 2, B)),
      ...[3, 4].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      ...[2, 3, 4, 5].map(c => px(8, c, B)),
    ],
    'south-west': [
      ...[3, 4].map(r => px(r, 5, B)),
      ...[3, 4].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      ...[2, 3, 4, 5].map(c => px(8, c, B)),
    ],
  },
};

// Health 100-120
const HAPPY: MoodDefinition = {
  bg: [140, 220, 255],
  faces: {
    south: [
      // Eyes (2px tall dots)
      ...[2, 3].flatMap(r => [px(r, 3, B), px(r, 8, B)]),
      // Smile
      ...[4, 5, 6, 7].map(c => px(7, c, B)),
      px(6, 3, B), px(6, 8, B),
    ],
    'south-east': [
      ...[3, 4].map(r => px(r, 2, B)),
      ...[3, 4].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      ...[2, 3, 4, 5].map(c => px(8, c, B)),
      px(7, 1, B), px(7, 6, B),
    ],
    'south-west': [
      ...[3, 4].map(r => px(r, 5, B)),
      ...[3, 4].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      ...[2, 3, 4, 5].map(c => px(8, c, B)),
      px(7, 1, B), px(7, 6, B),
    ],
  },
};

// Health 80-99
const SAD: MoodDefinition = {
  bg: [100, 140, 190],
  faces: {
    south: [
      ...[2, 3].flatMap(r => [px(r, 3, B), px(r, 8, B)]),
      px(4, 3, TEAR), px(5, 3, TEAR),
      ...[4, 5, 6, 7].map(c => px(8, c, B)),
      px(7, 3, B), px(7, 8, B),
    ],
    'south-east': [
      ...[3, 4].map(r => px(r, 2, B)),
      ...[3, 4].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      px(5, 2, TEAR),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(8, 1, B), px(8, 6, B),
    ],
    'south-west': [
      ...[3, 4].map(r => px(r, 5, B)),
      ...[3, 4].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      px(5, 5, TEAR),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(8, 1, B), px(8, 6, B),
    ],
  },
};

// Health 60-79
const SCARED: MoodDefinition = {
  bg: [160, 230, 160],
  faces: {
    south: [
      // Wide eyes with white pupils
      ...[2, 3, 4].flatMap(r => [2, 3, 4].map(c => px(r, c, B))),
      ...[2, 3, 4].flatMap(r => [7, 8, 9].map(c => px(r, c, B))),
      px(3, 3, W), px(3, 8, W),
      // Wavy mouth
      ...[4, 6].map(c => px(7, c, B)),
      ...[3, 5, 7, 8].map(c => px(8, c, B)),
    ],
    'south-east': [
      ...[3, 4, 5].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      ...[3, 4, 5].flatMap(r => [4, 5, 6].map(c => px(r, c, B))),
      px(4, 2, W), px(4, 5, W),
      ...[2, 4].map(c => px(7, c, B)),
      ...[1, 3, 5, 6].map(c => px(8, c, B)),
    ],
    'south-west': [
      ...[3, 4, 5].flatMap(r => [1, 2, 3].map(c => px(r, c, B))),
      ...[3, 4, 5].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      px(4, 2, W), px(4, 5, W),
      ...[2, 4].map(c => px(7, c, B)),
      ...[1, 3, 5, 6].map(c => px(8, c, B)),
    ],
  },
};

// Health 40-59
const ANGRY: MoodDefinition = {
  bg: [220, 70, 70],
  faces: {
    south: [
      // Angry brows
      px(1, 2, B), px(2, 3, B), px(2, 4, B),
      px(1, 9, B), px(2, 8, B), px(2, 7, B),
      // Square eyes
      ...[3, 4].flatMap(r => [3, 4].map(c => px(r, c, B))),
      ...[3, 4].flatMap(r => [7, 8].map(c => px(r, c, B))),
      // Zigzag mouth
      ...[3, 5, 7, 9].map(c => px(7, c, B)),
      ...[4, 6, 8].map(c => px(8, c, B)),
    ],
    'south-east': [
      px(2, 1, B), px(3, 2, B),
      px(2, 6, B), px(3, 5, B), px(3, 6, B),
      px(4, 2, B),
      ...[4, 5].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      ...[1, 3, 5].map(c => px(8, c, B)),
      ...[2, 4, 6].map(c => px(9, c, B)),
    ],
    'south-west': [
      px(2, 1, B), px(2, 2, B), px(3, 2, B),
      px(2, 6, B), px(3, 5, B),
      ...[4, 5].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      px(4, 5, B),
      ...[1, 3, 5].map(c => px(8, c, B)),
      ...[2, 4, 6].map(c => px(9, c, B)),
    ],
  },
};

// Health 20-39
const ENRAGED: MoodDefinition = {
  bg: [180, 30, 30],
  faces: {
    south: [
      // X eyes (white on dark red)
      ...[0, 1, 2].flatMap(i => [px(2 + i, 2 + i, W), px(2 + i, 4 - i, W)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 7 + i, W), px(2 + i, 9 - i, W)]),
      // Open jagged mouth
      ...[3, 4, 5, 6, 7, 8].map(c => px(6, c, W)),
      ...[4, 6].map(c => px(7, c, W)),
      ...[3, 4, 5, 6, 7, 8].map(c => px(8, c, W)),
    ],
    'south-east': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, W), px(2 + i, 3 - i, W)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, W), px(2 + i, 6 - i, W)]),
      ...[1, 2, 3, 4, 5, 6].map(c => px(7, c, W)),
      ...[2, 4].map(c => px(8, c, W)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(9, c, W)),
    ],
    'south-west': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, W), px(2 + i, 3 - i, W)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, W), px(2 + i, 6 - i, W)]),
      ...[1, 2, 3, 4, 5, 6].map(c => px(7, c, W)),
      ...[2, 4].map(c => px(8, c, W)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(9, c, W)),
    ],
  },
};

const HEART: readonly [number, number, number] = [255, 50, 80];

// Love — heart eyes, big smile, pink bg
const LOVE: MoodDefinition = {
  bg: [255, 200, 220],
  faces: {
    south: [
      // Heart-shaped eyes (left)
      ...[px(2, 2, HEART), px(2, 4, HEART), px(3, 2, HEART), px(3, 3, HEART), px(3, 4, HEART), px(4, 3, HEART)],
      // Heart-shaped eyes (right)
      ...[px(2, 7, HEART), px(2, 9, HEART), px(3, 7, HEART), px(3, 8, HEART), px(3, 9, HEART), px(4, 8, HEART)],
      // Big smile
      ...[3, 4, 5, 6, 7, 8].map(c => px(7, c, B)),
      ...[4, 5, 6, 7].map(c => px(8, c, B)),
      px(6, 3, B), px(6, 8, B),
    ],
    'south-east': [
      ...[px(2, 1, HEART), px(2, 3, HEART), px(3, 1, HEART), px(3, 2, HEART), px(3, 3, HEART), px(4, 2, HEART)],
      ...[px(2, 5, HEART), px(2, 7, HEART), px(3, 5, HEART), px(3, 6, HEART), px(3, 7, HEART), px(4, 6, HEART)],
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(7, 1, B), px(7, 6, B),
    ],
    'south-west': [
      ...[px(2, 0, HEART), px(2, 2, HEART), px(3, 0, HEART), px(3, 1, HEART), px(3, 2, HEART), px(4, 1, HEART)],
      ...[px(2, 4, HEART), px(2, 6, HEART), px(3, 4, HEART), px(3, 5, HEART), px(3, 6, HEART), px(4, 5, HEART)],
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(7, 1, B), px(7, 6, B),
    ],
  },
};

// Health 1-19
const GLITCHING: MoodDefinition = {
  bg: [15, 30, 15],
  faces: {
    south: [],   // Filled dynamically with random static
    'south-east': [],
    'south-west': [],
  },
};

export const MOOD_DEFINITIONS: Record<TvMood, MoodDefinition> = {
  off: OFF,
  booting: BOOTING,
  neutral: NEUTRAL,
  happy: HAPPY,
  sad: SAD,
  scared: SCARED,
  love: LOVE,
  angry: ANGRY,
  enraged: ENRAGED,
  glitching: GLITCHING,
};

// Health thresholds (descending)
const HEALTH_THRESHOLDS: readonly { readonly minHealth: number; readonly mood: TvMood }[] = [
  { minHealth: 100, mood: 'happy' },
  { minHealth: 80, mood: 'sad' },
  { minHealth: 60, mood: 'scared' },
  { minHealth: 40, mood: 'angry' },
  { minHealth: 20, mood: 'enraged' },
  { minHealth: 1, mood: 'glitching' },
];

export function moodFromHealth(health: number): TvMood {
  for (const t of HEALTH_THRESHOLDS) {
    if (health >= t.minHealth) return t.mood;
  }
  return 'glitching';
}

export const TV_SCREEN_COLOR_R = 157;
export const TV_SCREEN_COLOR_G = 216;
export const TV_SCREEN_COLOR_B = 248;
export const TV_SCREEN_COLOR_TOLERANCE = 15;
