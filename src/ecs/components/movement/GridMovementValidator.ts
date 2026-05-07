import type { Entity } from '../../Entity';
import type { GridReader, CellCoord } from '../../../systems/grid/Grid';
import type { GridPositionComponent } from './GridPositionComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { GridCellBlocker } from './GridCellBlocker';
import { JumpComponent } from './JumpComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';

/**
 * Validates grid-based movement. Extracted from GridCollisionComponent
 * to isolate collision logic from position tracking.
 */
export class GridMovementValidator {
  blockedByPushable: Entity | null = null;
  private readonly allowedLayersSet: Set<number> = new Set();

  constructor(private readonly grid: GridReader) {}

  // eslint-disable-next-line complexity -- Layer-based movement validation requires many conditions
  canMoveTo(entity: Entity, fromCol: number, fromRow: number, toCol: number, toRow: number): boolean {
    const fromCell = this.grid.getCell(fromCol, fromRow);
    const toCell = this.grid.getCell(toCol, toRow);

    if (!fromCell || !toCell) return false;

    // Check if target cell has any occupants with GridCellBlocker
    for (const occupant of toCell.occupants) {
      if (occupant.get(GridCellBlocker)) {
        this.blockedByPushable = occupant;
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

    // Block movement into water if player can't swim, or if entity is not a swimmer (enemies)
    const waterEffect = entity.get(WaterEffectComponent);
    const canSwim = WorldStateManager.getInstance().getFlag('canSwim') === 'true';
    if (!toCell.properties.has('bridge') && toCell.properties.has('water')) {
      if (!waterEffect || !canSwim) {
        return false;
      }
    }

    // Block walking from bridge onto water (without bridge) - but allow if swimming
    const isSwimming = waterEffect?.getIsInWater() ?? false;
    if (!isSwimming && fromCell.properties.has('bridge') && toCell.properties.has('water') && !toCell.properties.has('bridge')) {
      return false;
    }

    // Block movement into void cells (entities with JumpComponent get blocked so jump icon shows)
    if (toCell.properties.has('void')) {
      if (entity.get(JumpComponent) || entity.tags.has('pet')) {
        return false;
      }
      return true;
    }

    // Block swimming from bridge+water onto dry land
    if (isSwimming && fromCell.properties.has('bridge') && fromCell.properties.has('water') && !toCell.properties.has('water')) {
      return false;
    }

    // If in a transition cell, allow movement to adjacent layers
    if (this.grid.isTransition(fromCell)) {
      if (this.grid.isTransition(toCell)) return true;
      if (this.grid.isWall(toCell)) return false;
      if (toLayer >= fromLayer - 1 && toLayer <= fromLayer + 1) return true;
      return false;
    }

    // If moving to a transition cell, allow from any direction
    if (this.grid.isTransition(toCell)) {
      return true;
    }

    // Normal cell to normal cell: must be same layer
    if (toLayer !== fromLayer) return false;

    // Block diagonal movement through corners
    if (fromCol !== toCol && fromRow !== toRow) {
      const cellX = this.grid.getCell(toCol, fromRow);
      const cellY = this.grid.getCell(fromCol, toRow);

      if (cellX && this.grid.getLayer(cellX) !== fromLayer && !this.grid.isTransition(cellX)) return false;
      if (cellY && this.grid.getLayer(cellY) !== fromLayer && !this.grid.isTransition(cellY)) return false;
    }

    return true;
  }

  // eslint-disable-next-line complexity
  checkCollision(
    entity: Entity,
    x: number,
    y: number,
    previousX: number,
    previousY: number,
    gridPos: GridPositionComponent,
    tmpCells: readonly [CellCoord, CellCoord, CellCoord, CellCoord, CellCoord, CellCoord]
  ): boolean {
    // Calculate collision box bounds at new position
    const boxLeft = x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxTop = y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxRight = boxLeft + gridPos.collisionBox.width;
    const boxBottom = boxTop + gridPos.collisionBox.height;

    // Calculate collision box bounds at previous position
    const prevBoxLeft = previousX + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const prevBoxTop = previousY + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const prevBoxRight = prevBoxLeft + gridPos.collisionBox.width;
    const prevBoxBottom = prevBoxTop + gridPos.collisionBox.height;

    // Get all cells the collision box overlaps at new position
    const topLeftCell = this.grid.worldToCellInto(boxLeft, boxTop, tmpCells[0]);
    const bottomRightCell = this.grid.worldToCellInto(boxRight - 1, boxBottom - 1, tmpCells[1]);

    // Get all cells the collision box overlapped at previous position
    const prevTopLeftCell = this.grid.worldToCellInto(prevBoxLeft, prevBoxTop, tmpCells[2]);
    const prevBottomRightCell = this.grid.worldToCellInto(prevBoxRight - 1, prevBoxBottom - 1, tmpCells[3]);

    // Get the layer of the center of the collision box from previous position
    const prevCenterX = previousX + gridPos.collisionBox.offsetX;
    const prevCenterY = previousY + gridPos.collisionBox.offsetY;
    const prevCenterCell = this.grid.worldToCellInto(prevCenterX, prevCenterY, tmpCells[4]);
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
    const allowedLayers = this.allowedLayersSet;
    allowedLayers.clear();
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
          const fromCell = this.grid.worldToCellInto(prevCenterX, prevCenterY, tmpCells[5]);

          if (!this.canMoveTo(entity, fromCell.col, fromCell.row, col, row)) {
            return true; // blocked
          }
        }
      }
    }

    return false; // not blocked
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
}
