import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';

export abstract class GameSceneRenderer {
  protected readonly graphics: Phaser.GameObjects.Graphics;
  protected readonly edgeGraphics: Phaser.GameObjects.Graphics;

  constructor(protected readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-10);
    this.edgeGraphics = scene.add.graphics();
    this.edgeGraphics.setDepth(0);
  }

  abstract renderGrid(grid: Grid, levelData?: LevelData): void;
  abstract renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image };
  protected abstract renderWallPattern(x: number, y: number, cellSize: number, topBarY: number, seed: number): void;
  protected abstract getEdgeColor(): number;
  protected abstract getPlatformFillColor(): number;

  destroy(): void {
    this.graphics.destroy();
    this.edgeGraphics.destroy();
  }

  // eslint-disable-next-line complexity
  protected renderPlatformsAndWalls(grid: Grid, cellSize: number, levelData?: LevelData): void {
    const edgeThickness = 8;
    const edgeColor = this.getEdgeColor();

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        
        const levelCell = levelData?.cells.find(c => c.col === col && c.row === row);
        const hasTexture = !!levelCell?.backgroundTexture;
        
        const isStairs = cell && grid.isTransition(cell);
        const isElevated = cell && grid.getLayer(cell) >= 1;

        if (isElevated || isStairs) {
          const x = col * cellSize;
          const y = row * cellSize;

          // Fill platforms (not stairs or walls) - skip if has texture
          if (!hasTexture && !isStairs && !grid.isWall(cell)) {
            this.graphics.fillStyle(this.getPlatformFillColor(), 1);
            this.graphics.fillRect(x, y, cellSize, cellSize);
          }

          // Use edgeGraphics for textured cells, regular graphics otherwise
          const gfx = hasTexture ? this.edgeGraphics : this.graphics;
          gfx.lineStyle(edgeThickness, edgeColor, 1);

          const currentLayer = isStairs ? grid.getLayer(cell) : grid.getLayer(cell);
          const isPlatform = !isStairs && !grid.isWall(cell);

          if (col < grid.width - 1) {
            const rightCell = grid.cells[row][col + 1];
            const rightLayer = grid.getLayer(rightCell);
            const rightIsLower = rightLayer < currentLayer && !grid.isTransition(rightCell);
            const rightIsWall = grid.isWall(rightCell);
            const rightIsSameLayer = rightLayer === currentLayer;
            const isWall = grid.isWall(cell);

            // Platforms: only draw edge if adjacent is lower or wall at same layer
            // Walls: only draw edge if adjacent is lower
            // Stairs: draw edge if adjacent is wall at any layer
            // eslint-disable-next-line max-depth
            if (isPlatform && (rightIsLower || (rightIsWall && rightIsSameLayer))) {
              gfx.strokeLineShape(new Phaser.Geom.Line(
                x + cellSize, y,
                x + cellSize, y + cellSize
              ));
            } else if (isWall && rightIsLower) {
              gfx.strokeLineShape(new Phaser.Geom.Line(
                x + cellSize, y,
                x + cellSize, y + cellSize
              ));
            } else if (isStairs && rightIsWall) {
              gfx.strokeLineShape(new Phaser.Geom.Line(
                x + cellSize, y,
                x + cellSize, y + cellSize
              ));
            }
          }

          if (col > 0) {
            const leftCell = grid.cells[row][col - 1];
            const leftLayer = grid.getLayer(leftCell);
            const leftIsLower = leftLayer < currentLayer && !grid.isTransition(leftCell);
            const leftIsWall = grid.isWall(leftCell);
            const leftIsSameLayer = leftLayer === currentLayer;
            const isWall = grid.isWall(cell);

            // Platforms: only draw edge if adjacent is lower or wall at same layer
            // Walls: only draw edge if adjacent is lower
            // Stairs: draw edge if adjacent is wall at any layer
            if (isPlatform && (leftIsLower || (leftIsWall && leftIsSameLayer))) {
              gfx.lineStyle(edgeThickness / 2, edgeColor, 1);
              gfx.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + cellSize));
              gfx.lineStyle(edgeThickness, edgeColor, 1);
            } else if (isWall && leftIsLower) {
              gfx.lineStyle(edgeThickness / 2, edgeColor, 1);
              gfx.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + cellSize));
              gfx.lineStyle(edgeThickness, edgeColor, 1);
            } else if (isStairs && leftIsWall) {
              gfx.lineStyle(edgeThickness / 2, edgeColor, 1);
              gfx.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + cellSize));
              gfx.lineStyle(edgeThickness, edgeColor, 1);
            }
          }

          if (row > 0 && grid.getLayer(grid.cells[row - 1][col]) < currentLayer && !grid.isTransition(grid.cells[row - 1][col])) {
            // Don't draw top edge for stairs (they have the bar instead)
            if (!isStairs) {
              gfx.strokeLineShape(new Phaser.Geom.Line(x, y, x + cellSize, y));
            }
          }

          if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) < currentLayer && grid.isWall(cell)) {
            // Only draw top edge line if no texture
            if (!hasTexture) {
              gfx.lineStyle(edgeThickness, edgeColor, 1);
              gfx.strokeLineShape(new Phaser.Geom.Line(x, y, x + cellSize, y));
            }

            // Skip wall pattern if cell has texture
            if (!hasTexture) {
              const topBarY = y + (cellSize * 0.2);
              const seed = col * 1000 + row;
              this.renderWallPattern(x, y, cellSize, topBarY, seed);
            }
          }
        }
      }
    }
  }
}
