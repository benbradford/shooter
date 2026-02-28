import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';
import { TransformComponent } from '../core/TransformComponent';
import { ShadowComponent } from './ShadowComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { WalkComponent } from '../movement/WalkComponent';
import type { Grid } from '../../../systems/grid/Grid';

export class WaterEffectComponent implements Component {
  entity!: Entity;
  private isInWater: boolean = false;
  private hopProgress: number = 1;
  private targetX: number = 0;
  private targetY: number = 0;
  private startX: number = 0;
  private startY: number = 0;
  private shadowMask?: Phaser.Display.Masks.GeometryMask;
  private shadowMaskGraphics?: Phaser.GameObjects.Graphics;
  private lastMaskCell: { col: number; row: number } = { col: -1, row: -1 };

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
    const isCurrentCellBridge = currentCell?.properties.has('bridge') ?? false;

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
          const isNextCellBridge = nextCell?.properties.has('bridge') ?? false;
          const isNextCellBlocked = nextCell?.properties.has('blocked') || nextCell?.properties.has('platform') || nextCell?.properties.has('wall') || false;

          if (isNextCellDry && !isNextCellBridge && !isCurrentCellBridge && !isNextCellBlocked) {
            const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
            const cellCenterX = cellWorld.x + grid.cellSize / 2;
            const cellCenterY = cellWorld.y + grid.cellSize / 2;
            const halfCell = grid.cellSize / 2;

            let distToEdge = Infinity;
            if (moveX < 0) {
              distToEdge = transform.x - (cellCenterX - halfCell);
            } else if (moveX > 0) {
              distToEdge = (cellCenterX + halfCell) - transform.x;
            } else if (moveY < 0) {
              distToEdge = transform.y - (cellCenterY - halfCell);
            } else if (moveY > 0) {
              distToEdge = (cellCenterY + halfCell) - transform.y;
            }

            if (distToEdge <= halfCell / 2) {
              nowInWater = false;
            } else {
              nowInWater = true;
            }
          } else {
            nowInWater = true;
          }
        } else {
          nowInWater = isCurrentCellWater || isCurrentCellBridge;
        }
      } else {
        nowInWater = isCurrentCellWater || isCurrentCellBridge;
      }
    } else {
      // Not in water - check if should enter
      nowInWater = isCurrentCellWater && !isCurrentCellBridge;
    }

    if (shadow) {
      const shouldBeVisible = !nowInWater && this.hopProgress >= 1;
      
      if (nowInWater && this.hopProgress >= 1) {
        // Shadow visible but faded and below player when swimming
        shadow.shadow.setVisible(true);
        shadow.shadow.setAlpha(0.6);
        shadow.shadow.setDepth(Depth.shadowSwimming);
        
        // Update shadow mask if player moved to different cell
        if (gridPos.currentCell.col !== this.lastMaskCell.col || gridPos.currentCell.row !== this.lastMaskCell.row) {
          this.updateShadowMask(shadow, gridPos, gridCollision.getGrid());
          this.lastMaskCell = { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
        }
      } else if (shouldBeVisible) {
        // Normal shadow when not in water
        shadow.shadow.setVisible(true);
        shadow.shadow.setAlpha(1);
        shadow.shadow.setDepth(Depth.shadow);
        shadow.shadow.clearMask();
      } else {
        // Hidden during hop
        shadow.shadow.setVisible(false);
        shadow.shadow.clearMask();
      }
    }

    // Adjust sprite depth based on swimming state
    if (nowInWater && this.hopProgress >= 1) {
      // Swimming - render above water (-10) but below bridge textures (-5)
      sprite.sprite.setDepth(Depth.playerSwimming);
    } else {
      // Walking - render at normal depth
      sprite.sprite.setDepth(Depth.player);
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
        
        // If already in dry cell, stay there; otherwise move to next cell
        if (isCurrentCellWater) {
          targetCol = moveX > 0 ? gridPos.currentCell.col + 1 : moveX < 0 ? gridPos.currentCell.col - 1 : gridPos.currentCell.col;
          targetRow = moveY > 0 ? gridPos.currentCell.row + 1 : moveY < 0 ? gridPos.currentCell.row - 1 : gridPos.currentCell.row;
        } else {
          targetCol = gridPos.currentCell.col;
          targetRow = gridPos.currentCell.row;
        }
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
  
  private updateShadowMask(shadow: ShadowComponent, gridPos: GridPositionComponent, grid: Grid): void {
    // Destroy old mask
    if (this.shadowMaskGraphics) {
      this.shadowMaskGraphics.destroy();
    }
    
    // Create new mask for nearby water cells
    this.shadowMaskGraphics = shadow.shadow.scene.add.graphics();
    this.shadowMaskGraphics.fillStyle(0xffffff);
    this.shadowMaskGraphics.setVisible(false);
    
    const centerCell = gridPos.currentCell;
    const cellRadius = 2; // Check 2 cells around player
    const inset = 8;
    
    for (let row = centerCell.row - cellRadius; row <= centerCell.row + cellRadius; row++) {
      for (let col = centerCell.col - cellRadius; col <= centerCell.col + cellRadius; col++) {
        const cell = grid.getCell(col, row);
        if (cell?.properties.has('water')) {
          const world = grid.cellToWorld(col, row);
          
          // Check neighbors to determine which edges border land
          const hasWaterLeft = grid.getCell(col - 1, row)?.properties.has('water') ?? false;
          const hasWaterRight = grid.getCell(col + 1, row)?.properties.has('water') ?? false;
          const hasWaterUp = grid.getCell(col, row - 1)?.properties.has('water') ?? false;
          const hasWaterDown = grid.getCell(col, row + 1)?.properties.has('water') ?? false;
          
          // Inset edges that border land
          const left = world.x + (hasWaterLeft ? 0 : inset);
          const top = world.y + (hasWaterUp ? 0 : inset);
          const right = world.x + grid.cellSize - (hasWaterRight ? 0 : inset);
          const bottom = world.y + grid.cellSize - (hasWaterDown ? 0 : inset);
          
          this.shadowMaskGraphics.fillRect(left, top, right - left, bottom - top);
        }
      }
    }
    
    this.shadowMask = this.shadowMaskGraphics.createGeometryMask();
    shadow.shadow.setMask(this.shadowMask);
  }

  onDestroy(): void {
    if (this.shadowMaskGraphics) {
      this.shadowMaskGraphics.destroy();
    }
  }
}

