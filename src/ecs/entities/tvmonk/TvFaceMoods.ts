// TV Monk face mood definitions
// Each mood has a background color and pixel patterns for 3 drawable directions

export type TvMood = 'off' | 'booting' | 'neutral' | 'happy' | 'sad' | 'scared' | 'love' | 'surprised' | 'smug' | 'laughing' | 'angry' | 'enraged' | 'charging' | 'stunned' | 'defeated' | 'glitching';
export type FaceDirection = 'south' | 'south-east' | 'south-west';

export type FacePixel = readonly [row: number, col: number, r: number, g: number, b: number];

export type MoodDefinition = {
  readonly bg: readonly [number, number, number];
  readonly faces: Record<FaceDirection, readonly FacePixel[]>;
  /** Optional second frame for idle animation */
  readonly faces2?: Record<FaceDirection, readonly FacePixel[]>;
  /** Animation interval in ms (only used if faces2 is set) */
  readonly animIntervalMs?: number;
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
  faces2: {
    south: [
      ...[2, 3].flatMap(r => [px(r, 3, B), px(r, 8, B)]),
      // Wider smile
      ...[3, 4, 5, 6, 7, 8].map(c => px(7, c, B)),
      px(6, 3, B), px(6, 8, B),
      ...[4, 5, 6, 7].map(c => px(8, c, B)),
    ],
    'south-east': [
      ...[3, 4].map(r => px(r, 2, B)),
      ...[3, 4].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
      px(7, 1, B), px(7, 6, B),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
    ],
    'south-west': [
      ...[3, 4].map(r => px(r, 5, B)),
      ...[3, 4].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
      px(7, 1, B), px(7, 6, B),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
    ],
  },
  animIntervalMs: 800,
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
  faces2: {
    south: [
      // Same wide eyes but pupils shifted right
      ...[2, 3, 4].flatMap(r => [2, 3, 4].map(c => px(r, c, B))),
      ...[2, 3, 4].flatMap(r => [7, 8, 9].map(c => px(r, c, B))),
      px(3, 4, W), px(3, 9, W),
      ...[4, 6].map(c => px(7, c, B)),
      ...[3, 5, 7, 8].map(c => px(8, c, B)),
    ],
    'south-east': [
      ...[3, 4, 5].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      ...[3, 4, 5].flatMap(r => [4, 5, 6].map(c => px(r, c, B))),
      px(4, 1, W), px(4, 6, W),
      ...[2, 4].map(c => px(7, c, B)),
      ...[1, 3, 5, 6].map(c => px(8, c, B)),
    ],
    'south-west': [
      ...[3, 4, 5].flatMap(r => [1, 2, 3].map(c => px(r, c, B))),
      ...[3, 4, 5].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      px(4, 3, W), px(4, 6, W),
      ...[2, 4].map(c => px(7, c, B)),
      ...[1, 3, 5, 6].map(c => px(8, c, B)),
    ],
  },
  animIntervalMs: 600,
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
  faces2: {
    south: [
      // Brows shifted down 1px
      px(2, 2, B), px(3, 3, B), px(3, 4, B),
      px(2, 9, B), px(3, 8, B), px(3, 7, B),
      ...[3, 4].flatMap(r => [3, 4].map(c => px(r, c, B))),
      ...[3, 4].flatMap(r => [7, 8].map(c => px(r, c, B))),
      ...[3, 5, 7, 9].map(c => px(7, c, B)),
      ...[4, 6, 8].map(c => px(8, c, B)),
    ],
    'south-east': [
      px(3, 1, B), px(4, 2, B),
      px(3, 6, B), px(4, 5, B), px(4, 6, B),
      px(4, 2, B),
      ...[4, 5].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      ...[1, 3, 5].map(c => px(8, c, B)),
      ...[2, 4, 6].map(c => px(9, c, B)),
    ],
    'south-west': [
      px(3, 1, B), px(3, 2, B), px(4, 2, B),
      px(3, 6, B), px(4, 5, B),
      ...[4, 5].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      px(4, 5, B),
      ...[1, 3, 5].map(c => px(8, c, B)),
      ...[2, 4, 6].map(c => px(9, c, B)),
    ],
  },
  animIntervalMs: 500,
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
  faces2: {
    south: [
      // X eyes flash to red
      ...[0, 1, 2].flatMap(i => [px(2 + i, 2 + i, [255, 100, 100]), px(2 + i, 4 - i, [255, 100, 100])]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 7 + i, [255, 100, 100]), px(2 + i, 9 - i, [255, 100, 100])]),
      ...[3, 4, 5, 6, 7, 8].map(c => px(6, c, W)),
      ...[4, 6].map(c => px(7, c, W)),
      ...[3, 4, 5, 6, 7, 8].map(c => px(8, c, W)),
    ],
    'south-east': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, [255, 100, 100]), px(2 + i, 3 - i, [255, 100, 100])]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, [255, 100, 100]), px(2 + i, 6 - i, [255, 100, 100])]),
      ...[1, 2, 3, 4, 5, 6].map(c => px(7, c, W)),
      ...[2, 4].map(c => px(8, c, W)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(9, c, W)),
    ],
    'south-west': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, [255, 100, 100]), px(2 + i, 3 - i, [255, 100, 100])]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, [255, 100, 100]), px(2 + i, 6 - i, [255, 100, 100])]),
      ...[1, 2, 3, 4, 5, 6].map(c => px(7, c, W)),
      ...[2, 4].map(c => px(8, c, W)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(9, c, W)),
    ],
  },
  animIntervalMs: 200,
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
  faces2: {
    south: [
      // Smaller hearts (just the center pixel)
      px(3, 3, HEART), px(3, 8, HEART),
      // Same smile
      ...[3, 4, 5, 6, 7, 8].map(c => px(7, c, B)),
      ...[4, 5, 6, 7].map(c => px(8, c, B)),
      px(6, 3, B), px(6, 8, B),
    ],
    'south-east': [
      px(3, 2, HEART), px(3, 6, HEART),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(7, 1, B), px(7, 6, B),
    ],
    'south-west': [
      px(3, 1, HEART), px(3, 5, HEART),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(7, 1, B), px(7, 6, B),
    ],
  },
  animIntervalMs: 500,
};

// Surprised — wide round eyes, small O mouth, bright white bg
const SURPRISED: MoodDefinition = {
  bg: [240, 240, 255],
  faces: {
    south: [
      // Wide round eyes (3x3)
      ...[2, 3, 4].flatMap(r => [2, 3, 4].map(c => px(r, c, B))),
      ...[2, 3, 4].flatMap(r => [7, 8, 9].map(c => px(r, c, B))),
      px(3, 3, W), px(3, 8, W),
      // Small O mouth
      ...[5, 6].map(c => px(6, c, B)), ...[5, 6].map(c => px(8, c, B)),
      px(7, 4, B), px(7, 7, B),
    ],
    'south-east': [
      ...[3, 4, 5].flatMap(r => [px(r, 1, B), px(r, 2, B)]),
      ...[3, 4, 5].flatMap(r => [4, 5, 6].map(c => px(r, c, B))),
      px(4, 2, W), px(4, 5, W),
      ...[3, 4].map(c => px(7, c, B)), ...[3, 4].map(c => px(9, c, B)),
      px(8, 2, B), px(8, 5, B),
    ],
    'south-west': [
      ...[3, 4, 5].flatMap(r => [1, 2, 3].map(c => px(r, c, B))),
      ...[3, 4, 5].flatMap(r => [px(r, 5, B), px(r, 6, B)]),
      px(4, 2, W), px(4, 5, W),
      ...[3, 4].map(c => px(7, c, B)), ...[3, 4].map(c => px(9, c, B)),
      px(8, 2, B), px(8, 5, B),
    ],
  },
  faces2: {
    south: [
      // Eyes squeezed shut (thick lines)
      ...[2, 3, 4, 5].map(c => px(3, c, B)),
      ...[7, 8, 9, 10].map(c => px(3, c, B)),
      // Closed grin (thin wide line)
      ...[3, 4, 5, 6, 7, 8].map(c => px(7, c, B)),
    ],
    'south-east': [
      ...[1, 2, 3].map(c => px(3, c, B)),
      ...[5, 6, 7].map(c => px(3, c, B)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
    ],
    'south-west': [
      ...[0, 1, 2].map(c => px(3, c, B)),
      ...[4, 5, 6].map(c => px(3, c, B)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
    ],
  },
  animIntervalMs: 300,
};

// Smug — half-lidded eyes, asymmetric smirk, yellow-green bg
const SMUG: MoodDefinition = {
  bg: [180, 210, 120],
  faces: {
    south: [
      // Half-lidded eyes (horizontal slits)
      ...[3, 4].map(c => px(3, c, B)), ...[7, 8].map(c => px(3, c, B)),
      // Smirk (asymmetric — higher on right)
      ...[4, 5, 6].map(c => px(7, c, B)),
      px(6, 7, B), px(7, 8, B),
    ],
    'south-east': [
      ...[px(3, 1, B), px(3, 2, B)], ...[px(3, 5, B), px(3, 6, B)],
      ...[2, 3, 4].map(c => px(8, c, B)),
      px(7, 5, B), px(8, 6, B),
    ],
    'south-west': [
      ...[px(3, 1, B), px(3, 2, B)], ...[px(3, 5, B), px(3, 6, B)],
      ...[3, 4, 5].map(c => px(8, c, B)),
      px(7, 2, B), px(8, 1, B),
    ],
  },
};

// Laughing — squinted eyes, wide open mouth, orange bg
const LAUGHING: MoodDefinition = {
  bg: [255, 180, 60],
  faces: {
    south: [
      // Squinted eyes (thick lines)
      ...[2, 3, 4, 5].map(c => px(3, c, B)),
      ...[7, 8, 9, 10].map(c => px(3, c, B)),
      // Wide open mouth (big rectangle)
      ...[3, 4, 5, 6, 7, 8].map(c => px(6, c, B)),
      ...[3, 4, 5, 6, 7, 8].map(c => px(9, c, B)),
      ...[6, 7, 8, 9].flatMap(r => [px(r, 3, B), px(r, 8, B)]),
    ],
    'south-east': [
      px(2, 1, B), px(3, 2, B), px(2, 3, B),
      px(2, 4, B), px(3, 5, B), px(3, 6, B), px(2, 7, B),
      ...[2, 3, 4, 5].map(c => px(7, c, B)),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(8, 1, B), px(8, 6, B),
    ],
    'south-west': [
      px(2, 0, B), px(3, 1, B), px(3, 2, B), px(2, 3, B),
      px(2, 4, B), px(3, 5, B), px(2, 6, B),
      ...[2, 3, 4, 5].map(c => px(7, c, B)),
      ...[2, 3, 4, 5].map(c => px(9, c, B)),
      px(8, 1, B), px(8, 6, B),
    ],
  },
  faces2: {
    south: [
      ...[2, 3, 4, 5].map(c => px(3, c, B)),
      ...[7, 8, 9, 10].map(c => px(3, c, B)),
      ...[3, 4, 5, 6, 7, 8].map(c => px(7, c, B)),
    ],
    'south-east': [
      ...[1, 2, 3].map(c => px(3, c, B)),
      ...[5, 6, 7].map(c => px(3, c, B)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
    ],
    'south-west': [
      ...[0, 1, 2].map(c => px(3, c, B)),
      ...[4, 5, 6].map(c => px(3, c, B)),
      ...[1, 2, 3, 4, 5, 6].map(c => px(8, c, B)),
    ],
  },
  animIntervalMs: 300,
};

// Charging — glowing white eyes, no mouth, pulsing red bg
const CHARGING: MoodDefinition = {
  bg: [200, 20, 20],
  faces: {
    south: [
      // Glowing eyes (white core with colored halo)
      ...[2, 3, 4].flatMap(r => [2, 3, 4].map(c => px(r, c, [255, 200, 200]))),
      ...[2, 3, 4].flatMap(r => [7, 8, 9].map(c => px(r, c, [255, 200, 200]))),
      px(3, 3, W), px(3, 8, W),
    ],
    'south-east': [
      ...[3, 4, 5].flatMap(r => [px(r, 1, [255, 200, 200]), px(r, 2, [255, 200, 200])]),
      ...[3, 4, 5].flatMap(r => [px(r, 5, [255, 200, 200]), px(r, 6, [255, 200, 200])]),
      px(4, 2, W), px(4, 5, W),
    ],
    'south-west': [
      ...[3, 4, 5].flatMap(r => [px(r, 1, [255, 200, 200]), px(r, 2, [255, 200, 200])]),
      ...[3, 4, 5].flatMap(r => [px(r, 5, [255, 200, 200]), px(r, 6, [255, 200, 200])]),
      px(4, 2, W), px(4, 5, W),
    ],
  },
  faces2: {
    south: [
      // Dimmer glow
      ...[2, 3, 4].flatMap(r => [2, 3, 4].map(c => px(r, c, [180, 100, 100]))),
      ...[2, 3, 4].flatMap(r => [7, 8, 9].map(c => px(r, c, [180, 100, 100]))),
      px(3, 3, [255, 200, 200]), px(3, 8, [255, 200, 200]),
    ],
    'south-east': [
      ...[3, 4, 5].flatMap(r => [px(r, 1, [180, 100, 100]), px(r, 2, [180, 100, 100])]),
      ...[3, 4, 5].flatMap(r => [px(r, 5, [180, 100, 100]), px(r, 6, [180, 100, 100])]),
      px(4, 2, [255, 200, 200]), px(4, 5, [255, 200, 200]),
    ],
    'south-west': [
      ...[3, 4, 5].flatMap(r => [px(r, 1, [180, 100, 100]), px(r, 2, [180, 100, 100])]),
      ...[3, 4, 5].flatMap(r => [px(r, 5, [180, 100, 100]), px(r, 6, [180, 100, 100])]),
      px(4, 2, [255, 200, 200]), px(4, 5, [255, 200, 200]),
    ],
  },
  animIntervalMs: 250,
};

// Stunned — spiral/X eyes, wavy mouth, flickering white bg
const STUNNED: MoodDefinition = {
  bg: [220, 220, 240],
  faces: {
    south: [
      // Spiral X eyes
      ...[0, 1, 2].flatMap(i => [px(2 + i, 2 + i, B), px(2 + i, 4 - i, B)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 7 + i, B), px(2 + i, 9 - i, B)]),
      // Wavy mouth
      px(7, 3, B), px(8, 4, B), px(7, 5, B), px(8, 6, B), px(7, 7, B), px(8, 8, B),
    ],
    'south-east': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, B), px(2 + i, 3 - i, B)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, B), px(2 + i, 6 - i, B)]),
      px(7, 2, B), px(8, 3, B), px(7, 4, B), px(8, 5, B),
    ],
    'south-west': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, B), px(2 + i, 3 - i, B)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, B), px(2 + i, 6 - i, B)]),
      px(7, 2, B), px(8, 3, B), px(7, 4, B), px(8, 5, B),
    ],
  },
};

// Defeated — X eyes, flat mouth, dark grey bg
const DEFEATED: MoodDefinition = {
  bg: [60, 60, 70],
  faces: {
    south: [
      // X eyes (dark)
      ...[0, 1, 2].flatMap(i => [px(2 + i, 2 + i, W), px(2 + i, 4 - i, W)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 7 + i, W), px(2 + i, 9 - i, W)]),
      // Flat line mouth
      ...[4, 5, 6, 7].map(c => px(8, c, W)),
    ],
    'south-east': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, W), px(2 + i, 3 - i, W)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, W), px(2 + i, 6 - i, W)]),
      ...[2, 3, 4, 5].map(c => px(9, c, W)),
    ],
    'south-west': [
      ...[0, 1, 2].flatMap(i => [px(2 + i, 1 + i, W), px(2 + i, 3 - i, W)]),
      ...[0, 1, 2].flatMap(i => [px(2 + i, 4 + i, W), px(2 + i, 6 - i, W)]),
      ...[2, 3, 4, 5].map(c => px(9, c, W)),
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
  surprised: SURPRISED,
  smug: SMUG,
  laughing: LAUGHING,
  angry: ANGRY,
  enraged: ENRAGED,
  charging: CHARGING,
  stunned: STUNNED,
  defeated: DEFEATED,
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
