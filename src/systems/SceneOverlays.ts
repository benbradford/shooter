import type { Grid } from './grid/Grid';
import type { LevelData } from './level/LevelLoader';

type OverlaySprite = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class SceneOverlays {
  private overlaySprites: OverlaySprite[] = [];

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
        const match = line.match(/x=(\d+), y=(\d+), width=(\d+), height=(\d+)/);
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

    const { frequency, seed } = this.levelData.background.overlays;
    const rng = this.seededRandom(seed);

    const eligibleCells: Array<{ col: number; row: number }> = [];

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        const levelCell = this.levelData.cells.find(c => c.col === col && c.row === row);

        if (cell && 
            grid.getLayer(cell) === 0 && 
            cell.properties.size === 0 && 
            !levelCell?.backgroundTexture) {
          eligibleCells.push({ col, row });
        }
      }
    }

    const overlayCount = Math.floor(eligibleCells.length / frequency);

    for (let i = 0; i < overlayCount; i++) {
      const cellIndex = Math.floor(rng() * eligibleCells.length);
      const cell = eligibleCells[cellIndex];
      eligibleCells.splice(cellIndex, 1);

      const spriteIndex = Math.floor(rng() * this.overlaySprites.length);
      const sprite = this.overlaySprites[spriteIndex];

      const levelCell = this.levelData.cells.find(c => c.col === cell.col && c.row === cell.row);
      if (levelCell) {
        levelCell.backgroundTexture = `overlay_${spriteIndex}`;
      } else {
        this.levelData.cells.push({
          col: cell.col,
          row: cell.row,
          backgroundTexture: `overlay_${spriteIndex}`
        });
      }

      const worldPos = grid.cellToWorld(cell.col, cell.row);
      const image = this.scene.add.image(
        worldPos.x + grid.cellSize / 2,
        worldPos.y + grid.cellSize / 2,
        'dungeon_overlays'
      );
      image.setOrigin(0.5, 0.5);
      image.setCrop(sprite.x, sprite.y, sprite.width, sprite.height);
      image.setDisplaySize(sprite.width, sprite.height);
      image.setDepth(-100);
    }
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}
