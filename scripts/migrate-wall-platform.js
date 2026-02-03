#!/usr/bin/env node

/**
 * Migration script: Convert 'wall' to 'platform' or 'wall'
 * 
 * Rules:
 * - If cell has 'wall' property AND cell below is layer 0 AND cell is not stairs
 *   → Keep as 'wall' (actual wall with rendering)
 * - Otherwise → Convert to 'platform' (elevated platform)
 * - Bottom edge cells (no cell below) → Convert to 'platform'
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');

function isLayer0(cell) {
  if (!cell || !cell.properties) return true; // No cell = layer 0
  const props = cell.properties;
  return !props.includes('wall') && !props.includes('platform') && !props.includes('stairs');
}

function isStairs(cell) {
  return cell.properties && cell.properties.includes('stairs');
}

function migrateLevelFile(filePath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${filePath}`);
  console.log('='.repeat(60));

  const content = fs.readFileSync(filePath, 'utf8');
  const level = JSON.parse(content);

  // Create a map of cells by position for quick lookup
  const cellMap = new Map();
  for (const cell of level.cells) {
    const key = `${cell.col},${cell.row}`;
    cellMap.set(key, cell);
  }

  let wallCount = 0;
  let platformCount = 0;
  let unchangedCount = 0;

  for (const cell of level.cells) {
    if (!cell.properties || !cell.properties.includes('wall')) {
      unchangedCount++;
      continue;
    }

    // Check if this is stairs
    if (isStairs(cell)) {
      unchangedCount++;
      continue;
    }

    // Check cell below
    const cellBelowKey = `${cell.col},${cell.row + 1}`;
    const cellBelow = cellMap.get(cellBelowKey);

    // If at bottom edge (row + 1 >= height) or cell below is layer 0 → check if wall
    const atBottomEdge = cell.row + 1 >= level.height;
    const hasCellBelowLayer0 = !atBottomEdge && isLayer0(cellBelow);

    if (hasCellBelowLayer0) {
      // Keep as wall
      wallCount++;
      console.log(`  [WALL]     (${cell.col}, ${cell.row}) - has layer 0 below`);
    } else {
      // Convert to platform
      cell.properties = cell.properties.filter(p => p !== 'wall');
      cell.properties.push('platform');
      platformCount++;
      
      if (atBottomEdge) {
        console.log(`  [PLATFORM] (${cell.col}, ${cell.row}) - at bottom edge`);
      } else {
        console.log(`  [PLATFORM] (${cell.col}, ${cell.row}) - no layer 0 below`);
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Kept as wall:        ${wallCount}`);
  console.log(`  Converted to platform: ${platformCount}`);
  console.log(`  Unchanged:           ${unchangedCount}`);

  if (!DRY_RUN) {
    const output = JSON.stringify(level, null, 2);
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`\n✓ File updated: ${filePath}`);
  } else {
    console.log(`\n[DRY RUN] No changes written`);
  }
}

function main() {
  const levelsDir = path.join(__dirname, '..', 'public', 'levels');
  
  // Get all JSON files recursively
  function getJsonFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getJsonFiles(fullPath));
      } else if (entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  const files = getJsonFiles(levelsDir);

  console.log(`Found ${files.length} level files`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  for (const filePath of files) {
    migrateLevelFile(filePath);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration complete!');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\nTo apply changes, run without --dry-run flag:');
    console.log('  node scripts/migrate-wall-platform.js');
  }
}

main();
