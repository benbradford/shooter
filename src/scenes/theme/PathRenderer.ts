import type { GridReader } from '../../systems/grid/Grid';
import type { CellProperty } from '../../systems/grid/CellData';

const PATH_RADIUS_FACTOR = 0.4;
const PATH_FILL_COLOR = 0x888888;
const WATER_FILL_COLOR = 0x4488ff;
const PATH_OUTLINE_COLOR = 0x000000;
const PATH_OUTLINE_WIDTH_PX = 2;
const PATH_OUTLINE_STROKE_WIDTH_PX = 3;

export class PathRenderer {
  constructor(private readonly graphics: Phaser.GameObjects.Graphics, private readonly cellSize: number) {}

  renderGreyPaths(grid: GridReader): void {
    this.renderPathType(grid, 'path', PATH_FILL_COLOR, PATH_OUTLINE_COLOR);
    this.renderPathType(grid, 'water', WATER_FILL_COLOR, PATH_OUTLINE_COLOR);
  }

  renderUntexturedPaths(grid: GridReader, pathTexture: string | undefined): void {
    if (pathTexture) return;
    const radius = this.cellSize * PATH_RADIUS_FACTOR;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        if (!grid.getCell(col, row)?.properties.has('path')) continue;

        const centerX = col * this.cellSize + this.cellSize / 2;
        const centerY = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has('path');
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has('path');
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has('path');
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has('path');

        this.graphics.fillStyle(PATH_FILL_COLOR, 1);

        if (hasLeft) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - radius, this.cellSize / 2 + 1, radius * 2);
        if (hasRight) this.graphics.fillRect(centerX - 1, centerY - radius, this.cellSize / 2 + 1, radius * 2);
        if (hasUp) this.graphics.fillRect(centerX - radius, centerY - this.cellSize / 2, radius * 2, this.cellSize / 2 + 1);
        if (hasDown) this.graphics.fillRect(centerX - radius, centerY - 1, radius * 2, this.cellSize / 2 + 1);

        if (hasLeft && hasUp) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasRight && hasUp) this.graphics.fillRect(centerX + radius, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasLeft && hasDown) this.graphics.fillRect(centerX - this.cellSize / 2, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasRight && hasDown) this.graphics.fillRect(centerX + radius, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);

        this.graphics.fillCircle(centerX, centerY, radius);
        this.graphics.lineStyle(PATH_OUTLINE_WIDTH_PX, PATH_OUTLINE_COLOR, 1);
        this.graphics.strokeCircle(centerX, centerY, radius);
      }
    }
  }

  private renderPathType(grid: GridReader, propertyType: CellProperty, fillColor: number, outlineColor: number): void {
    const radius = this.cellSize * PATH_RADIUS_FACTOR;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell?.properties.has(propertyType)) continue;

        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

        const adjacentCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
        const isDeadEnd = adjacentCount === 1;

        this.graphics.fillStyle(fillColor, 1);

        if (hasLeft) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - radius, this.cellSize / 2 + 1, radius * 2);
        if (hasRight) this.graphics.fillRect(centerX - 1, centerY - radius, this.cellSize / 2 + 1, radius * 2);
        if (hasUp) this.graphics.fillRect(centerX - radius, centerY - this.cellSize / 2, radius * 2, this.cellSize / 2 + 1);
        if (hasDown) this.graphics.fillRect(centerX - radius, centerY - 1, radius * 2, this.cellSize / 2 + 1);

        if (hasLeft && hasUp) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasRight && hasUp) this.graphics.fillRect(centerX + radius, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasLeft && hasDown) this.graphics.fillRect(centerX - this.cellSize / 2, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasRight && hasDown) this.graphics.fillRect(centerX + radius, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);

        if (isDeadEnd) {
          this.graphics.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        } else {
          this.graphics.fillCircle(centerX, centerY, radius);
        }
      }
    }

    this.graphics.lineStyle(PATH_OUTLINE_STROKE_WIDTH_PX, outlineColor, 1);
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell?.properties.has(propertyType)) continue;

        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

        const adjacentCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
        const isDeadEnd = adjacentCount === 1;

        if (isDeadEnd) {
          if (hasLeft || hasRight) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - radius, x - radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y - radius, x + radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y + radius, x + radius, y + radius));
          } else if (hasUp) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - this.cellSize / 2, x - radius, y + radius));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y - this.cellSize / 2, x + radius, y + radius));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y + radius, x + radius, y + radius));
          } else if (hasDown) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - radius, x - radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y - radius, x + radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - radius, x + radius, y - radius));
          }
        } else {
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

        const innerRadius = this.cellSize / 2 - radius;
        if (hasLeft && hasUp && !grid.getCell(col - 1, row - 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x - this.cellSize / 2, y - this.cellSize / 2, innerRadius, 0, Math.PI / 2, false);
          this.graphics.strokePath();
        }
        if (hasRight && hasUp && !grid.getCell(col + 1, row - 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x + this.cellSize / 2, y - this.cellSize / 2, innerRadius, Math.PI / 2, Math.PI, false);
          this.graphics.strokePath();
        }
        if (hasLeft && hasDown && !grid.getCell(col - 1, row + 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x - this.cellSize / 2, y + this.cellSize / 2, innerRadius, -Math.PI / 2, 0, false);
          this.graphics.strokePath();
        }
        if (hasRight && hasDown && !grid.getCell(col + 1, row + 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x + this.cellSize / 2, y + this.cellSize / 2, innerRadius, Math.PI, -Math.PI / 2, false);
          this.graphics.strokePath();
        }
      }
    }
  }
}
