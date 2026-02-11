import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';
import { GameSceneRenderer } from './GameSceneRenderer';

const WALL_EDGE_COLOR = 0x2a3a2e;
const COBBLE_COLOR_1 = 0x5a6a4e;
const COBBLE_COLOR_2 = 0x4a5a3e;
const COBBLE_COLOR_3 = 0x3a4a2e;
const SHADOW_WIDTH_PX = 24;
const SHADOW_STEPS = 8;

export class SwampSceneRenderer extends GameSceneRenderer {
  constructor(scene: Phaser.Scene, private readonly cellSize: number) {
    super(scene);
  }

  protected getEdgeColor(): number {
    return WALL_EDGE_COLOR;
  }

  protected getPlatformFillColor(): number {
    return COBBLE_COLOR_1;
  }

  renderGrid(grid: Grid, levelData?: LevelData): void {
    this.graphics.clear();
    this.edgeGraphics.clear();
    this.renderTransitionSteps(grid, levelData);
    this.renderPlatformsAndWalls(grid, this.cellSize, levelData);
    this.renderShadows(grid);
  }

  protected renderWallPattern(x: number, y: number, cellSize: number, _topBarY: number, seed: number): void {
    const stoneCount = 8 + (seed % 4);
    let currentY = y;

    while (currentY < y + cellSize) {
      for (let i = 0; i < stoneCount; i++) {
        const seedX = (seed + i * 123 + currentY) % 1000;
        const seedSize = (seed + i * 789) % 1000;
        const seedColor = (seed + i * 321) % 3;
        
        const stoneX = x + (seedX / 1000) * cellSize;
        const stoneSize = 6 + (seedSize / 1000) * 8;
        
        if (currentY + stoneSize <= y + cellSize) {
          const colors = [COBBLE_COLOR_1, COBBLE_COLOR_2, COBBLE_COLOR_3];
          const color = colors[seedColor];
          
          this.graphics.fillStyle(color, 1);
          this.graphics.fillCircle(stoneX, currentY, stoneSize / 2);
          
          this.graphics.lineStyle(1, WALL_EDGE_COLOR, 0.5);
          this.graphics.strokeCircle(stoneX, currentY, stoneSize / 2);
        }
      }
      currentY += 10;
    }
  }

  private renderTransitionSteps(grid: Grid, levelData?: LevelData): void {
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.isTransition(cell)) {
          const levelCell = levelData?.cells.find(c => c.col === col && c.row === row);
          if (levelCell?.backgroundTexture) {
            continue;
          }
          
          const x = col * this.cellSize;
          const y = row * this.cellSize;

          // Draw top edge line at very top
          this.graphics.lineStyle(8, 0x2a3a2e, 1);
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + this.cellSize, y));

          const stepCount = 4;
          const stepHeight = this.cellSize / stepCount;

          for (let i = 0; i < stepCount; i++) {
            const stepY = y + i * stepHeight;
            
            const brightness = 1 - (i / (stepCount - 1));
            const shadedColor = COBBLE_COLOR_1 - 0x202020 + Math.floor(0x202020 * brightness);
            
            this.graphics.fillStyle(shadedColor, 1);
            this.graphics.fillRect(x, stepY, this.cellSize, stepHeight);
            
            this.graphics.lineStyle(1, 0x2a3a2e, 0.6);
            this.graphics.strokeRect(x, stepY, this.cellSize, stepHeight);
          }
        }
      }
    }
  }

  private renderShadows(grid: Grid): void {
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.getLayer(cell) >= 1 && !grid.isTransition(cell)) {
          const currentLayer = grid.getLayer(cell);
          const cellBelow = grid.getCell(col, row + 1);
          if (cellBelow && grid.getLayer(cellBelow) < currentLayer && !grid.isTransition(cellBelow)) {
            // eslint-disable-next-line max-depth
            for (let i = 1; i <= SHADOW_STEPS; i++) {
              const checkRow = row + i;
              const shadowCell = grid.getCell(col, checkRow);
              
              // eslint-disable-next-line max-depth
              if (!shadowCell || grid.getLayer(shadowCell) >= currentLayer) break;

              const shadowY = checkRow * this.cellSize;
              const shadowHeight = Math.min(SHADOW_WIDTH_PX / i, this.cellSize);
              const alpha = 0.15 / i;

              this.graphics.fillStyle(0x000000, alpha);
              this.graphics.fillRect(col * this.cellSize, shadowY, this.cellSize, shadowHeight);
            }
          }
        }
      }
    }
  }

  renderTheme(width: number, height: number): { 
    background: Phaser.GameObjects.Image; 
    vignette: Phaser.GameObjects.Image 
  } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    if (this.scene.textures.exists('swamp_gradient')) {
      this.scene.textures.remove('swamp_gradient');
    }

    const canvas = this.scene.textures.createCanvas('swamp_gradient', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const gradient = ctx.createRadialGradient(
      worldWidth / 2, worldHeight / 2, 0,
      worldWidth / 2, worldHeight / 2, Math.max(worldWidth, worldHeight) / 1.5
    );
    gradient.addColorStop(0, '#4a5a3e');
    gradient.addColorStop(0.5, '#3a4a2e');
    gradient.addColorStop(1, '#2a3a1e');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      const size = 4 + Math.random() * 8;
      
      ctx.fillStyle = `rgba(30, 40, 20, ${0.3 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      const width = 20 + Math.random() * 40;
      const height = 10 + Math.random() * 20;
      
      ctx.fillStyle = `rgba(50, 60, 40, ${0.2 + Math.random() * 0.2})`;
      ctx.fillRect(x, y, width, height);
    }

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'swamp_gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(-1000);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(1000);
    vignette.setAlpha(0.5);
    vignette.setTint(0x2a4a1e);
    vignette.setBlendMode(2);

    return { background, vignette };
  }
}
