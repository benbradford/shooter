import type { GridReader } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';

const EDGE_THICKNESS_PX = 4;
const DARKENING_STEPS_PER_CELL = 4;
const DARKENING_MIN_ALPHA = 0.01;

export class EdgeRenderer {
  constructor(private readonly edgeGraphics: Phaser.GameObjects.Graphics, private readonly cellSize: number) {}

  renderEdges(grid: GridReader, edgeColor: number): void {
    const edgeThickness = EDGE_THICKNESS_PX;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell) continue;

        const isStairs = cell.properties.has('stairs');
        const isElevated = grid.getLayer(cell) >= 1;
        const isWall = cell.properties.has('wall');
        const isPlatform = cell.properties.has('platform');

        if (!isElevated && !isStairs) continue;

        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const currentLayer = grid.getLayer(cell);

        this.edgeGraphics.lineStyle(edgeThickness, edgeColor, 1);

        if (col < grid.width - 1) {
          const rightCell = grid.cells[row][col + 1];
          const rightLayer = grid.getLayer(rightCell);
          const rightIsLower = rightLayer < currentLayer && !grid.isTransition(rightCell);
          const rightIsPlatform = rightCell?.properties.has('platform');
          const rightIsStairs = rightCell && grid.isTransition(rightCell);
          const rightIsWall = rightCell?.properties.has('wall');

          if (rightIsLower || (isWall && rightIsPlatform && !rightIsStairs) || (isStairs && rightIsWall) || (isWall && rightIsStairs)) {
            this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(
              x + this.cellSize, y,
              x + this.cellSize, y + this.cellSize
            ));
          }
        }

        if (col > 0) {
          const leftCell = grid.cells[row][col - 1];
          const leftLayer = grid.getLayer(leftCell);
          const leftIsLower = leftLayer < currentLayer && !grid.isTransition(leftCell);
          const leftIsPlatform = leftCell?.properties.has('platform');
          const leftIsStairs = leftCell && grid.isTransition(leftCell);
          const leftIsWall = leftCell?.properties.has('wall');

          if (leftIsLower || (isWall && leftIsPlatform && !leftIsStairs) || (isStairs && leftIsWall) || (isWall && leftIsStairs)) {
            this.edgeGraphics.lineStyle(edgeThickness / 2, edgeColor, 1);
            this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + this.cellSize));
            this.edgeGraphics.lineStyle(edgeThickness, edgeColor, 1);
          }
        }

        if (row > 0) {
          const topCell = grid.cells[row - 1][col];
          const topLayer = grid.getLayer(topCell);
          const topIsLower = topLayer < currentLayer && !grid.isTransition(topCell);
          const topIsPlatform = topCell?.properties.has('platform');
          const topIsStairs = topCell && grid.isTransition(topCell);
          const topIsWall = topCell?.properties.has('wall');

          if (((topIsLower || (isWall && topIsPlatform && !topIsStairs) || (isStairs && topIsWall) || (isWall && topIsStairs)) && !isStairs) || (isPlatform && topIsStairs)) {
            this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + this.cellSize, y));
          }
        }

        if (row < grid.height - 1 && !isStairs) {
          const bottomCell = grid.cells[row + 1][col];
          const bottomLayer = grid.getLayer(bottomCell);
          const bottomIsLower = bottomLayer < currentLayer && !grid.isTransition(bottomCell);
          const bottomIsPlatform = bottomCell?.properties.has('platform');
          const bottomIsStairs = bottomCell && grid.isTransition(bottomCell);

          if (bottomIsLower || (isWall && bottomIsPlatform && !bottomIsStairs)) {
            this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y + this.cellSize, x + this.cellSize, y + this.cellSize));
          }
        }
      }
    }
  }

  renderEdgeDarkening(grid: GridReader, levelData?: LevelData): void {
    const config = levelData?.background?.edgeDarkening;
    if (!config) return;

    const darkenSteps = config.depth;
    const maxIntensity = config.intensity;
    const stepsPerCell = DARKENING_STEPS_PER_CELL;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell || grid.getLayer(cell) < 1) continue;

        const distToEdge = Math.min(col, row, grid.width - 1 - col, grid.height - 1 - row);

        if (distToEdge < darkenSteps) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const stepSize = this.cellSize / stepsPerCell;

          for (let sy = 0; sy < stepsPerCell; sy++) {
            for (let sx = 0; sx < stepsPerCell; sx++) {
              const subX = x + sx * stepSize;
              const subY = y + sy * stepSize;

              const subDistToEdge = Math.min(
                col + sx / stepsPerCell,
                row + sy / stepsPerCell,
                grid.width - 1 - col - sx / stepsPerCell,
                grid.height - 1 - row - sy / stepsPerCell
              );

              const intensity = Math.max(0, 1 - subDistToEdge / darkenSteps);
              const alpha = maxIntensity * intensity;

              if (alpha > DARKENING_MIN_ALPHA) {
                this.edgeGraphics.fillStyle(0x000000, alpha);
                this.edgeGraphics.fillRect(subX, subY, stepSize, stepSize);
              }
            }
          }
        }
      }
    }
  }
}
