import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';
import { TransformComponent } from '../core/TransformComponent';
import { ShadowComponent } from './ShadowComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';

export class WaterEffectComponent implements Component {
  entity!: Entity;
  private isInWater: boolean = false;
  private hopProgress: number = 1;
  private targetX: number = 0;
  private targetY: number = 0;
  private startX: number = 0;
  private startY: number = 0;

  isHopping(): boolean {
    return this.hopProgress < 1;
  }

  private isPointInWater(x: number, y: number, grid: any, col: number, row: number): boolean {
    const cellWorld = grid.cellToWorld(col, row);
    const centerX = cellWorld.x + grid.cellSize / 2;
    const centerY = cellWorld.y + grid.cellSize / 2;
    const radius = grid.cellSize * 0.4;

    // Check center circle
    const distToCenter = Math.hypot(x - centerX, y - centerY);
    if (distToCenter <= radius) return true;

    // Check rectangles to neighbors
    const hasLeft = grid.getCell(col - 1, row)?.properties.has('water');
    const hasRight = grid.getCell(col + 1, row)?.properties.has('water');
    const hasUp = grid.getCell(col, row - 1)?.properties.has('water');
    const hasDown = grid.getCell(col, row + 1)?.properties.has('water');

    if (hasLeft && x < centerX && Math.abs(y - centerY) <= radius) return true;
    if (hasRight && x > centerX && Math.abs(y - centerY) <= radius) return true;
    if (hasUp && y < centerY && Math.abs(x - centerX) <= radius) return true;
    if (hasDown && y > centerY && Math.abs(x - centerX) <= radius) return true;

    // Check corner fills
    const innerRadius = grid.cellSize / 2 - radius;
    if (hasLeft && hasUp) {
      const dx = x - cellWorld.x;
      const dy = y - cellWorld.y;
      if (dx * dx + dy * dy >= innerRadius * innerRadius) return true;
    }
    if (hasRight && hasUp) {
      const dx = x - (cellWorld.x + grid.cellSize);
      const dy = y - cellWorld.y;
      if (dx * dx + dy * dy >= innerRadius * innerRadius) return true;
    }
    if (hasLeft && hasDown) {
      const dx = x - cellWorld.x;
      const dy = y - (cellWorld.y + grid.cellSize);
      if (dx * dx + dy * dy >= innerRadius * innerRadius) return true;
    }
    if (hasRight && hasDown) {
      const dx = x - (cellWorld.x + grid.cellSize);
      const dy = y - (cellWorld.y + grid.cellSize);
      if (dx * dx + dy * dy >= innerRadius * innerRadius) return true;
    }

    return false;
  }

  update(delta: number): void {
    const sprite = this.entity.get(SpriteComponent);
    const shadow = this.entity.get(ShadowComponent);
    const transform = this.entity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const gridCollision = this.entity.get(GridCollisionComponent);

    if (!sprite || !transform || !gridPos || !gridCollision) return;

    const grid = gridCollision.getGrid();

    // Check all 4 corners of collision box
    const boxLeft = transform.x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxRight = transform.x + gridPos.collisionBox.offsetX + gridPos.collisionBox.width / 2;
    const boxTop = transform.y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxBottom = transform.y + gridPos.collisionBox.offsetY + gridPos.collisionBox.height / 2;

    const corners = [
      { x: boxLeft, y: boxTop },
      { x: boxRight, y: boxTop },
      { x: boxLeft, y: boxBottom },
      { x: boxRight, y: boxBottom }
    ];

    let waterCornerCount = 0;

    for (const corner of corners) {
      const cornerCell = grid.worldToCell(corner.x, corner.y);
      const cornerCellData = grid.getCell(cornerCell.col, cornerCell.row);
      const cornerCellHasWater = cornerCellData?.properties.has('water') ?? false;

      if (cornerCellHasWater && this.isPointInWater(corner.x, corner.y, grid, cornerCell.col, cornerCell.row)) {
        waterCornerCount++;
      }
    }

    // Determine water state - require at least 2 corners in water to hop in, 3+ to stay in
    let nowInWater = false;
    if (!this.isInWater && waterCornerCount >= 2) {
      nowInWater = true; // Hop in
    } else if (this.isInWater && waterCornerCount >= 3) {
      nowInWater = true; // Stay in
    } else if (this.isInWater && waterCornerCount < 3) {
      nowInWater = false; // Hop out
    } else {
      nowInWater = this.isInWater; // Keep current state
    }

    if (shadow) {
      shadow.shadow.setVisible(!nowInWater);
    }

    // Detect water entry/exit (only when not already hopping)
    if (nowInWater !== this.isInWater && this.hopProgress >= 1) {
      this.isInWater = nowInWater;
      this.hopProgress = 0;
      this.startX = transform.x;
      this.startY = transform.y;

      // Always hop to center of current cell
      const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
      const spriteHeight = sprite.sprite.displayHeight;
      this.targetX = cellWorld.x + grid.cellSize / 2;
      this.targetY = cellWorld.y + grid.cellSize / 2 - spriteHeight / 4;
    }

    // Animate hop - lerp to target
    if (this.hopProgress < 1) {
      this.hopProgress = Math.min(1, this.hopProgress + delta / 300);

      transform.x = this.startX + (this.targetX - this.startX) * this.hopProgress;
      transform.y = this.startY + (this.targetY - this.startY) * this.hopProgress;

      console.log('[Water] Hopping progress:', this.hopProgress.toFixed(2), 'pos:', transform.x.toFixed(0), transform.y.toFixed(0));

      const hopHeight = Math.sin(this.hopProgress * Math.PI) * -20;
      sprite.sprite.y = transform.y + hopHeight;
    } else {
      sprite.sprite.y = transform.y;
    }
  }

  onDestroy(): void {
    // No cleanup needed
  }
}

