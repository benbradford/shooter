import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

async function makeBlueSemiTransparent(inputPath, outputPath) {
  const image = await loadImage(inputPath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Detect blue-ish pixels (b > r and b > g)
    if (b > r && b > g && b > 100) {
      data[i + 3] = Math.floor(data[i + 3] * 0.5); // 50% alpha
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node make-blue-transparent.js <input> <output>');
  process.exit(1);
}

makeBlueSemiTransparent(args[0], args[1]);
