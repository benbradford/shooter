import type { GridReader } from '../../systems/grid/Grid';
import type { CellProperty } from '../../systems/grid/CellData';

const PATH_RADIUS_FACTOR = 0.4;
const PATH_FILL_COLOR = 0x888888;
const WATER_FILL_COLOR = 0x4488ff;
const WATER_OUTLINE_COLOR = 0x000000;
const WATER_OUTLINE_STROKE_WIDTH_PX = 3;
const PATH_EDGE_DARK_COLOR = 0x3a3530;
const PATH_EDGE_BLEND_PASSES = 3;
const PATH_EDGE_BLEND_WIDTH_PX = 4;

export class PathRenderer {
  constructor(private readonly graphics: Phaser.GameObjects.Graphics, private readonly cellSize: number) {}

  renderGreyPaths(grid: GridReader): void {
    this.renderPathType(grid, 'path', PATH_FILL_COLOR, PATH_EDGE_DARK_COLOR);
    this.renderWaterOutlined(grid);
  }

  renderUntexturedPaths(grid: GridReader, pathTexture: string | undefined): void {
    if (pathTexture) return;
    const radius = this.cellSize * PATH_RADIUS_FACTOR;

    for (let pass = PATH_EDGE_BLEND_PASSES; pass >= 0; pass--) {
      const expand = pass * (PATH_EDGE_BLEND_WIDTH_PX / PATH_EDGE_BLEND_PASSES);
      const alpha = pass === 0 ? 1.0 : (1 - pass / (PATH_EDGE_BLEND_PASSES + 1)) * 0.4;
      const r = radius + expand;

      this.graphics.fillStyle(PATH_FILL_COLOR, alpha);

      for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
          if (!grid.getCell(col, row)?.properties.has('path')) continue;

          const centerX = col * this.cellSize + this.cellSize / 2;
          const centerY = row * this.cellSize + this.cellSize / 2;

          const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has('path');
          const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has('path');
          const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has('path');
          const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has('path');

          if (hasLeft) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - r, this.cellSize / 2 + 1, r * 2);
          if (hasRight) this.graphics.fillRect(centerX - 1, centerY - r, this.cellSize / 2 + 1, r * 2);
          if (hasUp) this.graphics.fillRect(centerX - r, centerY - this.cellSize / 2, r * 2, this.cellSize / 2 + 1);
          if (hasDown) this.graphics.fillRect(centerX - r, centerY - 1, r * 2, this.cellSize / 2 + 1);

          if (hasLeft && hasUp) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - this.cellSize / 2, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);
          if (hasRight && hasUp) this.graphics.fillRect(centerX + radius - expand, centerY - this.cellSize / 2, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);
          if (hasLeft && hasDown) this.graphics.fillRect(centerX - this.cellSize / 2, centerY + radius - expand, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);
          if (hasRight && hasDown) this.graphics.fillRect(centerX + radius - expand, centerY + radius - expand, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);

          this.graphics.fillCircle(centerX, centerY, r);
        }
      }
    }
  }

  private renderWaterOutlined(grid: GridReader): void {
    const radius = this.cellSize * PATH_RADIUS_FACTOR;
    const propertyType: CellProperty = 'water';

    this.graphics.fillStyle(WATER_FILL_COLOR, 1);
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell?.properties.has(propertyType)) continue;

        const x = col * this.cellSize;
        const centerX = x + this.cellSize / 2;
        const centerY = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

        const adjacentCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
        const isDeadEnd = adjacentCount === 1;

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

    this.graphics.lineStyle(WATER_OUTLINE_STROKE_WIDTH_PX, WATER_OUTLINE_COLOR, 1);
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
          if (!hasLeft && !hasUp) { this.graphics.beginPath(); this.graphics.arc(x, y, radius, Math.PI, -Math.PI / 2, false); this.graphics.strokePath(); }
          else if (!hasLeft && hasUp) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y, x - radius, y - this.cellSize / 2)); }
          else if (hasLeft && !hasUp) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y - radius, x - this.cellSize / 2, y - radius)); }

          if (!hasRight && !hasUp) { this.graphics.beginPath(); this.graphics.arc(x, y, radius, -Math.PI / 2, 0, false); this.graphics.strokePath(); }
          else if (!hasRight && hasUp) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y, x + radius, y - this.cellSize / 2)); }
          else if (hasRight && !hasUp) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y - radius, x + this.cellSize / 2, y - radius)); }

          if (!hasLeft && !hasDown) { this.graphics.beginPath(); this.graphics.arc(x, y, radius, Math.PI / 2, Math.PI, false); this.graphics.strokePath(); }
          else if (!hasLeft && hasDown) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y, x - radius, y + this.cellSize / 2)); }
          else if (hasLeft && !hasDown) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y + radius, x - this.cellSize / 2, y + radius)); }

          if (!hasRight && !hasDown) { this.graphics.beginPath(); this.graphics.arc(x, y, radius, 0, Math.PI / 2, false); this.graphics.strokePath(); }
          else if (!hasRight && hasDown) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y, x + radius, y + this.cellSize / 2)); }
          else if (hasRight && !hasDown) { this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y + radius, x + this.cellSize / 2, y + radius)); }
        }

        const innerRadius = this.cellSize / 2 - radius;
        if (hasLeft && hasUp && !grid.getCell(col - 1, row - 1)?.properties.has(propertyType)) {
          this.graphics.beginPath(); this.graphics.arc(x - this.cellSize / 2, y - this.cellSize / 2, innerRadius, 0, Math.PI / 2, false); this.graphics.strokePath();
        }
        if (hasRight && hasUp && !grid.getCell(col + 1, row - 1)?.properties.has(propertyType)) {
          this.graphics.beginPath(); this.graphics.arc(x + this.cellSize / 2, y - this.cellSize / 2, innerRadius, Math.PI / 2, Math.PI, false); this.graphics.strokePath();
        }
        if (hasLeft && hasDown && !grid.getCell(col - 1, row + 1)?.properties.has(propertyType)) {
          this.graphics.beginPath(); this.graphics.arc(x - this.cellSize / 2, y + this.cellSize / 2, innerRadius, -Math.PI / 2, 0, false); this.graphics.strokePath();
        }
        if (hasRight && hasDown && !grid.getCell(col + 1, row + 1)?.properties.has(propertyType)) {
          this.graphics.beginPath(); this.graphics.arc(x + this.cellSize / 2, y + this.cellSize / 2, innerRadius, Math.PI, -Math.PI / 2, false); this.graphics.strokePath();
        }
      }
    }
  }

  private renderPathType(grid: GridReader, propertyType: CellProperty, fillColor: number, _outlineColor: number): void {
    const radius = this.cellSize * PATH_RADIUS_FACTOR;

    for (let pass = PATH_EDGE_BLEND_PASSES; pass >= 0; pass--) {
      const expand = pass * (PATH_EDGE_BLEND_WIDTH_PX / PATH_EDGE_BLEND_PASSES);
      const alpha = pass === 0 ? 1.0 : (1 - pass / (PATH_EDGE_BLEND_PASSES + 1)) * 0.4;
      const r = radius + expand;

      this.graphics.fillStyle(fillColor, alpha);

      for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
          const cell = grid.getCell(col, row);
          if (!cell?.properties.has(propertyType)) continue;

          const x = col * this.cellSize;
          const centerX = x + this.cellSize / 2;
          const centerY = row * this.cellSize + this.cellSize / 2;

          const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
          const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
          const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
          const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

          const adjacentCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
          const isDeadEnd = adjacentCount === 1;

          if (hasLeft) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - r, this.cellSize / 2 + 1, r * 2);
          if (hasRight) this.graphics.fillRect(centerX - 1, centerY - r, this.cellSize / 2 + 1, r * 2);
          if (hasUp) this.graphics.fillRect(centerX - r, centerY - this.cellSize / 2, r * 2, this.cellSize / 2 + 1);
          if (hasDown) this.graphics.fillRect(centerX - r, centerY - 1, r * 2, this.cellSize / 2 + 1);

          if (hasLeft && hasUp) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - this.cellSize / 2, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);
          if (hasRight && hasUp) this.graphics.fillRect(centerX + radius - expand, centerY - this.cellSize / 2, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);
          if (hasLeft && hasDown) this.graphics.fillRect(centerX - this.cellSize / 2, centerY + radius - expand, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);
          if (hasRight && hasDown) this.graphics.fillRect(centerX + radius - expand, centerY + radius - expand, this.cellSize / 2 - radius + expand, this.cellSize / 2 - radius + expand);

          if (isDeadEnd) {
            this.graphics.fillRect(centerX - r, centerY - r, r * 2, r * 2);
          } else {
            this.graphics.fillCircle(centerX, centerY, r);
          }
        }
      }
    }

    this.graphics.fillStyle(PATH_EDGE_DARK_COLOR, 0.3);
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell?.properties.has(propertyType)) continue;

        const x = col * this.cellSize;
        const centerX = x + this.cellSize / 2;
        const centerY = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

        const adjacentCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
        const isDeadEnd = adjacentCount === 1;
        const outerR = radius + PATH_EDGE_BLEND_WIDTH_PX * 0.6;

        if (!hasLeft) this.graphics.fillRect(centerX - outerR, centerY - outerR, 2, outerR * 2);
        if (!hasRight) this.graphics.fillRect(centerX + outerR - 2, centerY - outerR, 2, outerR * 2);
        if (!hasUp) this.graphics.fillRect(centerX - outerR, centerY - outerR, outerR * 2, 2);
        if (!hasDown) this.graphics.fillRect(centerX - outerR, centerY + outerR - 2, outerR * 2, 2);

        if (!isDeadEnd) {
          if (!hasLeft && !hasUp) this.graphics.fillCircle(centerX, centerY, outerR);
          if (!hasRight && !hasUp) this.graphics.fillCircle(centerX, centerY, outerR);
          if (!hasLeft && !hasDown) this.graphics.fillCircle(centerX, centerY, outerR);
          if (!hasRight && !hasDown) this.graphics.fillCircle(centerX, centerY, outerR);
        }
      }
    }
  }
}
