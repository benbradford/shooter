import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function offsetTexture(inputPath, outputPath) {
  const image = await loadImage(inputPath);
  const width = image.width;
  const height = image.height;
  const offsetY = Math.floor(height / 2);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw bottom half at top
  ctx.drawImage(image, 0, offsetY, width, height - offsetY, 0, 0, width, height - offsetY);
  
  // Draw top half at bottom
  ctx.drawImage(image, 0, 0, width, offsetY, 0, height - offsetY, width, offsetY);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
}

offsetTexture('public/assets/cell_drawables/water2.png', 'public/assets/cell_drawables/water2_offset.png');
