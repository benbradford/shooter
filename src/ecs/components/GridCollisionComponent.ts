import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';
import type { Grid } from '../../utils/Grid';
import { TransformComponent } from './TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';

export class GridCollisionComponent implements Component {
  entity!: Entity;
  private previousX: number = 0;
  private previousY: number = 0;
  private occupiedCells: Set<string> = new Set(); // Track as "col,row" strings

  constructor(private grid: Grid) {}

  private checkCollision(x: number, y: number, gridPos: GridPositionComponent): boolean {
    // Calculate collision box bounds at given position
    const boxLeft = x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxTop = y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxRight = boxLeft + gridPos.collisionBox.width;
    const boxBottom = boxTop + gridPos.collisionBox.height;

    // Get all cells the collision box overlaps
    const topLeftCell = this.grid.worldToCell(boxLeft, boxTop);
    const bottomRightCell = this.grid.worldToCell(boxRight - 1, boxBottom - 1);

    // Check if any overlapping cell is not walkable
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        const cellData = this.grid.getCell(col, row);
        if (!cellData || !cellData.walkable) {
          return true; // blocked
        }
      }
    }
    return false; // not blocked
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent)!;
    const gridPos = this.entity.get(GridPositionComponent)!;

    const newX = transform.x;
    const newY = transform.y;

    // Check if new position is blocked
    if (this.checkCollision(newX, newY, gridPos)) {
      // Try X movement only
      const xOnlyBlocked = this.checkCollision(newX, this.previousY, gridPos);
      // Try Y movement only
      const yOnlyBlocked = this.checkCollision(this.previousX, newY, gridPos);

      if (!xOnlyBlocked && !yOnlyBlocked) {
        // Both axes work individually, revert both (corner case)
        transform.x = this.previousX;
        transform.y = this.previousY;
      } else if (!xOnlyBlocked) {
        // X movement is ok, slide along X
        transform.y = this.previousY;
      } else if (!yOnlyBlocked) {
        // Y movement is ok, slide along Y
        transform.x = this.previousX;
      } else {
        // Both blocked, revert completely
        transform.x = this.previousX;
        transform.y = this.previousY;
      }
    }

    // Calculate collision box bounds at final position
    const boxLeft = transform.x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxTop = transform.y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxRight = boxLeft + gridPos.collisionBox.width;
    const boxBottom = boxTop + gridPos.collisionBox.height;

    // Get all cells the collision box overlaps
    const topLeftCell = this.grid.worldToCell(boxLeft, boxTop);
    const bottomRightCell = this.grid.worldToCell(boxRight - 1, boxBottom - 1);

    // Build new set of occupied cells
    const newOccupiedCells = new Set<string>();
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        newOccupiedCells.add(`${col},${row}`);
      }
    }

    // Remove from cells no longer occupied
    this.occupiedCells.forEach(key => {
      if (!newOccupiedCells.has(key)) {
        const [col, row] = key.split(',').map(Number);
        this.grid.removeOccupant(col, row, this.entity);
      }
    });

    // Add to newly occupied cells
    newOccupiedCells.forEach(key => {
      if (!this.occupiedCells.has(key)) {
        const [col, row] = key.split(',').map(Number);
        this.grid.addOccupant(col, row, this.entity);
      }
    });

    // Update occupied cells set
    this.occupiedCells = newOccupiedCells;

    // Update current cell to top-left of occupied region
    gridPos.previousCell = { ...gridPos.currentCell };
    gridPos.currentCell = topLeftCell;

    // Store current position for next frame
    this.previousX = transform.x;
    this.previousY = transform.y;

    // Render collision box for debug (will be drawn after grid.render())
    this.grid.renderCollisionBox(boxLeft, boxTop, gridPos.collisionBox.width, gridPos.collisionBox.height);
  }

  onDestroy(): void {
    // Remove from all occupied cells
    this.occupiedCells.forEach(key => {
      const [col, row] = key.split(',').map(Number);
      this.grid.removeOccupant(col, row, this.entity);
    });
    this.occupiedCells.clear();
  }
}
