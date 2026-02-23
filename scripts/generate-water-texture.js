#!/usr/bin/env node

/**
 * Generates a seamless water texture.
 * 
 * Usage: node scripts/generate-water-texture.js <output-path> [size]
 * Example: node scripts/generate-water-texture.js public/assets/cell_drawables/water.png 128
 */

import fs from 'fs';
import { createCanvas } from 'canvas';

function generateWaterTexture(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Base water color (dark blue)
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#1a4d6d');
  gradient.addColorStop(0.5, '#2a5d7d');
  gradient.addColorStop(1, '#1a4d6d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add noise/variation for water texture
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const variation = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + variation));     // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation)); // B
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Add subtle wave highlights (seamless)
  ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
  ctx.lineWidth = 2;
  
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const yOffset = (size / 3) * i;
    for (let x = 0; x <= size; x += 5) {
      const y = yOffset + Math.sin((x / size) * Math.PI * 4) * 8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  return canvas;
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node generate-water-texture.js <output-path> [size]');
  process.exit(1);
}

const outputPath = args[0];
const size = args[1] ? parseInt(args[1]) : 128;

const canvas = generateWaterTexture(size);
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);
console.log(`Generated water texture: ${outputPath} (${size}x${size})`);
