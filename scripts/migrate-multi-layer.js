#!/usr/bin/env node

/**
 * Migration script: Add explicit layer field to all cells
 * 
 * Rules:
 * - Default: layer: 0
 * - Walls and platforms: layer: 1
 * - Stairs: layer: 0 (at lower layer)
 * 
 * Usage:
 *   node scripts/migrate-multi-layer.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');

function migrateLevelToMultiLayer(levelPath) {
  const content = fs.readFileSync(levelPath, 'utf8');
  const level = JSON.parse(content);
  
  let modified = 0;
  
  for (const cell of level.cells) {
    if (cell.layer === undefined) {
      // Infer layer from properties
      if (cell.properties?.includes('wall') || cell.properties?.includes('platform')) {
        cell.layer = 1;
      } else {
        cell.layer = 0; // Default (includes stairs)
      }
      modified++;
    }
  }
  
  if (modified > 0) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would migrate ${modified} cells in: ${path.basename(levelPath)}`);
    } else {
      fs.writeFileSync(levelPath, JSON.stringify(level, null, 2) + '\n');
      console.log(`✓ Migrated ${modified} cells in: ${path.basename(levelPath)}`);
    }
  } else {
    console.log(`- No changes needed: ${path.basename(levelPath)}`);
  }
  
  return modified;
}

// Migrate all levels
const levelsDir = path.join(__dirname, '../public/levels');

if (!fs.existsSync(levelsDir)) {
  console.error(`Error: Levels directory not found: ${levelsDir}`);
  process.exit(1);
}

const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.log('No level files found.');
  process.exit(0);
}

console.log(`Found ${files.length} level file(s)\n`);

let totalModified = 0;
for (const file of files) {
  totalModified += migrateLevelToMultiLayer(path.join(levelsDir, file));
}

console.log(`\nTotal cells modified: ${totalModified}`);

if (DRY_RUN) {
  console.log('\n[DRY RUN] No files were changed. Run without --dry-run to apply changes.');
}
