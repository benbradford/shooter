import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../utils/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import { WalkComponent } from './WalkComponent';
import { GridCellBlocker } from './GridCellBlocker';
import { BugHopComponent } from './BugHopComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';

export class GridCollisionComponent implements Component {
  entity!: Entity;
  private previousX: number = 0;
  private previousY: number = 0;
  private occupiedCells: Set<string> = new Set(); // Track as "col,row" strings

  constructor(private readonly grid: Grid) {}

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

    // Block movement into layer 1 cells that have layer 0 below (unless transition or coming from transition)
    if (toCell.layer === 1 && !toCell.isTransition && !fromCell.isTransition) {
      const cellBelow = this.grid.getCell(toCol, toRow + 1);
      if (cellBelow?.layer === 0) {
        return false;
      }
    }

    // If in a transition cell, restrict horizontal movement
    if (fromCell.isTransition) {
      const movingVertically = fromCol === toCol;

      if (!movingVertically) {
        return toCell.isTransition || toCell.layer === fromCell.layer;
      }

      const movingUp = toRow < fromRow;
      const movingDown = toRow > fromRow;

      if (movingUp && toCell.layer >= fromCell.layer && toCell.layer <= fromCell.layer + 1) return true;
      if (movingDown && toCell.layer >= fromCell.layer - 1 && toCell.layer <= fromCell.layer) return true;

      return false;
    }

    // If moving to a transition cell, allow from any direction
    if (toCell.isTransition) {
      return true;
    }

    // Normal cell to normal cell: must be same layer (no layer changes except via transition)
    if (toCell.layer !== fromCell.layer) return false;

    // Block diagonal movement through corners
    if (fromCol !== toCol && fromRow !== toRow) {
      const cellX = this.grid.getCell(toCol, fromRow);
      const cellY = this.grid.getCell(fromCol, toRow);
      
      // Block if EITHER intermediate cell is a different layer
      if (cellX && cellX.layer !== fromCell.layer && !cellX.isTransition) return false;
      if (cellY && cellY.layer !== fromCell.layer && !cellY.isTransition) return false;
    }

    return true;
  }

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
    
    // When in or near a transition, allow adjacent layers
    let allowedLayers = new Set<number>();
    if (prevCenterCellData?.isTransition) {
      allowedLayers.add(prevCenterCellData.layer - 1);
      allowedLayers.add(prevCenterCellData.layer);
      allowedLayers.add(prevCenterCellData.layer + 1);
    } else {
      allowedLayers.add(prevCenterCellData?.layer ?? gridPos.currentLayer);
    }

    // Check each cell the new collision box overlaps
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        const cell = this.grid.getCell(col, row);
        
        // Block if any overlapping cell is a different layer (unless it's a transition or allowed)
        if (cell && !cell.isTransition && !allowedLayers.has(cell.layer)) {
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
        gridPos.currentLayer = cell.layer;
      }
      return;
    }

    const newX = transform.x;
    const newY = transform.y;

    if (this.checkCollision(newX, newY, gridPos)) {
      const xOnlyBlocked = this.checkCollision(newX, this.previousY, gridPos);
      const yOnlyBlocked = this.checkCollision(this.previousX, newY, gridPos);

      const walk = this.entity.get(WalkComponent);

      if (xOnlyBlocked && yOnlyBlocked) {
        // Both axes blocked - stop completely
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
      } else if (yOnlyBlocked) {
        // Only Y blocked - allow X movement
        transform.y = this.previousY;
        walk?.resetVelocity(false, true);
      } else if (xOnlyBlocked) {
        // Only X blocked - allow Y movement
        transform.x = this.previousX;
        walk?.resetVelocity(true, false);
      } else {
        // Diagonal blocked but neither axis alone - stop completely
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
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
    if (centerCellData && !centerCellData.isTransition) {
      gridPos.currentLayer = centerCellData.layer;
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
