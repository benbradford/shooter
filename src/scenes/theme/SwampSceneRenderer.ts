import type { Grid } from '../../systems/grid/Grid';
import type { GameSceneRenderer } from './GameSceneRenderer';

const WALL_FILL_COLOR = 0x4a5a3e;
const WALL_EDGE_COLOR = 0x2a3a2e;
const COBBLE_COLOR_1 = 0x5a6a4e;
const COBBLE_COLOR_2 = 0x4a5a3e;
const COBBLE_COLOR_3 = 0x3a4a2e;
const SHADOW_WIDTH_PX = 24;
const SHADOW_STEPS = 8;
const MUD_COLOR = 0x3a4a2e;

export class SwampSceneRenderer implements GameSceneRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cellSize: number
  ) {
    this.graphics = scene.add.graphics();
  }

  renderGrid(grid: Grid): void {
    this.graphics.clear();

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.getCell(col, row);
        if (!cell) continue;

        const x = col * this.cellSize;
        const y = row * this.cellSize;

        if (cell.properties.has('stairs')) {
          this.renderTransitionSteps(x, y);
        }

        if (cell.properties.has('wall')) {
          const cellBelow = grid.getCell(col, row + 1);
          if (cellBelow?.properties.has('wall')) {
            this.renderMuddyPlatform(x, y);
          } else {
            this.renderWallEdge(x, y);
            this.renderCobblestones(x, y);
            this.renderShadowsBelow(grid, col, row);
          }
        }
      }
    }
  }

  private renderTransitionSteps(x: number, y: number): void {
    const stepCount = 4;
    const stepHeight = this.cellSize / stepCount;

    for (let i = 0; i < stepCount; i++) {
      const stepY = y + i * stepHeight;
      
      this.graphics.fillStyle(0x5a6a4e - i * 0x0a0a0a, 1);
      this.graphics.fillRect(x, stepY, this.cellSize, stepHeight);
      
      this.graphics.lineStyle(1, 0x2a3a2e, 0.6);
      this.graphics.strokeRect(x, stepY, this.cellSize, stepHeight);
    }
  }

  private renderWallEdge(x: number, y: number): void {
    this.graphics.fillStyle(WALL_FILL_COLOR, 1);
    this.graphics.fillRect(x, y, this.cellSize, this.cellSize);

    this.graphics.lineStyle(2, WALL_EDGE_COLOR, 1);
    this.graphics.strokeRect(x, y, this.cellSize, this.cellSize);
  }

  private renderCobblestones(x: number, y: number): void {
    const seed = x * 1000 + y;
    const stoneCount = 8 + (seed % 4);
    
    for (let i = 0; i < stoneCount; i++) {
      const seedX = (seed + i * 123) % 1000;
      const seedY = (seed + i * 456) % 1000;
      const seedSize = (seed + i * 789) % 1000;
      const seedColor = (seed + i * 321) % 3;
      
      const stoneX = x + (seedX / 1000) * this.cellSize;
      const stoneY = y + (seedY / 1000) * this.cellSize;
      const stoneSize = 8 + (seedSize / 1000) * 12;
      
      const colors = [COBBLE_COLOR_1, COBBLE_COLOR_2, COBBLE_COLOR_3];
      const color = colors[seedColor];
      
      this.graphics.fillStyle(color, 1);
      this.graphics.fillCircle(stoneX, stoneY, stoneSize / 2);
      
      this.graphics.lineStyle(1, WALL_EDGE_COLOR, 0.5);
      this.graphics.strokeCircle(stoneX, stoneY, stoneSize / 2);
    }
  }

  private renderMuddyPlatform(x: number, y: number): void {
    this.graphics.fillStyle(MUD_COLOR, 0.3);
    this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
  }

  private renderShadowsBelow(grid: Grid, col: number, row: number): void {
    for (let i = 1; i <= SHADOW_STEPS; i++) {
      const checkRow = row + i;
      const cellBelow = grid.getCell(col, checkRow);
      
      if (!cellBelow || cellBelow.properties.has('wall')) break;

      const shadowY = checkRow * this.cellSize;
      const shadowHeight = Math.min(SHADOW_WIDTH_PX / i, this.cellSize);
      const alpha = 0.15 / i;

      this.graphics.fillStyle(0x000000, alpha);
      this.graphics.fillRect(col * this.cellSize, shadowY, this.cellSize, shadowHeight);
    }
  }

  renderTheme(width: number, height: number): { 
    background: Phaser.GameObjects.Image; 
    vignette: Phaser.GameObjects.Image 
  } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

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
