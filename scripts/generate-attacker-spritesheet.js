#!/usr/bin/env node

/**
 * Generates attacker spritesheet from rotations and animations directories.
 *
 * Usage: node scripts/generate-attacker-spritesheet.js
 *
 * Output:
 * - public/assets/attacker/attacker-spritesheet.png
 * - public/assets/attacker/frame_list.txt
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const BASE_DIR = 'public/assets/attacker';
const ROTATIONS_DIR = `${BASE_DIR}/rotations`;
const ANIMATIONS_DIR = `${BASE_DIR}/animations`;
const OUTPUT_SHEET = `${BASE_DIR}/attacker-spritesheet.png`;
const OUTPUT_LIST = `${BASE_DIR}/frame_list.txt`;

const DIRECTION_ORDER = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

function generateSwimmingAnimation() {
  console.log('Generating swimming animation from pushing animation...');
  execSync('./scripts/create-swimming-animation.sh', { cwd: process.cwd(), stdio: 'inherit' });
}

function getRotationFrames() {
  const frames = [];
  const files = fs.readdirSync(ROTATIONS_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();
  files.forEach(f => frames.push(`${ROTATIONS_DIR}/${f}`));
  return frames;
}

function getAnimationFrames() {
  const frames = [];
  const animDirs = fs.readdirSync(ANIMATIONS_DIR).filter(name => {
    const stat = fs.statSync(path.join(ANIMATIONS_DIR, name));
    return stat.isDirectory();
  }).sort();

  for (const animDir of animDirs) {
    const animPath = `${ANIMATIONS_DIR}/${animDir}`;
    const dirDirs = fs.readdirSync(animPath).filter(name => {
      const stat = fs.statSync(path.join(animPath, name));
      return stat.isDirectory();
    });

    // Check if has direction subdirectories
    if (dirDirs.length > 0) {
      // Multi-direction animation
      for (const dir of DIRECTION_ORDER) {
        const dirPath = `${animPath}/${dir}`;
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.png'))
            .sort();
          files.forEach(f => frames.push(`${dirPath}/${f}`));
        }
      }
    } else {
      // Single direction animation
      const files = fs.readdirSync(animPath)
        .filter(f => f.endsWith('.png'))
        .sort();
      files.forEach(f => frames.push(`${animPath}/${f}`));
    }
  }

  return frames;
}

function generateSpritesheet() {
  // Generate swimming animation first if it doesn't exist
  generateSwimmingAnimation();

  const rotationFrames = getRotationFrames();
  const animationFrames = getAnimationFrames();
  const allFrames = [...rotationFrames, ...animationFrames];

  console.log(`Total frames: ${allFrames.length}`);
  console.log(`Rotations: ${rotationFrames.length}`);
  console.log(`Animations: ${animationFrames.length}`);

  // Write frame list
  fs.writeFileSync(OUTPUT_LIST, allFrames.join('\n'));
  console.log(`Wrote frame list: ${OUTPUT_LIST}`);

  // Calculate grid size
  const cols = 12;
  const rows = Math.ceil(allFrames.length / cols);

  // Generate spritesheet with ImageMagick
  const cmd = `montage @${OUTPUT_LIST} -tile ${cols}x${rows} -geometry 56x56+0+0 -background none ${OUTPUT_SHEET}`;
  execSync(cmd, { cwd: process.cwd() });

  console.log(`Generated spritesheet: ${OUTPUT_SHEET} (${cols}x${rows} = ${cols * rows} slots, ${allFrames.length} used)`);

  // Print frame index mapping
  console.log('\nFrame Index Mapping:');
  console.log(`Frames 0-${rotationFrames.length - 1}: Idle rotations`);

  let frameIndex = rotationFrames.length;
  const animDirs = fs.readdirSync(ANIMATIONS_DIR).filter(name => {
    const stat = fs.statSync(path.join(ANIMATIONS_DIR, name));
    return stat.isDirectory();
  }).sort();

  for (const animDir of animDirs) {
    const animPath = `${ANIMATIONS_DIR}/${animDir}`;
    const dirDirs = fs.readdirSync(animPath).filter(name => {
      const stat = fs.statSync(path.join(animPath, name));
      return stat.isDirectory();
    });

    let frameCount = 0;
    if (dirDirs.length > 0) {
      for (const dir of DIRECTION_ORDER) {
        const dirPath = `${animPath}/${dir}`;
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
          frameCount += files.length;
        }
      }
    } else {
      frameCount = fs.readdirSync(animPath).filter(f => f.endsWith('.png')).length;
    }

    console.log(`Frames ${frameIndex}-${frameIndex + frameCount - 1}: ${animDir}`);
    frameIndex += frameCount;
  }
}

generateSpritesheet();
