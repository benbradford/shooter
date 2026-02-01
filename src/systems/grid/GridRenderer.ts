import Phaser from "phaser";
import type { Grid } from './Grid';

const LAYER1_FILL_COLOR = 0x4a4a5e;
const LAYER1_EDGE_COLOR = 0x2a2a3e;
const LAYER1_BRICK_FILL_COLOR = 0x3a3a4e;

export class GridRenderer {
  private readonly grid: Grid;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, grid: Grid) {
    this.grid = grid;
    this.graphics = scene.add.graphics();
  }

  render(): void {
    this.graphics.clear();
    this.renderTransitionSteps();
    this.renderLayer1Edges();
    this.renderShadows();
  }

  private renderTransitionSteps(): void {
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const cell = this.grid.getCell(col, row);
        if (cell && this.grid.getLayer(cell) === 1 && this.grid.isTransition(cell)) {
          const x = col * this.grid.cellSize;
          const y = row * this.grid.cellSize;

          const numSteps = 5;
          const startY = y + (this.grid.cellSize * 0.2);
          const stepHeight = (this.grid.cellSize * 0.8) / numSteps;

          for (let step = 0; step < numSteps; step++) {
            const stepY = startY + step * stepHeight;

            this.graphics.fillStyle(LAYER1_FILL_COLOR, 1);
            this.graphics.fillRect(x, stepY, this.grid.cellSize, stepHeight);

            this.graphics.lineStyle(2, LAYER1_EDGE_COLOR, 1);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(
              x, stepY,
              x + this.grid.cellSize, stepY
            ));
          }
        }
      }
    }
  }

  private renderLayer1Edges(): void {
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const cell = this.grid.getCell(col, row);
        if (cell && this.grid.getLayer(cell) === 1) {
          const x = col * this.grid.cellSize;
          const y = row * this.grid.cellSize;
          const edgeThickness = 8;

          this.graphics.lineStyle(edgeThickness, LAYER1_EDGE_COLOR, 1);

          if (col < this.grid.width - 1 && this.grid.getLayer(this.grid.cells[row][col + 1]) === 0) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(
              x + this.grid.cellSize, y,
              x + this.grid.cellSize, y + this.grid.cellSize
            ));
          }

          if (col > 0 && this.grid.getLayer(this.grid.cells[row][col - 1]) === 0) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + this.grid.cellSize));
          }

          if (row > 0 && this.grid.getLayer(this.grid.cells[row - 1][col]) === 0) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + this.grid.cellSize, y));
          }

          if (row < this.grid.height - 1 && this.grid.getLayer(this.grid.cells[row + 1][col]) === 0 && !this.grid.isTransition(cell)) {
            const topBarY = y + (this.grid.cellSize * 0.2);

            this.graphics.lineStyle(edgeThickness, LAYER1_EDGE_COLOR, 1);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, topBarY, x + this.grid.cellSize, topBarY));

            const brickHeight = 10;
            const brickWidth = this.grid.cellSize / 3;
            let currentY = topBarY + 4;
            let rowIndex = 0;

            while (currentY + brickHeight <= y + this.grid.cellSize) {
              const offset = (rowIndex % 2) * (brickWidth / 2);

              for (let brickX = x - offset; brickX < x + this.grid.cellSize + brickWidth; brickX += brickWidth) {
                const startX = Math.max(x, brickX);
                const endX = Math.min(x + this.grid.cellSize, brickX + brickWidth - 2);

                if (startX < endX) {
                  this.graphics.fillStyle(LAYER1_BRICK_FILL_COLOR, 1);
                  this.graphics.fillRect(startX, currentY, endX - startX, brickHeight);

                  this.graphics.lineStyle(2, LAYER1_EDGE_COLOR, 1);
                  this.graphics.strokeRect(startX, currentY, endX - startX, brickHeight);
                }
              }

              currentY += brickHeight + 2;
              rowIndex++;
            }
          }
        }
      }
    }
  }

  private renderShadows(): void {
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const cell = this.grid.getCell(col, row);
        if (cell && this.grid.getLayer(cell) === 1) {
          const x = col * this.grid.cellSize;
          const y = row * this.grid.cellSize;
          const shadowWidth = 24;
          const shadowSteps = 8;

          if (col < this.grid.width - 1 && this.grid.getLayer(this.grid.cells[row][col + 1]) === 0) {
            for (let i = 0; i < shadowSteps; i++) {
              const alpha = 0.4 * (1 - i / shadowSteps);
              const stepWidth = shadowWidth / shadowSteps;
              this.graphics.fillStyle(0x000000, alpha);
              this.graphics.fillRect(x + this.grid.cellSize + i * stepWidth, y, stepWidth, this.grid.cellSize);
            }
          }

          if (row < this.grid.height - 1 && this.grid.getLayer(this.grid.cells[row + 1][col]) === 0) {
            for (let i = 0; i < shadowSteps; i++) {
              const alpha = 0.4 * (1 - i / shadowSteps);
              const stepHeight = shadowWidth / shadowSteps;
              this.graphics.fillStyle(0x000000, alpha);
              this.graphics.fillRect(x, y + this.grid.cellSize + i * stepHeight, this.grid.cellSize, stepHeight);
            }
          }

          if (col < this.grid.width - 1 && row < this.grid.height - 1 &&
              this.grid.getLayer(this.grid.cells[row + 1][col + 1]) === 0 &&
              this.grid.getLayer(this.grid.cells[row][col + 1]) === 0 &&
              this.grid.getLayer(this.grid.cells[row + 1][col]) === 0) {
            for (let i = 0; i < shadowSteps; i++) {
              for (let j = 0; j < shadowSteps; j++) {
                const alpha = 0.4 * (1 - Math.max(i, j) / shadowSteps);
                const stepSize = shadowWidth / shadowSteps;
                this.graphics.fillStyle(0x000000, alpha);
                this.graphics.fillRect(
                  x + this.grid.cellSize + i * stepSize,
                  y + this.grid.cellSize + j * stepSize,
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
