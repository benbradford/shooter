#!/usr/bin/env node
import { execSync } from 'child_process';
import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_DIR = 'public/assets/puma/puma';
const OUTPUT = 'public/assets/puma/puma_spritesheet.png';
const FRAME_SIZE = 48;
const DIRECTIONS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];

const animations = [
  { name: 'angry', frames: 7 },
  { name: 'jump', frames: 8 },
  { name: 'running-4-frames', frames: 4 },
  { name: 'seated-on-belly-idle', frames: 10 },
  { name: 'standing-from-belly', frames: 8 }
];

const frameList = [];

// Idle rotations (8 frames)
for (const dir of DIRECTIONS) {
  frameList.push(`${BASE_DIR}/rotations/${dir}.png`);
}

// Animations (alphabetical order, 8 directions each)
for (const anim of animations) {
  for (const dir of DIRECTIONS) {
    const animDir = `${BASE_DIR}/animations/${anim.name}/${dir}`;
    const files = readdirSync(animDir)
      .filter(f => f.endsWith('.png'))
      .sort()
      .slice(0, anim.frames);
    
    for (const file of files) {
      frameList.push(join(animDir, file));
    }
  }
}

const totalFrames = frameList.length;
const cols = 12;
const rows = Math.ceil(totalFrames / cols);

console.log(`Total frames: ${totalFrames}`);
console.log(`Grid: ${cols}x${rows}`);
console.log(`Sheet size: ${cols * FRAME_SIZE}x${rows * FRAME_SIZE}`);

writeFileSync('/tmp/puma_frames.txt', frameList.join('\n'));

execSync(`montage @/tmp/puma_frames.txt -tile ${cols}x${rows} -geometry ${FRAME_SIZE}x${FRAME_SIZE}+0+0 -background none ${OUTPUT}`, { stdio: 'inherit' });

console.log(`✓ Generated ${OUTPUT}`);
