import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import { WalkComponent } from './WalkComponent';
import { GridCellBlocker } from './GridCellBlocker';
import { BugHopComponent } from './BugHopComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { KnockbackComponent } from './KnockbackComponent';
import { SlideAbilityComponent } from '../abilities/SlideAbilityComponent';
import { CAN_WALK_ON_WATER } from '../../../constants/GameConstants';

export class GridCollisionComponent implements Component {
  entity!: Entity;
  private previousX: number = 0;
  private previousY: number = 0;
  private occupiedCells: Set<string> = new Set(); // Track as "col,row" strings

  constructor(private readonly grid: Grid) {}
  
  getGrid(): Grid {
    return this.grid;
  }

  private wasCellOccupied(
    col: number,
    row: number,
    prevTopLeft: { col: number; row: number },
    prevBottomRight: { col: number; row: number }
  ): boolean {
    for (let prevRow = prevTopLeft.row; prevRow <= prevBottomRight.row; prevRow++) {
      for (let prevCol = prevTopLeft.col; prevCol <= prevBottomRight.col; prevCol++) {
        if (prevCol === col && prevRow === row) {
          return true;
        }
      }
    }
    return false;
  }

  // eslint-disable-next-line complexity -- Layer-based movement validation requires many conditions
  private canMoveTo(fromCol: number, fromRow: number, toCol: number, toRow: number, _currentLayer: number): boolean {
    const fromCell = this.grid.getCell(fromCol, fromRow);
    const toCell = this.grid.getCell(toCol, toRow);

    if (!fromCell || !toCell) return false;

    // Check if target cell has any occupants with GridCellBlocker
    for (const occupant of toCell.occupants) {
      if (occupant.get(GridCellBlocker)) {
        return false;
      }
    }

    // Always allow movement between transition cells
    if (this.grid.isTransition(fromCell) && this.grid.isTransition(toCell)) {
      return true;
    }

    // Block movement into higher layers (unless transition or coming from transition)
    const toLayer = this.grid.getLayer(toCell);
    const fromLayer = this.grid.getLayer(fromCell);
    
    if (toLayer > fromLayer && !this.grid.isTransition(fromCell) && !this.grid.isTransition(toCell)) {
      return false;
    }
    
    // Block movement into walls specifically
    if (this.grid.isWall(toCell) && !this.grid.isTransition(fromCell)) {
      return false;
    }
    
    // Block movement into water
    if (!CAN_WALK_ON_WATER && toCell.properties.has('water')) {
      return false;
    }

    // If in a transition cell, allow movement to adjacent layers
    if (this.grid.isTransition(fromCell)) {
      // Allow movement to transitions
      if (this.grid.isTransition(toCell)) return true;
      
      // Block movement into walls at any layer
      if (this.grid.isWall(toCell)) {
        return false;
      }
      
      // Allow movement to adjacent layers
      if (toLayer >= fromLayer - 1 && toLayer <= fromLayer + 1) return true;
      return false;
    }

    // If moving to a transition cell, allow from any direction
    if (this.grid.isTransition(toCell)) {
      return true;
    }

    // Normal cell to normal cell: must be same layer (no layer changes except via transition)
    if (toLayer !== fromLayer) return false;

    // Block diagonal movement through corners
    if (fromCol !== toCol && fromRow !== toRow) {
      const cellX = this.grid.getCell(toCol, fromRow);
      const cellY = this.grid.getCell(fromCol, toRow);
      
      // Block if EITHER intermediate cell is a different layer
      if (cellX && this.grid.getLayer(cellX) !== fromLayer && !this.grid.isTransition(cellX)) return false;
      if (cellY && this.grid.getLayer(cellY) !== fromLayer && !this.grid.isTransition(cellY)) return false;
    }

    return true;
  }

  // eslint-disable-next-line complexity
  private checkCollision(x: number, y: number, gridPos: GridPositionComponent): boolean {
    // Calculate collision box bounds at new position
    const boxLeft = x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxTop = y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxRight = boxLeft + gridPos.collisionBox.width;
    const boxBottom = boxTop + gridPos.collisionBox.height;

    // Calculate collision box bounds at previous position
    const prevBoxLeft = this.previousX + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const prevBoxTop = this.previousY + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const prevBoxRight = prevBoxLeft + gridPos.collisionBox.width;
    const prevBoxBottom = prevBoxTop + gridPos.collisionBox.height;

    // Get all cells the collision box overlaps at new position
    const topLeftCell = this.grid.worldToCell(boxLeft, boxTop);
    const bottomRightCell = this.grid.worldToCell(boxRight - 1, boxBottom - 1);

    // Get all cells the collision box overlapped at previous position
    const prevTopLeftCell = this.grid.worldToCell(prevBoxLeft, prevBoxTop);
    const prevBottomRightCell = this.grid.worldToCell(prevBoxRight - 1, prevBoxBottom - 1);

    // Get the layer of the center of the collision box from previous position
    const prevCenterX = this.previousX + gridPos.collisionBox.offsetX;
    const prevCenterY = this.previousY + gridPos.collisionBox.offsetY;
    const prevCenterCell = this.grid.worldToCell(prevCenterX, prevCenterY);
    const prevCenterCellData = this.grid.getCell(prevCenterCell.col, prevCenterCell.row);
    
    // Check if ANY previously occupied cell was a transition
    let wasInTransition = prevCenterCellData ? this.grid.isTransition(prevCenterCellData) : false;
    let minTransitionLayer = prevCenterCellData ? this.grid.getLayer(prevCenterCellData) : gridPos.currentLayer;
    let maxTransitionLayer = prevCenterCellData ? this.grid.getLayer(prevCenterCellData) : gridPos.currentLayer;
    
    for (let row = prevTopLeftCell.row; row <= prevBottomRightCell.row; row++) {
      for (let col = prevTopLeftCell.col; col <= prevBottomRightCell.col; col++) {
        const cell = this.grid.getCell(col, row);
        if (cell && this.grid.isTransition(cell)) {
          wasInTransition = true;
          const cellLayer = this.grid.getLayer(cell);
          minTransitionLayer = Math.min(minTransitionLayer, cellLayer);
          maxTransitionLayer = Math.max(maxTransitionLayer, cellLayer);
        }
      }
    }
    
    // Also check if ANY new position cell is a transition
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        const cell = this.grid.getCell(col, row);
        if (cell && this.grid.isTransition(cell)) {
          wasInTransition = true;
          const cellLayer = this.grid.getLayer(cell);
          minTransitionLayer = Math.min(minTransitionLayer, cellLayer);
          maxTransitionLayer = Math.max(maxTransitionLayer, cellLayer);
        }
      }
    }
    
    // When in or near a transition, allow all layers from min-1 to max+1
    const allowedLayers = new Set<number>();
    if (wasInTransition) {
      for (let layer = minTransitionLayer - 1; layer <= maxTransitionLayer + 1; layer++) {
        allowedLayers.add(layer);
      }
    } else {
      allowedLayers.add(prevCenterCellData ? this.grid.getLayer(prevCenterCellData) : gridPos.currentLayer);
    }

    // Check each cell the new collision box overlaps
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        const cell = this.grid.getCell(col, row);
        
        // Block if any overlapping cell is a different layer (unless it's a transition or allowed)
        if (cell && !this.grid.isTransition(cell) && !allowedLayers.has(this.grid.getLayer(cell))) {
          return true; // blocked
        }

        // Check if this cell was already occupied in previous frame
        const wasOccupied = this.wasCellOccupied(col, row, prevTopLeftCell, prevBottomRightCell);

        // If entering a new cell, check if movement is allowed
        if (!wasOccupied) {
          const fromCell = this.grid.worldToCell(prevCenterX, prevCenterY);

          if (!this.canMoveTo(fromCell.col, fromCell.row, col, row, gridPos.currentLayer)) {
            return true; // blocked
          }
        }
      }
    }

    return false; // not blocked
  }

  // eslint-disable-next-line complexity
  update(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);

    const hop = this.entity.get(BugHopComponent);
    if (hop?.isActive()) {
      this.previousX = transform.x;
      this.previousY = transform.y;
      return;
    }

    const stateMachine = this.entity.get(StateMachineComponent);
    if (stateMachine?.stateMachine.getCurrentKey() === 'attack') {
      this.previousX = transform.x;
      this.previousY = transform.y;
      return;
    }

    if (this.previousX === 0 && this.previousY === 0) {
      this.previousX = transform.x;
      this.previousY = transform.y;
    }

    const hopJustEnded = hop && !hop.isActive() && hop.justEnded();
    if (hopJustEnded) {
      this.previousX = transform.x;
      this.previousY = transform.y;
      const cell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      if (cell) {
        gridPos.currentLayer = this.grid.getLayer(cell);
      }
      return;
    }

    const newX = transform.x;
    const newY = transform.y;

    if (this.checkCollision(newX, newY, gridPos)) {
      const xOnlyBlocked = this.checkCollision(newX, this.previousY, gridPos);
      const yOnlyBlocked = this.checkCollision(this.previousX, newY, gridPos);

      const walk = this.entity.get(WalkComponent);
      const knockback = this.entity.get(KnockbackComponent);
      const slide = this.entity.get(SlideAbilityComponent);

      if (xOnlyBlocked && yOnlyBlocked) {
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
        knockback?.stop();
        if (slide?.isActive()) {
          slide.stopSlide();
        }
      } else if (yOnlyBlocked) {
        transform.y = this.previousY;
        walk?.resetVelocity(false, true);
      } else if (xOnlyBlocked) {
        transform.x = this.previousX;
        walk?.resetVelocity(true, false);
      } else {
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
        knockback?.stop();
        if (slide?.isActive()) {
          slide.stopSlide();
        }
      }
    }

    const boxLeft = transform.x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxTop = transform.y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxRight = boxLeft + gridPos.collisionBox.width;
    const boxBottom = boxTop + gridPos.collisionBox.height;

    const topLeftCell = this.grid.worldToCell(boxLeft, boxTop);
    const bottomRightCell = this.grid.worldToCell(boxRight - 1, boxBottom - 1);

    const newOccupiedCells = new Set<string>();
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        newOccupiedCells.add(`${col},${row}`);
      }
    }

    this.occupiedCells.forEach(key => {
      if (!newOccupiedCells.has(key)) {
        const [col, row] = key.split(',').map(Number);
        this.grid.removeOccupant(col, row, this.entity);
      }
    });

    newOccupiedCells.forEach(key => {
      if (!this.occupiedCells.has(key)) {
        const [col, row] = key.split(',').map(Number);
        this.grid.addOccupant(col, row, this.entity);
      }
    });

    this.occupiedCells = newOccupiedCells;

    gridPos.previousCell = { ...gridPos.currentCell };
    gridPos.currentCell = topLeftCell;

    // Update layer based on center of collision box
    const centerX = transform.x + gridPos.collisionBox.offsetX;
    const centerY = transform.y + gridPos.collisionBox.offsetY;
    const centerCell = this.grid.worldToCell(centerX, centerY);
    const centerCellData = this.grid.getCell(centerCell.col, centerCell.row);
    
    if (centerCellData) {
      // Always update to the current cell's layer
      gridPos.currentLayer = this.grid.getLayer(centerCellData);
    }

    this.previousX = transform.x;
    this.previousY = transform.y;

    this.grid.renderCollisionBox(boxLeft, boxTop, gridPos.collisionBox.width, gridPos.collisionBox.height);
  }

  onDestroy(): void {
    this.occupiedCells.forEach(key => {
      const [col, row] = key.split(',').map(Number);
      this.grid.removeOccupant(col, row, this.entity);
    });
    this.occupiedCells.clear();
  }
}
