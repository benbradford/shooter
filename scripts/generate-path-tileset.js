#!/usr/bin/env node

/**
 * Generates a path tileset spritesheet from a source texture.
 *
 * Usage: node scripts/generate-path-tileset.js <input-texture> <output-spritesheet>
 * e.g. node scripts/generate-path-tileset.js public/assets/cell_drawables/stone_floor.png public/assets/cell_drawables/stone_path_tileset.png 
 *
 * Generates 46 tiles (8x6 grid):
 * - Tiles 0-6: No corners (solid, single directions, straights)
 * - Tiles 7-14: Simple corners (2 variations each)
 * - Tiles 15-30: T-junctions (4 variations each)
 * - Tiles 31-46: Cross (16 variations)
 */

import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

const TILE_SIZE = 64;
const TILES_PER_ROW = 8;

const TILE_CONFIGS = [];

// 0-6: No corners (diagonals don't matter)
TILE_CONFIGS.push([false, false, false, false, false, false, false, false]); // 0: Solid
TILE_CONFIGS.push([true, false, false, false, false, false, false, false]);  // 1: North
TILE_CONFIGS.push([false, true, false, false, false, false, false, false]);  // 2: East
TILE_CONFIGS.push([false, false, true, false, false, false, false, false]);  // 3: South
TILE_CONFIGS.push([false, false, false, true, false, false, false, false]);  // 4: West
TILE_CONFIGS.push([true, false, true, false, false, false, false, false]);   // 5: North-South
TILE_CONFIGS.push([false, true, false, true, false, false, false, false]);   // 6: East-West

// 7-14: Simple corners (2 variations each based on relevant diagonal)
// Tile 7-8: North-East (NE diagonal matters)
TILE_CONFIGS.push([true, true, false, false, false, false, false, false]);   // 7: N+E, no NE
TILE_CONFIGS.push([true, true, false, false, false, true, false, false]);    // 8: N+E, has NE

// Tile 9-10: North-West (NW diagonal matters)
TILE_CONFIGS.push([true, false, false, true, false, false, false, false]);   // 9: N+W, no NW
TILE_CONFIGS.push([true, false, false, true, true, false, false, false]);    // 10: N+W, has NW

// Tile 11-12: South-East (SE diagonal matters)
TILE_CONFIGS.push([false, true, true, false, false, false, false, false]);   // 11: S+E, no SE
TILE_CONFIGS.push([false, true, true, false, false, false, false, true]);    // 12: S+E, has SE

// Tile 13-14: South-West (SW diagonal matters)
TILE_CONFIGS.push([false, false, true, true, false, false, false, false]);   // 13: S+W, no SW
TILE_CONFIGS.push([false, false, true, true, false, false, true, false]);    // 14: S+W, has SW

// 15-30: T-junctions (4 variations each based on 2 relevant diagonals)
// N+E+S: NE and SE matter
for (let i = 0; i < 4; i++) {
  const hasNE = (i & 1) !== 0;
  const hasSE = (i & 2) !== 0;
  TILE_CONFIGS.push([true, true, true, false, false, hasNE, false, hasSE]);
}

// N+E+W: NE and NW matter
for (let i = 0; i < 4; i++) {
  const hasNE = (i & 1) !== 0;
  const hasNW = (i & 2) !== 0;
  TILE_CONFIGS.push([true, true, false, true, hasNW, hasNE, false, false]);
}

// N+S+W: NW and SW matter
for (let i = 0; i < 4; i++) {
  const hasNW = (i & 1) !== 0;
  const hasSW = (i & 2) !== 0;
  TILE_CONFIGS.push([true, false, true, true, hasNW, false, hasSW, false]);
}

// E+S+W: SE and SW matter
for (let i = 0; i < 4; i++) {
  const hasSE = (i & 1) !== 0;
  const hasSW = (i & 2) !== 0;
  TILE_CONFIGS.push([false, true, true, true, false, false, hasSW, hasSE]);
}

// 31-46: Cross (16 variations based on all 4 diagonals)
for (let i = 0; i < 16; i++) {
  const hasNW = (i & 1) !== 0;
  const hasNE = (i & 2) !== 0;
  const hasSW = (i & 4) !== 0;
  const hasSE = (i & 8) !== 0;
  TILE_CONFIGS.push([true, true, true, true, hasNW, hasNE, hasSW, hasSE]);
}

const TOTAL_TILES = TILE_CONFIGS.length;

async function generateTileset(inputPath, outputPath) {
  const sourceImage = await loadImage(inputPath);

  const sheetWidth = TILE_SIZE * TILES_PER_ROW;
  const sheetHeight = TILE_SIZE * Math.ceil(TOTAL_TILES / TILES_PER_ROW);
  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < TOTAL_TILES; i++) {
    const tileX = (i % TILES_PER_ROW) * TILE_SIZE;
    const tileY = Math.floor(i / TILES_PER_ROW) * TILE_SIZE;

    drawPathTile(ctx, sourceImage, tileX, tileY, TILE_CONFIGS[i]);
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated tileset: ${outputPath} (${TOTAL_TILES} tiles)`);
}

function drawPathTile(ctx, sourceImage, x, y, config) {
  const [north, east, south, west, hasNW = false, hasNE = false, hasSW = false, hasSE = false] = config;
  const radius = TILE_SIZE * 0.4;
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;

  const adjacentCount = [north, east, south, west].filter(Boolean).length;
  const isDeadEnd = adjacentCount === 1;

  // Tile 0: Solid fill
  if (adjacentCount === 0) {
    ctx.drawImage(sourceImage, 0, 0, sourceImage.width, sourceImage.height, x, y, TILE_SIZE, TILE_SIZE);
    return;
  }

  ctx.save();
  ctx.beginPath();

  const innerRadius = TILE_SIZE / 2 - radius;

  // Large rectangles
  if (west) {
    ctx.rect(x, centerY - radius, TILE_SIZE / 2 + 1, radius * 2);
  }
  if (east) {
    ctx.rect(centerX - 1, centerY - radius, TILE_SIZE / 2 + 1, radius * 2);
  }
  if (north) {
    ctx.rect(centerX - radius, y, radius * 2, TILE_SIZE / 2 + 1);
  }
  if (south) {
    ctx.rect(centerX - radius, centerY - 1, radius * 2, TILE_SIZE / 2 + 1);
  }

  // Corner fills - arc if diagonal missing, rectangle if present
  if (west && north) {
    if (!hasNW) {
      ctx.moveTo(x, y + innerRadius);
      ctx.arc(x, y, innerRadius, Math.PI / 2, 0, true);
      ctx.lineTo(x, y);
      ctx.lineTo(x + innerRadius, y);
      ctx.closePath();
    } else {
      ctx.rect(x, y, TILE_SIZE / 2 - radius, TILE_SIZE / 2 - radius);
    }
  }
  if (east && north) {
    if (!hasNE) {
      ctx.moveTo(x + TILE_SIZE - innerRadius, y);
      ctx.lineTo(x + TILE_SIZE, y);
      ctx.lineTo(x + TILE_SIZE, y + innerRadius);
      ctx.arc(x + TILE_SIZE, y, innerRadius, Math.PI / 2, Math.PI, true);
      ctx.closePath();
    } else {
      ctx.rect(centerX + radius, y, TILE_SIZE / 2 - radius, TILE_SIZE / 2 - radius);
    }
  }
  if (west && south) {
    if (!hasSW) {
      ctx.moveTo(x, y + TILE_SIZE - innerRadius);
      ctx.lineTo(x, y + TILE_SIZE);
      ctx.lineTo(x + innerRadius, y + TILE_SIZE);
      ctx.arc(x, y + TILE_SIZE, innerRadius, 0, Math.PI / 2);
      ctx.closePath();
    } else {
      ctx.rect(x, centerY + radius, TILE_SIZE / 2 - radius, TILE_SIZE / 2 - radius);
    }
  }
  if (east && south) {
    if (!hasSE) {
      ctx.moveTo(x + TILE_SIZE - innerRadius, y + TILE_SIZE);
      ctx.arc(x + TILE_SIZE, y + TILE_SIZE, innerRadius, Math.PI, Math.PI / 2, true);
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
      ctx.closePath();
    } else {
      ctx.rect(centerX + radius, centerY + radius, TILE_SIZE / 2 - radius, TILE_SIZE / 2 - radius);
    }
  }

  // Center
  if (isDeadEnd) {
    ctx.rect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  } else {
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  }

  ctx.clip();

  ctx.drawImage(sourceImage, 0, 0, sourceImage.width, sourceImage.height, x, y, TILE_SIZE, TILE_SIZE);

  ctx.restore();

  // Draw outlines - only where diagonal is missing
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;

  if (isDeadEnd) {
    if (west) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY - radius);
      ctx.lineTo(centerX - radius, y);
      ctx.moveTo(centerX + radius, centerY - radius);
      ctx.lineTo(centerX + radius, y);
      ctx.moveTo(centerX - radius, centerY + radius);
      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.stroke();
    } else if (east) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY - radius);
      ctx.lineTo(centerX - radius, y);
      ctx.moveTo(centerX + radius, centerY - radius);
      ctx.lineTo(centerX + radius, y);
      ctx.moveTo(centerX - radius, centerY + radius);
      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.stroke();
    } else if (north) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, y);
      ctx.lineTo(centerX - radius, centerY + radius);
      ctx.moveTo(centerX + radius, y);
      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.moveTo(centerX - radius, centerY + radius);
      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.stroke();
    } else if (south) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY - radius);
      ctx.lineTo(centerX - radius, y + TILE_SIZE);
      ctx.moveTo(centerX + radius, centerY - radius);
      ctx.lineTo(centerX + radius, y + TILE_SIZE);
      ctx.moveTo(centerX - radius, centerY - radius);
      ctx.lineTo(centerX + radius, centerY - radius);
      ctx.stroke();
    }
  } else {
    // Outer corner arcs
    if (!west && !north) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, -Math.PI / 2, false);
      ctx.stroke();
    } else if (!west && north) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX - radius, y);
      ctx.stroke();
    } else if (west && !north) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(x, centerY - radius);
      ctx.stroke();
    }

    if (!east && !north) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, 0, false);
      ctx.stroke();
    } else if (!east && north) {
      ctx.beginPath();
      ctx.moveTo(centerX + radius, centerY);
      ctx.lineTo(centerX + radius, y);
      ctx.stroke();
    } else if (east && !north) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(x + TILE_SIZE, centerY - radius);
      ctx.stroke();
    }

    if (!west && !south) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI / 2, Math.PI, false);
      ctx.stroke();
    } else if (!west && south) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX - radius, y + TILE_SIZE);
      ctx.stroke();
    } else if (west && !south) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY + radius);
      ctx.lineTo(x, centerY + radius);
      ctx.stroke();
    }

    if (!east && !south) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI / 2, false);
      ctx.stroke();
    } else if (!east && south) {
      ctx.beginPath();
      ctx.moveTo(centerX + radius, centerY);
      ctx.lineTo(centerX + radius, y + TILE_SIZE);
      ctx.stroke();
    } else if (east && !south) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY + radius);
      ctx.lineTo(x + TILE_SIZE, centerY + radius);
      ctx.stroke();
    }

    // Inner corner arcs - only draw if diagonal is missing
    if (west && north && !hasNW) {
      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI / 2, false);
      ctx.stroke();
    }
    if (east && north && !hasNE) {
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE, y, innerRadius, Math.PI / 2, Math.PI, false);
      ctx.stroke();
    }
    if (west && south && !hasSW) {
      ctx.beginPath();
      ctx.arc(x, y + TILE_SIZE, innerRadius, -Math.PI / 2, 0, false);
      ctx.stroke();
    }
    if (east && south && !hasSE) {
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE, y + TILE_SIZE, innerRadius, Math.PI, -Math.PI / 2, false);
      ctx.stroke();
    }
  }
}

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node generate-path-tileset.js <input-texture> <output-spritesheet>');
  process.exit(1);
}

generateTileset(args[0], args[1]).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
