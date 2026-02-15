import { GameSceneRenderer } from './GameSceneRenderer';
import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';

const EDGE_COLOR = 0x3a5a2e;

export class GrassSceneRenderer extends GameSceneRenderer {
  protected getEdgeColor(): number {
    return EDGE_COLOR;
  }

  renderGrid(grid: Grid, levelData?: LevelData): void {
    super.renderGrid(grid, levelData);
    this.renderPaths(grid);
  }

  private renderPaths(grid: Grid): void {
    const pathColor = 0x888888;
    const outlineColor = 0x000000;
    const radius = this.cellSize * 0.4;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell || !cell.properties.has('path')) continue;

        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has('path');
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has('path');
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has('path');
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has('path');

        this.graphics.fillStyle(pathColor, 1);

        if (hasLeft) {
          this.graphics.fillRect(x - this.cellSize / 2, y - radius, this.cellSize / 2 + 1, radius * 2);
        }
        if (hasRight) {
          this.graphics.fillRect(x - 1, y - radius, this.cellSize / 2 + 1, radius * 2);
        }
        if (hasUp) {
          this.graphics.fillRect(x - radius, y - this.cellSize / 2, radius * 2, this.cellSize / 2 + 1);
        }
        if (hasDown) {
          this.graphics.fillRect(x - radius, y - 1, radius * 2, this.cellSize / 2 + 1);
        }

        this.graphics.fillCircle(x, y, radius);
      }
    }

    this.graphics.lineStyle(3, outlineColor, 1);
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell || !cell.properties.has('path')) continue;

        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has('path');
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has('path');
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has('path');
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has('path');

        if (!hasLeft && !hasUp) {
          this.graphics.beginPath();
          this.graphics.arc(x, y, radius, Math.PI, -Math.PI / 2, false);
          this.graphics.strokePath();
        } else if (!hasLeft && hasUp) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y, x - radius, y - this.cellSize / 2));
        } else if (hasLeft && !hasUp) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y - radius, x - this.cellSize / 2, y - radius));
        }

        if (!hasRight && !hasUp) {
          this.graphics.beginPath();
          this.graphics.arc(x, y, radius, -Math.PI / 2, 0, false);
          this.graphics.strokePath();
        } else if (!hasRight && hasUp) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y, x + radius, y - this.cellSize / 2));
        } else if (hasRight && !hasUp) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y - radius, x + this.cellSize / 2, y - radius));
        }

        if (!hasLeft && !hasDown) {
          this.graphics.beginPath();
          this.graphics.arc(x, y, radius, Math.PI / 2, Math.PI, false);
          this.graphics.strokePath();
        } else if (!hasLeft && hasDown) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y, x - radius, y + this.cellSize / 2));
        } else if (hasLeft && !hasDown) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y + radius, x - this.cellSize / 2, y + radius));
        }

        if (!hasRight && !hasDown) {
          this.graphics.beginPath();
          this.graphics.arc(x, y, radius, 0, Math.PI / 2, false);
          this.graphics.strokePath();
        } else if (!hasRight && hasDown) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y, x + radius, y + this.cellSize / 2));
        } else if (hasRight && !hasDown) {
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y + radius, x + this.cellSize / 2, y + radius));
        }
      }
    }
  }

  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    if (this.scene.textures.exists('grass_gradient')) {
      this.scene.textures.remove('grass_gradient');
    }

    const canvas = this.scene.textures.createCanvas('grass_gradient', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, '#6b9b4a');
    bgGradient.addColorStop(0.5, '#5a8a3a');
    bgGradient.addColorStop(1, '#4a7a2a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'grass_gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(-1000);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(1000);
    vignette.setAlpha(0.25);
    vignette.setTint(0x224422);
    vignette.setBlendMode(2);

    return { background, vignette };
  }
}
