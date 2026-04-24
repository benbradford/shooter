// Pre-computes screen pixel masks for each spritesheet frame at load time
import type Phaser from 'phaser';
import {
  TV_SCREEN_COLOR_R, TV_SCREEN_COLOR_G, TV_SCREEN_COLOR_B,
  TV_SCREEN_COLOR_TOLERANCE,
} from './TvFaceMoods';

export type ScreenMask = {
  /** Absolute pixel coords within the frame */
  readonly pixels: readonly { readonly row: number; readonly col: number }[];
  /** Top-left of bounding box (for face pattern offset) */
  readonly minRow: number;
  readonly minCol: number;
  readonly width: number;
  readonly height: number;
};

const EMPTY_MASK: ScreenMask = { pixels: [], minRow: 0, minCol: 0, width: 0, height: 0 };

/** Max expected screen height — filters out fireball false positives */
const MAX_SCREEN_HEIGHT_PX = 14;

export function scanScreenMasks(
  scene: Phaser.Scene,
  textureKey: string,
  frameWidth: number,
  frameHeight: number,
  totalFrames: number
): ScreenMask[] {
  const texture = scene.textures.get(textureKey);
  const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;

  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const cols = Math.floor(source.width / frameWidth);
  const masks: ScreenMask[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const frameCol = i % cols;
    const frameRow = Math.floor(i / cols);
    const x0 = frameCol * frameWidth;
    const y0 = frameRow * frameHeight;

    const imageData = ctx.getImageData(x0, y0, frameWidth, frameHeight);
    const data = imageData.data;

    const pixels: { row: number; col: number }[] = [];
    let minRow = frameHeight, minCol = frameWidth, maxRow = 0, maxCol = 0;

    for (let row = 0; row < frameHeight; row++) {
      for (let col = 0; col < frameWidth; col++) {
        const idx = (row * frameWidth + col) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (a < 128) continue;
        if (
          Math.abs(r - TV_SCREEN_COLOR_R) < TV_SCREEN_COLOR_TOLERANCE &&
          Math.abs(g - TV_SCREEN_COLOR_G) < TV_SCREEN_COLOR_TOLERANCE &&
          Math.abs(b - TV_SCREEN_COLOR_B) < TV_SCREEN_COLOR_TOLERANCE
        ) {
          pixels.push({ row, col });
          if (row < minRow) minRow = row;
          if (row > maxRow) maxRow = row;
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
        }
      }
    }

    if (pixels.length === 0) {
      masks.push(EMPTY_MASK);
      continue;
    }

    const height = maxRow - minRow + 1;

    // Filter out false positives (e.g., fireball projectile matching screen color)
    if (height > MAX_SCREEN_HEIGHT_PX) {
      masks.push(EMPTY_MASK);
      continue;
    }

    masks.push({
      pixels,
      minRow, minCol,
      width: maxCol - minCol + 1,
      height,
    });
  }

  return masks;
}

export { EMPTY_MASK };
