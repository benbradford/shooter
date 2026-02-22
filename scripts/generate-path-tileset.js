#!/usr/bin/env node

/**
 * Generates a path tileset spritesheet from a source texture.
 * 
 * Usage: node scripts/generate-path-tileset.js <input-texture> <output-spritesheet>
 * Example: node scripts/generate-path-tileset.js public/assets/cell_drawables/stone_floor.png public/assets/cell_drawables/stone_path_tileset.png
 */

import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

const TILE_SIZE = 64;
const TILES_PER_ROW = 4;
const TOTAL_TILES = 16;

// Tile configurations: [north, east, south, west]
const TILE_CONFIGS = [
  [false, false, false, false], // 0: Empty
  [true, false, false, false],  // 1: North
  [false, true, false, false],  // 2: East
  [false, false, true, false],  // 3: South
  [false, false, false, true],  // 4: West
  [true, false, true, false],   // 5: North-South
  [false, true, false, true],   // 6: East-West
  [true, true, false, false],   // 7: North-East
  [true, false, false, true],   // 8: North-West
  [false, true, true, false],   // 9: South-East
  [false, false, true, true],   // 10: South-West
  [true, true, true, false],    // 11: North-East-South
  [true, true, false, true],    // 12: North-East-West
  [true, false, true, true],    // 13: North-South-West
  [false, true, true, true],    // 14: East-South-West
  [true, true, true, true],     // 15: All (cross)
];

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
  console.log(`Generated tileset: ${outputPath}`);
}

function drawPathTile(ctx, sourceImage, x, y, [north, east, south, west]) {
  const radius = TILE_SIZE * 0.4;
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  
  const adjacentCount = [north, east, south, west].filter(Boolean).length;
  const isDeadEnd = adjacentCount === 1;
  
  // Create clipping path - match the outline geometry exactly
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
  
  // Corner fills - use arcs to match outline exactly
  if (west && north) {
    ctx.moveTo(x, y + innerRadius);
    ctx.arc(x, y, innerRadius, Math.PI / 2, 0, true);
    ctx.lineTo(x, y);
    ctx.lineTo(x + innerRadius, y);
    ctx.closePath();
  }
  if (east && north) {
    ctx.moveTo(x + TILE_SIZE - innerRadius, y);
    ctx.lineTo(x + TILE_SIZE, y);
    ctx.lineTo(x + TILE_SIZE, y + innerRadius);
    ctx.arc(x + TILE_SIZE, y, innerRadius, Math.PI / 2, Math.PI, true);
    ctx.closePath();
  }
  if (west && south) {
    ctx.moveTo(x, y + TILE_SIZE - innerRadius);
    ctx.lineTo(x, y + TILE_SIZE);
    ctx.lineTo(x + innerRadius, y + TILE_SIZE);
    ctx.arc(x, y + TILE_SIZE, innerRadius, 0, Math.PI / 2);
    ctx.closePath();
  }
  if (east && south) {
    ctx.moveTo(x + TILE_SIZE - innerRadius, y + TILE_SIZE);
    ctx.arc(x + TILE_SIZE, y + TILE_SIZE, innerRadius, Math.PI, Math.PI / 2, true);
    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
    ctx.closePath();
  }
  
  // Center
  if (isDeadEnd) {
    ctx.rect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  } else {
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  }
  
  ctx.clip();
  
  // Draw source texture
  ctx.drawImage(sourceImage, 0, 0, sourceImage.width, sourceImage.height, x, y, TILE_SIZE, TILE_SIZE);
  
  ctx.restore();
  
  // Draw outlines only on exposed edges
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  
  if (isDeadEnd) {
    // Dead end outlines: two side lines + one cap line
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
    
    // Inner corner arcs
    const innerRadius = TILE_SIZE / 2 - radius;
    if (west && north) {
      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI / 2, false);
      ctx.stroke();
    }
    if (east && north) {
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE, y, innerRadius, Math.PI / 2, Math.PI, false);
      ctx.stroke();
    }
    if (west && south) {
      ctx.beginPath();
      ctx.arc(x, y + TILE_SIZE, innerRadius, -Math.PI / 2, 0, false);
      ctx.stroke();
    }
    if (east && south) {
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE, y + TILE_SIZE, innerRadius, Math.PI, -Math.PI / 2, false);
      ctx.stroke();
    }
  }
}

// CLI
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node generate-path-tileset.js <input-texture> <output-spritesheet>');
  process.exit(1);
}

generateTileset(args[0], args[1]).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
