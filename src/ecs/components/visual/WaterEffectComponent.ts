import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';
import { TransformComponent } from '../core/TransformComponent';
import { ShadowComponent } from './ShadowComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { WalkComponent } from '../movement/WalkComponent';

export class WaterEffectComponent implements Component {
  entity!: Entity;
  private isInWater: boolean = false;
  private hopProgress: number = 1;
  private targetX: number = 0;
  private targetY: number = 0;
  private startX: number = 0;
  private startY: number = 0;

  getIsInWater(): boolean {
    return this.isInWater && this.hopProgress >= 1;
  }

  isHopping(): boolean {
    return this.hopProgress < 1;
  }

  update(delta: number): void {
    const sprite = this.entity.get(SpriteComponent);
    const shadow = this.entity.get(ShadowComponent);
    const transform = this.entity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const gridCollision = this.entity.get(GridCollisionComponent);
    const walk = this.entity.get(WalkComponent);

    if (!sprite || !transform || !gridPos || !gridCollision) return;

    const grid = gridCollision.getGrid();
    const currentCell = grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
    const isCurrentCellWater = currentCell?.properties.has('water') ?? false;

    // Determine water state
    let nowInWater = false;

    if (this.isInWater) {
      // Already in water - check if should exit
      if (walk && isCurrentCellWater) {
        const moveX = walk.lastMoveX;
        const moveY = walk.lastMoveY;

        if (moveX !== 0 || moveY !== 0) {
          // Check cell in movement direction
          const checkCol = moveX > 0 ? gridPos.currentCell.col + 1 : moveX < 0 ? gridPos.currentCell.col - 1 : gridPos.currentCell.col;
          const checkRow = moveY > 0 ? gridPos.currentCell.row + 1 : moveY < 0 ? gridPos.currentCell.row - 1 : gridPos.currentCell.row;
          const nextCell = grid.getCell(checkCol, checkRow);
          const isNextCellDry = !nextCell?.properties.has('water');

          if (isNextCellDry) {
            // Check distance to edge in movement direction
            const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
            const cellCenterX = cellWorld.x + grid.cellSize / 2;
            const cellCenterY = cellWorld.y + grid.cellSize / 2;
            const halfCell = grid.cellSize / 2;

            // Calculate distance to the edge in movement direction
            let distToEdge = Infinity;
            if (moveX < 0) {
              distToEdge = transform.x - (cellCenterX - halfCell); // Distance to left edge
            } else if (moveX > 0) {
              distToEdge = (cellCenterX + halfCell) - transform.x; // Distance to right edge
            } else if (moveY < 0) {
              distToEdge = transform.y - (cellCenterY - halfCell); // Distance to top edge
            } else if (moveY > 0) {
              distToEdge = (cellCenterY + halfCell) - transform.y; // Distance to bottom edge
            }

            // Exit if within half cell of edge
            if (distToEdge <= halfCell / 2) {
              nowInWater = false;
            } else {
              nowInWater = true;
            }
          } else {
            nowInWater = true;
          }
        } else {
          nowInWater = isCurrentCellWater;
        }
      } else {
        nowInWater = isCurrentCellWater;
      }
    } else {
      // Not in water - check if should enter
      nowInWater = isCurrentCellWater;
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

      // Find the target cell to hop to
      let targetCol = gridPos.currentCell.col;
      let targetRow = gridPos.currentCell.row;

      if (nowInWater) {
        // Entering water - hop to current cell center
        targetCol = gridPos.currentCell.col;
        targetRow = gridPos.currentCell.row;
       } else if (walk) {
        // Exiting water - hop to the adjacent dry cell in movement direction
        const moveX = walk.lastMoveX;
        const moveY = walk.lastMoveY;
        targetCol = moveX > 0 ? gridPos.currentCell.col + 1 : moveX < 0 ? gridPos.currentCell.col - 1 : gridPos.currentCell.col;
        targetRow = moveY > 0 ? gridPos.currentCell.row + 1 : moveY < 0 ? gridPos.currentCell.row - 1 : gridPos.currentCell.row;
      }

      const cellWorld = grid.cellToWorld(targetCol, targetRow);
      const spriteHeight = sprite.sprite.displayHeight;
      this.targetX = cellWorld.x + grid.cellSize / 2;
      this.targetY = cellWorld.y + grid.cellSize / 2 - spriteHeight / 4;
    }

    // Animate hop - lerp to target
    if (this.hopProgress < 1) {
      this.hopProgress = Math.min(1, this.hopProgress + delta / 300);

      transform.x = this.startX + (this.targetX - this.startX) * this.hopProgress;
      transform.y = this.startY + (this.targetY - this.startY) * this.hopProgress;

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

