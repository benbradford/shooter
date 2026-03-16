#!/usr/bin/env node
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';

const BASE_DIR = 'public/assets/pets/rock/rock';
const OUTPUT_FILE = 'public/assets/pets/rock/rock_spritesheet.png';
const METADATA_FILE = 'public/assets/pets/rock/rock_spritesheet_metadata.json';

// 4 directions in alphabetical order
const DIRECTIONS = ['east', 'north', 'south', 'west'];

const ANIMATIONS = [
  { name: 'breathing-idle', frames: 4 },
  { name: 'two-footed-jump', frames: 7 },
  { name: 'walking', frames: 5 }
];

const FRAME_SIZE = 48;

// Calculate layout
const rotationFrames = DIRECTIONS.length; // 4
const animationFrames = ANIMATIONS.reduce((sum, anim) => {
  if (anim.name === 'two-footed-jump') {
    return sum + anim.frames; // Only south direction
  }
  return sum + (anim.frames * DIRECTIONS.length);
}, 0);

const totalFrames = rotationFrames + animationFrames;
const cols = 12;
const rows = Math.ceil(totalFrames / cols);

console.log(`Total frames: ${totalFrames}`);
console.log(`Layout: ${cols}x${rows} (${cols * FRAME_SIZE}x${rows * FRAME_SIZE})`);

// Build frame list
const frames = [];

// Rotations (frames 0-3)
DIRECTIONS.forEach(dir => {
  frames.push(`${BASE_DIR}/rotations/${dir}.png`);
});

let frameIndex = rotationFrames;
const metadata = {
  frameSize: FRAME_SIZE,
  cols,
  rows,
  totalFrames,
  animations: {}
};

// Breathing-idle (frames 4-19)
metadata.animations['breathing-idle'] = {};
DIRECTIONS.forEach(dir => {
  const start = frameIndex;
  for (let i = 0; i < 4; i++) {
    frames.push(`${BASE_DIR}/animations/breathing-idle/${dir}/frame_00${i}.png`);
  }
  metadata.animations['breathing-idle'][dir] = { start, end: frameIndex + 3 };
  frameIndex += 4;
});

// Walking (frames 20-39)
metadata.animations['walking'] = {};
DIRECTIONS.forEach(dir => {
  const start = frameIndex;
  for (let i = 0; i < 5; i++) {
    frames.push(`${BASE_DIR}/animations/walking/${dir}/frame_00${i}.png`);
  }
  metadata.animations['walking'][dir] = { start, end: frameIndex + 4 };
  frameIndex += 5;
});

// Two-footed-jump (frames 40-46, south only)
metadata.animations['two-footed-jump'] = {};
const jumpStart = frameIndex;
for (let i = 0; i < 7; i++) {
  frames.push(`${BASE_DIR}/animations/two-footed-jump/south/frame_00${i}.png`);
}
metadata.animations['two-footed-jump']['south'] = { start: jumpStart, end: frameIndex + 6 };

// Rotations mapping
metadata.rotations = {};
DIRECTIONS.forEach((dir, i) => {
  metadata.rotations[dir] = i;
});

// Write frame list
writeFileSync('/tmp/rock_frames.txt', frames.join('\n'));

// Generate spritesheet
console.log('Generating spritesheet...');
execSync(`montage @/tmp/rock_frames.txt -tile ${cols}x${rows} -geometry ${FRAME_SIZE}x${FRAME_SIZE}+0+0 -background none ${OUTPUT_FILE}`);

// Write metadata
writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));

console.log(`✓ Spritesheet created: ${OUTPUT_FILE}`);
console.log(`✓ Metadata created: ${METADATA_FILE}`);
console.log(`\nFrame layout:`);
console.log(`  Rotations: 0-3 (east, north, south, west)`);
console.log(`  Breathing-idle: 4-19 (4 dirs × 4 frames)`);
console.log(`  Walking: 20-39 (4 dirs × 5 frames)`);
console.log(`  Two-footed-jump: 40-46 (south only × 7 frames)`);
