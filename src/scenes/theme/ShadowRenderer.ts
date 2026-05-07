import type { GridReader } from '../../systems/grid/Grid';

const SHADOW_WIDTH_PX = 64;
const SHADOW_STEPS = 32;
const SHADOW_INTENSITY = 0.45;

export class ShadowRenderer {
  constructor(private readonly graphics: Phaser.GameObjects.Graphics, private readonly cellSize: number) {}

  renderShadows(grid: GridReader): void {
    const shadowWidth = SHADOW_WIDTH_PX;
    const shadowSteps = SHADOW_STEPS;
    const shadowIntensity = SHADOW_INTENSITY;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell || grid.getLayer(cell) < 1) continue;

        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const currentLayer = grid.getLayer(cell);

        if (col < grid.width - 1) {
          const rightCell = grid.cells[row][col + 1];
          const rightIsLower = grid.getLayer(rightCell) < currentLayer && !grid.isTransition(rightCell);

          if (rightIsLower) {
            const isTopRightCorner = row > 0 && grid.getLayer(grid.cells[row - 1][col]) < currentLayer && !grid.isTransition(grid.cells[row - 1][col]);

            if (isTopRightCorner) {
              for (let yOffset = 0; yOffset < shadowSteps; yOffset++) {
                for (let xOffset = 0; xOffset <= yOffset; xOffset++) {
                  const distance = Math.min(xOffset, yOffset);
                  const alpha = shadowIntensity * (1 - distance / shadowSteps);
                  const step = shadowWidth / shadowSteps;
                  this.graphics.fillStyle(0x000000, alpha);
                  this.graphics.fillRect(x + this.cellSize + xOffset * step, y + yOffset * step, step, step);
                }
              }
            } else {
              for (let i = 0; i < shadowSteps; i++) {
                const alpha = shadowIntensity * (1 - i / shadowSteps);
                const stepWidth = shadowWidth / shadowSteps;
                this.graphics.fillStyle(0x000000, alpha);
                this.graphics.fillRect(x + this.cellSize + i * stepWidth, y, stepWidth, this.cellSize);
              }
            }
          }
        }

        if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) < currentLayer && !grid.isTransition(grid.cells[row + 1][col])) {
          const isBottomLeftCorner = col > 0 && grid.getLayer(grid.cells[row][col - 1]) < currentLayer && !grid.isTransition(grid.cells[row][col - 1]);

          if (isBottomLeftCorner) {
            for (let i = 0; i < shadowSteps; i++) {
              for (let j = 0; j <= i; j++) {
                const alpha = shadowIntensity * (1 - i / shadowSteps);
                const step = shadowWidth / shadowSteps;
                this.graphics.fillStyle(0x000000, alpha);
                this.graphics.fillRect(x + this.cellSize - (j + 1) * step, y + this.cellSize + (i - j) * step, step, step);
              }
            }
          } else {
            for (let i = 0; i < shadowSteps; i++) {
              const alpha = shadowIntensity * (1 - i / shadowSteps);
              const stepHeight = shadowWidth / shadowSteps;
              this.graphics.fillStyle(0x000000, alpha);
              this.graphics.fillRect(x, y + this.cellSize + i * stepHeight, this.cellSize, stepHeight);
            }
          }
        }

        // Corner shadow (bottom-right)
        if (col < grid.width - 1 && row < grid.height - 1) {
          const rightCell = grid.cells[row][col + 1];
          const bottomCell = grid.cells[row + 1][col];
          const rightIsLower = grid.getLayer(rightCell) < currentLayer && !grid.isTransition(rightCell);
          const bottomIsLower = grid.getLayer(bottomCell) < currentLayer && !grid.isTransition(bottomCell);

          if (rightIsLower && bottomIsLower) {
            for (let i = 0; i < shadowSteps; i++) {
              for (let j = 0; j <= i; j++) {
                const alpha = shadowIntensity * (1 - i / shadowSteps);
                const step = shadowWidth / shadowSteps;
                this.graphics.fillStyle(0x000000, alpha);
                this.graphics.fillRect(x + this.cellSize + j * step, y + this.cellSize + (i - j) * step, step, step);
              }
            }
          }
        }
      }
    }
  }
}
