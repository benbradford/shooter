import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { Grid } from '../../utils/Grid';
import { TransformComponent } from './TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import { WalkComponent } from './WalkComponent';

export class GridCollisionComponent implements Component {
  entity!: Entity;
  private previousX: number = 0;
  private previousY: number = 0;
  private occupiedCells: Set<string> = new Set(); // Track as "col,row" strings

  constructor(private readonly grid: Grid) {}

  // eslint-disable-next-line complexity -- Layer-based movement validation requires many conditions
  private canMoveTo(fromCol: number, fromRow: number, toCol: number, toRow: number, _currentLayer: number): boolean {
    const fromCell = this.grid.getCell(fromCol, fromRow);
    const toCell = this.grid.getCell(toCol, toRow);
    
    if (!fromCell || !toCell) return false;

    // If in a transition cell, can only move up or down (not left/right)
    if (fromCell.isTransition) {
      const movingVertically = fromCol === toCol;
      if (!movingVertically) return false;
      
      const movingUp = toRow < fromRow;
      const movingDown = toRow > fromRow;
      
      // Can move up to same layer or layer+1
      if (movingUp && toCell.layer >= fromCell.layer && toCell.layer <= fromCell.layer + 1) return true;
      // Can move down to same layer or layer-1
      if (movingDown && toCell.layer >= fromCell.layer - 1 && toCell.layer <= fromCell.layer) return true;
      
      return false;
    }

    // If moving to a transition cell
    if (toCell.isTransition) {
      const movingVertically = fromCol === toCol;
      if (!movingVertically) return false; // Can only enter from top or bottom
      
      // Can enter from same layer moving down (toRow > fromRow means moving down)
      if (toRow > fromRow && fromCell.layer >= toCell.layer) return true;
      
      // Can enter from below moving up (toRow < fromRow means moving up)
      if (toRow < fromRow && fromCell.layer <= toCell.layer) return true;
      
      return false;
    }

    // Normal cell to normal cell: must be same layer (no layer changes except via transition)
    return toCell.layer === fromCell.layer;
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

    // Check each cell the new collision box overlaps
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        // Check if this cell was already occupied in previous frame
        let wasOccupied = false;
        for (let prevRow = prevTopLeftCell.row; prevRow <= prevBottomRightCell.row; prevRow++) {
          for (let prevCol = prevTopLeftCell.col; prevCol <= prevBottomRightCell.col; prevCol++) {
            if (prevCol === col && prevRow === row) {
              wasOccupied = true;
              break;
            }
          }
          if (wasOccupied) break;
        }

        // If entering a new cell, check if movement is allowed
        if (!wasOccupied) {
          // Find which previous cell we're moving from (use center of previous box)
          const prevCenterX = this.previousX + gridPos.collisionBox.offsetX;
          const prevCenterY = this.previousY + gridPos.collisionBox.offsetY;
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
    const transform = this.entity.get(TransformComponent)!;
    const gridPos = this.entity.get(GridPositionComponent)!;

    // Prevents phantom movement check from (0,0) to spawn position on first frame
    if (this.previousX === 0 && this.previousY === 0) {
      this.previousX = transform.x;
      this.previousY = transform.y;
    }

    const newX = transform.x;
    const newY = transform.y;

    if (this.checkCollision(newX, newY, gridPos)) {
      const xOnlyBlocked = this.checkCollision(newX, this.previousY, gridPos);
      const yOnlyBlocked = this.checkCollision(this.previousX, newY, gridPos);

      const walk = this.entity.get(WalkComponent);

      if (!xOnlyBlocked && !yOnlyBlocked) {
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
      } else if (!xOnlyBlocked) {
        transform.y = this.previousY;
        walk?.resetVelocity(false, true);
      } else if (yOnlyBlocked) {
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
      } else {
        transform.x = this.previousX;
        walk?.resetVelocity(true, false);
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
    
    const currentCellData = this.grid.getCell(topLeftCell.col, topLeftCell.row);
    if (currentCellData) {
      gridPos.currentLayer = currentCellData.layer;
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
