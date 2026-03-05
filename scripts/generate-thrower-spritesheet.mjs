#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

const BASE_DIR = 'public/assets/thrower/anims';
const OUTPUT = 'public/assets/thrower/thrower_spritesheet.png';
const FRAME_SIZE = 56;

// Alphabetical order (how directories are sorted)
const DIRECTIONS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];

const frames = [];

// 1. Idle rotations (8 frames) - alphabetical order
console.log('Adding idle frames (0-7)...');
for (const dir of DIRECTIONS) {
  frames.push(`${BASE_DIR}/rotations/${dir}.png`);
}

// 2. Throw-object (7 frames × 8 directions = 56 frames)
console.log('Adding throw-object frames (8-63)...');
for (const dir of DIRECTIONS) {
  for (let i = 0; i < 7; i++) {
    frames.push(`${BASE_DIR}/animations/throw-object/${dir}/frame_${String(i).padStart(3, '0')}.png`);
  }
}

// 3. Walking-5 (4 frames × 8 directions = 32 frames)
console.log('Adding walking frames (64-95)...');
for (const dir of DIRECTIONS) {
  for (let i = 0; i < 4; i++) {
    frames.push(`${BASE_DIR}/animations/walking-5/${dir}/frame_${String(i).padStart(3, '0')}.png`);
  }
}

// 4. Taking-punch (6 frames × 8 directions = 48 frames)
console.log('Adding taking-punch frames (96-143)...');
for (const dir of DIRECTIONS) {
  for (let i = 0; i < 6; i++) {
    frames.push(`${BASE_DIR}/animations/taking-punch/${dir}/frame_${String(i).padStart(3, '0')}.png`);
  }
}

// 5. Falling-back-death (7 frames × 8 directions = 56 frames)
console.log('Adding death frames (144-199)...');
for (const dir of DIRECTIONS) {
  for (let i = 0; i < 7; i++) {
    frames.push(`${BASE_DIR}/animations/falling-back-death/${dir}/frame_${String(i).padStart(3, '0')}.png`);
  }
}

console.log(`Total frames: ${frames.length}`);

// Calculate grid dimensions (12 columns)
const cols = 12;
const rows = Math.ceil(frames.length / cols);
console.log(`Grid: ${cols}x${rows} (${cols * FRAME_SIZE}x${rows * FRAME_SIZE}px)`);

// Write frame list to temp file
const frameListPath = '/tmp/thrower_frames.txt';
fs.writeFileSync(frameListPath, frames.join('\n'));

// Generate spritesheet with ImageMagick
console.log('Generating spritesheet...');
execSync(`montage @${frameListPath} -tile ${cols}x${rows} -geometry ${FRAME_SIZE}x${FRAME_SIZE}+0+0 -background none ${OUTPUT}`);

console.log(`✓ Spritesheet created: ${OUTPUT}`);
console.log(`  Dimensions: ${cols * FRAME_SIZE}x${rows * FRAME_SIZE}px`);
console.log(`  Frame size: ${FRAME_SIZE}x${FRAME_SIZE}px`);
console.log(`  Total frames: ${frames.length}`);
