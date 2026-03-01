import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function analyzeSpritesheet(imagePath, outputPath) {
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Find all non-transparent regions
  const sprites = [];
  const visited = new Set();
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = data[idx + 3];
      
      if (alpha > 10 && !visited.has(`${x},${y}`)) {
        // Found a sprite, flood fill to find bounds
        const bounds = floodFill(data, canvas.width, canvas.height, x, y, visited);
        if (bounds.width > 5 && bounds.height > 5) {
          sprites.push(bounds);
        }
      }
    }
  }
  
  // Write to file
  const lines = sprites.map((s, i) => 
    `overlay_${i}: x=${s.x}, y=${s.y}, width=${s.width}, height=${s.height}`
  );
  
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`Found ${sprites.length} sprites`);
  console.log(`Written to ${outputPath}`);
}

function floodFill(data, width, height, startX, startY, visited) {
  const queue = [[startX, startY]];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const idx = (y * width + x) * 4;
    const alpha = data[idx + 3];
    
    if (alpha <= 10) continue;
    
    visited.add(key);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    queue.push([x + 1, y]);
    queue.push([x - 1, y]);
    queue.push([x, y + 1]);
    queue.push([x, y - 1]);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node analyze-spritesheet.js <input-image> <output-list>');
  process.exit(1);
}

analyzeSpritesheet(args[0], args[1]);
