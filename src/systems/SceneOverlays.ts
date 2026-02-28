import type { Grid } from './grid/Grid';
import type { LevelData } from './level/LevelLoader';
import { DEPTH_OVERLAY } from '../constants/DepthConstants';

type OverlaySprite = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class SceneOverlays {
  private readonly overlaySprites: OverlaySprite[] = [];
  private readonly overlayImages: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly levelData: LevelData
  ) {}

  async init(): Promise<void> {
    if (!this.levelData.background?.overlays) return;

    const spriteListPath = this.levelData.background.overlays.spriteList;
    const response = await fetch(spriteListPath);
    const text = await response.text();

    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('overlay_')) {
        const match = new RegExp(/x=(\d+), y=(\d+), width=(\d+), height=(\d+)/).exec(line);
        if (match) {
          this.overlaySprites.push({
            x: Number.parseInt(match[1]),
            y: Number.parseInt(match[2]),
            width: Number.parseInt(match[3]),
            height: Number.parseInt(match[4])
          });
        }
      }
    }
  }

  applyOverlays(grid: Grid): void {
    if (!this.levelData.background?.overlays || this.overlaySprites.length === 0) return;
    
    // Check if overlay texture is loaded
    if (!this.scene.textures.exists('dungeon_overlays')) {
      return;
    }

    const { frequency, seed } = this.levelData.background.overlays;
    const rng = this.seededRandom(seed);

    const eligibleCells: Array<{ col: number; row: number; priority: number }> = [];

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        const levelCell = this.levelData.cells.find(c => c.col === col && c.row === row);

        if (cell &&
            grid.getLayer(cell) === 0 &&
            cell.properties.size === 0 &&
            !levelCell?.backgroundTexture) {

          let priority = 0;

          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const neighbor = grid.getCell(col + dc, row + dr);
              if (neighbor && (grid.getLayer(neighbor) >= 1 || neighbor.properties.has('stairs'))) {
                priority += 3;
              }
            }
          }

          const centerX = grid.width / 2;
          const centerY = grid.height / 2;
          const distFromCenter = Math.hypot(col - centerX, row - centerY);
          const maxDist = Math.hypot(centerX, centerY);
          priority += Math.floor((distFromCenter / maxDist) * 5);

          eligibleCells.push({ col, row, priority });
        }
      }
    }

    eligibleCells.sort((a, b) => b.priority - a.priority);

    const overlayCount = Math.floor(eligibleCells.length / frequency);

    for (let i = 0; i < overlayCount; i++) {
      const maxIndex = Math.min(eligibleCells.length, Math.floor(eligibleCells.length * 0.3));
      const cellIndex = Math.floor(rng() * maxIndex);
      const cell = eligibleCells[cellIndex];
      eligibleCells.splice(cellIndex, 1);

      const spriteIndex = Math.floor(rng() * this.overlaySprites.length);
      const sprite = this.overlaySprites[spriteIndex];

      const worldPos = grid.cellToWorld(cell.col, cell.row);
      const image = this.scene.add.image(
        worldPos.x + grid.cellSize / 2,
        worldPos.y + grid.cellSize / 2,
        'dungeon_overlays'
      );
      image.setOrigin(0.5, 0.5);
      image.setCrop(sprite.x, sprite.y, sprite.width, sprite.height);
      image.setDisplaySize(sprite.width * 1.5, sprite.height * 1.5);
      image.setDepth(DEPTH_OVERLAY);

      const rotation = (rng() - 0.5) * 0.52;
      image.setRotation(rotation);

      const alpha = 0.85 + rng() * 0.15;
      image.setAlpha(alpha);

      this.overlayImages.push(image);
    }
  }

  destroy(): void {
    this.overlayImages.forEach(img => img.destroy());
    this.overlayImages.length = 0;
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}
