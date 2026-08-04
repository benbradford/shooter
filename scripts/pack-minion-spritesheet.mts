/**
 * Pack minion individual frame PNGs into a single spritesheet.
 * 
 * Layout (68x68 per frame, 8 columns):
 * Row 0 (0-3):    idle rotations: south, east, north, west
 * Row 1 (8-11):   run_south (4 frames)
 * Row 2 (16-19):  run_east (4 frames)
 * Row 3 (24-27):  run_north (4 frames)
 * Row 4 (32-35):  run_west (4 frames)
 * Row 5-6 (40-46): throw_south (7 frames)
 * Row 7-8 (56-62): throw_east (7 frames)
 * Row 9-10 (72-78): throw_north (7 frames)
 * Row 11-12 (80-86): throw_west (7 frames) -- ACTUALLY let's use contiguous rows
 * 
 * Simpler: 8 columns wide, pack sequentially:
 * Frames 0-3:   idle (south, east, north, west)
 * Frames 4-7:   run_south
 * Frames 8-11:  run_east
 * Frames 12-15: run_north
 * Frames 16-19: run_west
 * Frames 20-26: throw_south
 * Frames 27-33: throw_east
 * Frames 34-40: throw_north
 * Frames 41-47: throw_west
 * Frames 48-56: death_forward (collapse south, 9 frames)
 * Frames 57-63: death_backward (falling back south, 7 frames)
 * Frames 64-76: spawn (falling down north, 13 frames)
 * 
 * Total: 77 frames, 8 cols = 10 rows
 */

import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

const FRAME_SIZE = 68;
const COLS = 8;
const BASE = 'public/assets/minions';

const frames: string[] = [];

// Idle rotations (4 directions)
for (const dir of ['south', 'east', 'north', 'west']) {
  frames.push(`${BASE}/rotations/${dir}.png`);
}

// Running (4 directions × 4 frames)
for (const dir of ['south', 'east', 'north', 'west']) {
  for (let i = 0; i <= 3; i++) {
    frames.push(`${BASE}/animations/Running/${dir}/frame_${String(i).padStart(3, '0')}.png`);
  }
}

// Throw (4 directions × 7 frames)
for (const dir of ['south', 'east', 'north', 'west']) {
  for (let i = 0; i <= 6; i++) {
    frames.push(`${BASE}/animations/Throw_Object/${dir}/frame_${String(i).padStart(3, '0')}.png`);
  }
}

// Death forward / collapse (south, 9 frames)
for (let i = 0; i <= 8; i++) {
  frames.push(`${BASE}/animations/Collapsing_forwards_and_dramatically_falling_to_th/south/frame_${String(i).padStart(3, '0')}.png`);
}

// Death backward / falling back (south, 7 frames)
for (let i = 0; i <= 6; i++) {
  frames.push(`${BASE}/animations/Falling_Back_Death/south/frame_${String(i).padStart(3, '0')}.png`);
}

// Spawn / falling down with arms (north, 13 frames)
for (let i = 0; i <= 12; i++) {
  frames.push(`${BASE}/animations/Falling_down_with_arms_waving_and_then_landing_in/north/frame_${String(i).padStart(3, '0')}.png`);
}

async function pack() {
  const rows = Math.ceil(frames.length / COLS);
  const canvas = createCanvas(COLS * FRAME_SIZE, rows * FRAME_SIZE);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < frames.length; i++) {
    const filePath = frames[i];
    if (!fs.existsSync(filePath)) {
      console.error(`Missing: ${filePath}`);
      continue;
    }
    const img = await loadImage(filePath);
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    ctx.drawImage(img, col * FRAME_SIZE, row * FRAME_SIZE, FRAME_SIZE, FRAME_SIZE);
  }

  const outPath = path.join(BASE, 'minion_spritesheet.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Written ${outPath} (${COLS}x${rows} = ${frames.length} frames)`);
  console.log(`Frame layout:`);
  console.log(`  0-3:   idle (south, east, north, west)`);
  console.log(`  4-7:   run_south`);
  console.log(`  8-11:  run_east`);
  console.log(`  12-15: run_north`);
  console.log(`  16-19: run_west`);
  console.log(`  20-26: throw_south`);
  console.log(`  27-33: throw_east`);
  console.log(`  34-40: throw_north`);
  console.log(`  41-47: throw_west`);
  console.log(`  48-56: death_forward_south (9 frames)`);
  console.log(`  57-63: death_backward_south (7 frames)`);
  console.log(`  64-76: spawn_north (13 frames)`);
}

pack().catch(console.error);
