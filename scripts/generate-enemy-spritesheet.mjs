#!/usr/bin/env node

/**
 * Generic enemy spritesheet generator.
 * Usage: node scripts/generate-enemy-spritesheet.mjs <enemy_name>
 * 
 * Reads from: public/assets/<enemy>/rotations/ and public/assets/<enemy>/animations/
 * Outputs to: public/assets/<enemy>/<enemy>_spritesheet.png
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const enemyName = process.argv[2];
if (!enemyName) {
  console.error('Usage: node scripts/generate-enemy-spritesheet.mjs <enemy_name>');
  process.exit(1);
}

const BASE_DIR = `public/assets/${enemyName}`;
const OUTPUT = `${BASE_DIR}/${enemyName}_spritesheet.png`;
const FRAME_LIST_OUTPUT = `${BASE_DIR}/frame_list.txt`;
const COLS = 12;

// Direction order for traversal
const DIRECTIONS_8 = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
const DIRECTIONS_4 = ['south', 'east', 'north', 'west'];

// Determine available rotation directions
const rotDir = `${BASE_DIR}/rotations`;
const rotFiles = fs.readdirSync(rotDir).filter(f => f.endsWith('.png')).sort();
const has8Dir = rotFiles.length >= 8;
const directions = has8Dir ? DIRECTIONS_8 : DIRECTIONS_4;

// Get frame size from first rotation
const firstRot = `${rotDir}/${rotFiles[0]}`;
const sipsOut = execSync(`sips -g pixelWidth -g pixelHeight "${firstRot}"`, { encoding: 'utf8' });
const frameWidth = Number.parseInt(sipsOut.match(/pixelWidth:\s*(\d+)/)?.[1] ?? '48');
const frameHeight = Number.parseInt(sipsOut.match(/pixelHeight:\s*(\d+)/)?.[1] ?? '48');

const frames = [];
let frameIndex = 0;

// 1. Rotations (alphabetical order of direction names)
console.log(`Adding rotations (${rotFiles.length} frames)...`);
const sortedRotDirs = [...directions].filter(d => fs.existsSync(`${rotDir}/${d}.png`));
// Add in alphabetical order for consistency
const alphabeticalDirs = sortedRotDirs.sort();
for (const dir of alphabeticalDirs) {
  frames.push(`${rotDir}/${dir}.png`);
}
console.log(`  Frames 0-${frames.length - 1}: Idle rotations`);
frameIndex = frames.length;

// 2. Animations (sorted alphabetically by directory name)
const animDir = `${BASE_DIR}/animations`;
if (fs.existsSync(animDir)) {
  const anims = fs.readdirSync(animDir)
    .filter(f => fs.statSync(`${animDir}/${f}`).isDirectory())
    .sort();

  for (const anim of anims) {
    const animPath = `${animDir}/${anim}`;
    const startFrame = frames.length;

    // Check if this animation has direction subdirectories or is single-direction
    const contents = fs.readdirSync(animPath);
    const hasSubDirs = contents.some(f => fs.statSync(`${animPath}/${f}`).isDirectory());

    if (hasSubDirs) {
      // Multi-direction animation
      const availableDirs = contents.filter(f => fs.statSync(`${animPath}/${f}`).isDirectory()).sort();
      for (const dir of availableDirs) {
        const dirPath = `${animPath}/${dir}`;
        const animFrames = fs.readdirSync(dirPath).filter(f => f.endsWith('.png')).sort();
        for (const frame of animFrames) {
          frames.push(`${dirPath}/${frame}`);
        }
      }
    } else {
      // Single-direction animation (frames directly in the anim folder)
      const animFrames = contents.filter(f => f.endsWith('.png')).sort();
      for (const frame of animFrames) {
        frames.push(`${animPath}/${frame}`);
      }
    }

    const endFrame = frames.length - 1;
    console.log(`  Frames ${startFrame}-${endFrame}: ${anim}`);
  }
}

console.log(`\nTotal frames: ${frames.length}`);

const rows = Math.ceil(frames.length / COLS);
console.log(`Grid: ${COLS}x${rows} (${COLS * frameWidth}x${rows * frameHeight}px)`);

// Write frame list
fs.writeFileSync(FRAME_LIST_OUTPUT, frames.join('\n') + '\n');
console.log(`Wrote frame list: ${FRAME_LIST_OUTPUT}`);

// Generate spritesheet
const frameListTmp = `/tmp/${enemyName}_frames.txt`;
fs.writeFileSync(frameListTmp, frames.join('\n'));
execSync(`montage @${frameListTmp} -tile ${COLS}x${rows} -geometry ${frameWidth}x${frameHeight}+0+0 -background none ${OUTPUT}`);

console.log(`\n✓ Spritesheet created: ${OUTPUT}`);
console.log(`  Frame size: ${frameWidth}x${frameHeight}`);
console.log(`  Total frames: ${frames.length}`);
console.log(`  Grid: ${COLS}x${rows}`);
