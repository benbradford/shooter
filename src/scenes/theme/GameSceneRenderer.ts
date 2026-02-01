import type { Grid } from '../../systems/grid/Grid';

export abstract class GameSceneRenderer {
  protected readonly graphics: Phaser.GameObjects.Graphics;

  constructor(protected readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-10);
  }

  abstract renderGrid(grid: Grid): void;
  abstract renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image };
  protected abstract renderBottomRow(x: number, y: number, cellSize: number, topBarY: number, seed: number): void;
  protected abstract getEdgeColor(): number;

  destroy(): void {
    this.graphics.destroy();
  }

  // eslint-disable-next-line complexity, max-depth
  protected renderLayer1Edges(grid: Grid, cellSize: number): void {
    const edgeThickness = 8;
    const edgeColor = this.getEdgeColor();

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.getLayer(cell) === 1) {
          const x = col * cellSize;
          const y = row * cellSize;

          if (cell.backgroundTexture) {
            const sprite = this.scene.add.image(x, y, cell.backgroundTexture);
            sprite.setOrigin(0, 0);
            sprite.setDisplaySize(cellSize, cellSize);
            sprite.setDepth(-100);
            continue;
          }

          this.graphics.lineStyle(edgeThickness, edgeColor, 1);

          if (col < grid.width - 1) {
            const rightCell = grid.cells[row][col + 1];
            const rightIsLayer0 = grid.getLayer(rightCell) === 0;
            if (rightIsLayer0) {
              this.graphics.strokeLineShape(new Phaser.Geom.Line(
                x + cellSize, y,
                x + cellSize, y + cellSize
              ));
            }
          }

          if (col > 0) {
            const leftCell = grid.cells[row][col - 1];
            const leftIsLayer0 = grid.getLayer(leftCell) === 0;
            if (leftIsLayer0) {
              this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + cellSize));
            }
          }

          if (row > 0 && grid.getLayer(grid.cells[row - 1][col]) === 0) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + cellSize, y));
          }

          if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) === 0 && !grid.isTransition(cell)) {
            const topBarY = y + (cellSize * 0.2);

            this.graphics.lineStyle(edgeThickness, edgeColor, 1);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, topBarY, x + cellSize, topBarY));

            const seed = col * 1000 + row;
            this.renderBottomRow(x, y, cellSize, topBarY, seed);
          }
        }
      }
    }
  }
}
