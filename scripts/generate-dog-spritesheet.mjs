#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const BASE_DIR = 'public/assets/pets/dog/dog';
const OUTPUT_FILE = 'public/assets/pets/dog/dog_spritesheet.png';
const METADATA_FILE = 'public/assets/pets/dog/dog_spritesheet_metadata.json';

// 8 directions in alphabetical order
const DIRECTIONS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];

const ANIMATIONS = [
  { name: 'bark', frames: 6 },
  { name: 'breathing-idle', frames: 8 },
  { name: 'running', frames: 4 },
  { name: 'walk', frames: 8 }
];

const FRAME_SIZE = 32;

// Calculate layout
const rotationFrames = DIRECTIONS.length; // 8
const animationFrames = ANIMATIONS.reduce((sum, anim) => sum + (anim.frames * DIRECTIONS.length), 0);
const totalFrames = rotationFrames + animationFrames;
const cols = 12;
const rows = Math.ceil(totalFrames / cols);

console.log(`Total frames: ${totalFrames}`);
console.log(`Layout: ${cols}x${rows} (${cols * FRAME_SIZE}x${rows * FRAME_SIZE})`);

// Build frame list
const frames = [];

// Rotations (frames 0-7)
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

// Animations
ANIMATIONS.forEach(anim => {
  metadata.animations[anim.name] = {};
  DIRECTIONS.forEach(dir => {
    const start = frameIndex;
    for (let i = 0; i < anim.frames; i++) {
      const frameNum = String(i).padStart(3, '0');
      frames.push(`${BASE_DIR}/animations/${anim.name}/${dir}/frame_${frameNum}.png`);
    }
    metadata.animations[anim.name][dir] = { start, end: frameIndex + anim.frames - 1 };
    frameIndex += anim.frames;
  });
});

// Rotations mapping
metadata.rotations = {};
DIRECTIONS.forEach((dir, i) => {
  metadata.rotations[dir] = i;
});

// Write frame list
writeFileSync('/tmp/dog_frames.txt', frames.join('\n'));

// Generate spritesheet
console.log('Generating spritesheet...');
execSync(`montage @/tmp/dog_frames.txt -tile ${cols}x${rows} -geometry ${FRAME_SIZE}x${FRAME_SIZE}+0+0 -background none ${OUTPUT_FILE}`);

// Write metadata
writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));

console.log(`✓ Spritesheet created: ${OUTPUT_FILE}`);
console.log(`✓ Metadata created: ${METADATA_FILE}`);
console.log(`\nFrame layout:`);
console.log(`  Rotations: 0-7 (8 directions)`);
let idx = 8;
ANIMATIONS.forEach(anim => {
  const count = anim.frames * DIRECTIONS.length;
  console.log(`  ${anim.name}: ${idx}-${idx + count - 1} (8 dirs × ${anim.frames} frames)`);
  idx += count;
});
