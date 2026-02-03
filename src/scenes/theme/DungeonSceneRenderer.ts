import type { Grid } from '../../systems/grid/Grid';
import { GameSceneRenderer } from './GameSceneRenderer';

const LAYER1_FILL_COLOR = 0x4a4a5e;
const LAYER1_EDGE_COLOR = 0x2a2a3e;
const LAYER1_BRICK_FILL_COLOR = 0x3a3a4e;

export class DungeonSceneRenderer extends GameSceneRenderer {
  constructor(scene: Phaser.Scene, private readonly cellSize: number) {
    super(scene);
  }

  protected getEdgeColor(): number {
    return LAYER1_EDGE_COLOR;
  }

  renderGrid(grid: Grid): void {
    this.graphics.clear();
    this.renderTransitionSteps(grid);
    this.renderPlatformsAndWalls(grid, this.cellSize);
    this.renderShadows(grid);
  }

  protected renderWallPattern(x: number, y: number, cellSize: number, topBarY: number, _seed: number): void {
    const brickHeight = 10;
    const brickWidth = cellSize / 3;
    let currentY = topBarY + 4;
    let rowIndex = 0;

    while (currentY < y + cellSize) {
      const offset = (rowIndex % 2) * (brickWidth / 2);
      const actualHeight = Math.min(brickHeight, y + cellSize - currentY);

      for (let brickX = x - offset; brickX < x + cellSize + brickWidth; brickX += brickWidth) {
        const startX = Math.max(x, brickX);
        const endX = Math.min(x + cellSize, brickX + brickWidth - 2);

        if (startX < endX) {
          this.graphics.fillStyle(LAYER1_BRICK_FILL_COLOR, 1);
          this.graphics.fillRect(startX, currentY, endX - startX, actualHeight);

          this.graphics.lineStyle(2, LAYER1_EDGE_COLOR, 1);
          this.graphics.strokeRect(startX, currentY, endX - startX, actualHeight);
        }
      }

      currentY += brickHeight;
      rowIndex++;
    }
  }

  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    return this.renderDungeon(width, height);
  }

  private renderDungeon(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    if (this.scene.textures.exists('gradient')) {
      this.scene.textures.remove('gradient');
    }

    const MAX_TEXTURE_SIZE = 2048;
    const canvasWidth = Math.min(worldWidth, MAX_TEXTURE_SIZE);
    const canvasHeight = Math.min(worldHeight, MAX_TEXTURE_SIZE);

    const canvas = this.scene.textures.createCanvas('gradient', canvasWidth, canvasHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, '#282b0e');
    bgGradient.addColorStop(0.4, '#c0c4ae');
    bgGradient.addColorStop(0.7, '#405974');
    bgGradient.addColorStop(1, '#a36802');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    for (let i = 0; i < 100; i++) {
      const startX = Math.random() * worldWidth;
      const startY = Math.random() * worldHeight;
      const segments = Math.floor(Math.random() * 5) + 3;

      const color = this.varyColor('#333333', 40);
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${Math.random() * 0.2 + 0.1})`;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      let currentX = startX;
      let currentY = startY;

      for (let j = 0; j < segments; j++) {
        const angle = Math.random() * Math.PI * 2;
        const length = Math.random() * 14 + 5;
        currentX += Math.cos(angle) * length;
        currentY += Math.sin(angle) * length;
        ctx.lineTo(currentX, currentY);
      }

      ctx.stroke();
    }

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      const radius = Math.random() * 2 + 1;

      const color = this.varyColor('#827373', 30);
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${Math.random() * 0.3 + 0.1})`;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(-1000);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(1000);
    vignette.setAlpha(0.2);
    vignette.setTint(0x221111);
    vignette.setBlendMode(2);

    return { background, vignette };
  }

  private varyColor(hexColor: string, variationPercent: number): { r: number; g: number; b: number } {
    const r = Number.parseInt(hexColor.slice(1, 3), 16);
    const g = Number.parseInt(hexColor.slice(3, 5), 16);
    const b = Number.parseInt(hexColor.slice(5, 7), 16);

    const brightnessMultiplier = 1 + (Math.random() - 0.5) * 2 * (variationPercent / 100);

    return {
      r: Math.max(0, Math.min(255, Math.round(r * brightnessMultiplier))),
      g: Math.max(0, Math.min(255, Math.round(g * brightnessMultiplier))),
      b: Math.max(0, Math.min(255, Math.round(b * brightnessMultiplier)))
    };
  }

  private renderTransitionSteps(grid: Grid): void {
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.getLayer(cell) === 1 && grid.isTransition(cell)) {
          const x = col * grid.cellSize;
          const y = row * grid.cellSize;

          const numSteps = 5;
          const startY = y + (grid.cellSize * 0.2);
          const stepHeight = (grid.cellSize * 0.8) / numSteps;

          for (let step = 0; step < numSteps; step++) {
            const stepY = startY + step * stepHeight;

            this.graphics.fillStyle(LAYER1_FILL_COLOR, 1);
            this.graphics.fillRect(x, stepY, grid.cellSize, stepHeight);

            this.graphics.lineStyle(2, LAYER1_EDGE_COLOR, 1);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, stepY, x + grid.cellSize, stepY));
          }
        }
      }
    }
  }

  // eslint-disable-next-line complexity
  private renderShadows(grid: Grid): void {
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.getLayer(cell) === 1) {
          const x = col * grid.cellSize;
          const y = row * grid.cellSize;
          const shadowWidth = 24;
          const shadowSteps = 8;

          if (col < grid.width - 1 && grid.getLayer(grid.cells[row][col + 1]) === 0) {
            // eslint-disable-next-line max-depth
            for (let i = 0; i < shadowSteps; i++) {
              const alpha = 0.4 * (1 - i / shadowSteps);
              const stepWidth = shadowWidth / shadowSteps;
              this.graphics.fillStyle(0x000000, alpha);
              this.graphics.fillRect(x + grid.cellSize + i * stepWidth, y, stepWidth, grid.cellSize);
            }
          }

          if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) === 0) {
            // eslint-disable-next-line max-depth
            for (let i = 0; i < shadowSteps; i++) {
              const alpha = 0.4 * (1 - i / shadowSteps);
              const stepHeight = shadowWidth / shadowSteps;
              this.graphics.fillStyle(0x000000, alpha);
              this.graphics.fillRect(x, y + grid.cellSize + i * stepHeight, grid.cellSize, stepHeight);
            }
          }

          if (col < grid.width - 1 && row < grid.height - 1 &&
              grid.getLayer(grid.cells[row + 1][col + 1]) === 0 &&
              grid.getLayer(grid.cells[row][col + 1]) === 0 &&
              grid.getLayer(grid.cells[row + 1][col]) === 0) {
            // eslint-disable-next-line max-depth
            for (let i = 0; i < shadowSteps; i++) {
              // eslint-disable-next-line max-depth
              for (let j = 0; j < shadowSteps; j++) {
                const alpha = 0.4 * (1 - Math.max(i, j) / shadowSteps);
                const stepSize = shadowWidth / shadowSteps;
                this.graphics.fillStyle(0x000000, alpha);
                this.graphics.fillRect(
                  x + grid.cellSize + i * stepSize,
                  y + grid.cellSize + j * stepSize,
                  stepSize,
                  stepSize
                );
              }
            }
          }
        }
      }
    }
  }
}
