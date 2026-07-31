import type { Entity } from '../../Entity';
import type { GridReader, CellCoord, CellData } from '../../../systems/grid/Grid';
import type { GridPositionComponent } from './GridPositionComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { GridCellBlocker } from './GridCellBlocker';
import { JumpComponent } from './JumpComponent';
import { MovingTileComponent, findMovingTileCovering } from '../moving-tile/MovingTileComponent';
import { CachedFlag } from '../../../systems/state/CachedFlag';

/**
 * Validates grid-based movement. Extracted from GridCollisionComponent
 * to isolate collision logic from position tracking.
 */
export class GridMovementValidator {
  blockedByPushable: Entity | null = null;
  private readonly allowedLayersSet: Set<number> = new Set();
  private readonly canSwimFlag: CachedFlag;

  constructor(private readonly grid: GridReader) {
    this.canSwimFlag = new CachedFlag('canSwim');
  }

  destroy(): void {
    this.canSwimFlag.destroy();
  }

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

    // Moving tiles are walkable surfaces over whatever cell they sit on, so they
    // bypass the underlying cell's rules. Boarding is implicitly limited to sides
    // the entity can legally stand on; leaving re-applies the target cell's rules.
    const fromTile = this.getMovingTileAt(fromCell, fromCol, fromRow);
    const toTile = this.getMovingTileAt(toCell, toCol, toRow);
    if (toTile) {
      return true;
    }
    if (fromTile) {
      return this.canLeaveMovingTile(entity, toCell);
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
    const canSwim = this.canSwimFlag.get();
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

    // Determine if the entity is currently riding a moving tile. When riding,
    // the tile owns the entity's movement — ground-type checks (water, layers)
    // must not block the carried position. The tile's occupancy is snapped to
    // whole cells so its grid registration may lag behind the pixel position it
    // carries riders to, causing false blocks on water cells between boundaries.
    // Check both the previous and new center cells — the tile may only be
    // registered at one of them depending on when syncOccupancy snapped.
    const newCenter = this.grid.worldToCellInto(x + gridPos.collisionBox.offsetX, y + gridPos.collisionBox.offsetY, tmpCells[5]);
    const newCenterCol = newCenter.col;
    const newCenterRow = newCenter.row;
    const ridingTile = findMovingTileCovering(this.grid, prevCenterCell.col, prevCenterCell.row)
      ?? findMovingTileCovering(this.grid, newCenterCol, newCenterRow);

    // Check each cell the new collision box overlaps
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        const cell = this.grid.getCell(col, row);

        // A moving tile provides its own surface, so the cell beneath it is exempt
        // from the layer check that would otherwise block standing there.
        const isMovingTileCell = cell ? this.getMovingTileAt(cell, col, row) !== null : false;
        // When riding a tile, also treat cells it geometrically covers as tile cells,
        // even if the tile hasn't snapped its occupancy there yet (between-cell movement).
        const coveredByRidingTile = !isMovingTileCell && ridingTile !== null && ridingTile.coversCellPixel(col, row, this.grid.cellSize);

        // Block if any overlapping cell is a different layer (unless it's a transition or allowed)
        if (cell && !isMovingTileCell && !coveredByRidingTile && !this.grid.isTransition(cell) && !allowedLayers.has(this.grid.getLayer(cell))) {
          return true; // blocked
        }

        // Check if this cell was already occupied in previous frame
        const wasOccupied = this.wasCellOccupied(col, row, prevTopLeftCell, prevBottomRightCell);

        // If entering a new cell, check if movement is allowed.
        // Skip this check when the cell is covered by the tile we're riding —
        // the tile carries the entity and ground rules (water, layers) don't apply.
        if (!wasOccupied && !isMovingTileCell && !coveredByRidingTile) {
          const fromCell = this.grid.worldToCellInto(prevCenterX, prevCenterY, tmpCells[5]);

          if (!this.canMoveTo(entity, fromCell.col, fromCell.row, col, row)) {
            return true; // blocked
          }
        }
      }
    }

    // The collision box may be offset below the visual center. When moving north,
    // the visual center enters a water cell before the collision box does — check it.
    const centerCellCol = this.grid.worldToCellInto(x + gridPos.collisionBox.offsetX, y, tmpCells[5]).col;
    const centerCellRow = tmpCells[5].row;
    if (centerCellRow < topLeftCell.row) {
      const centerCell = this.grid.getCell(centerCellCol, centerCellRow);
      const visualCenterCoveredByTile = ridingTile !== null && ridingTile.coversCellPixel(centerCellCol, centerCellRow, this.grid.cellSize);
      if (centerCell && !visualCenterCoveredByTile && !this.getMovingTileAt(centerCell, centerCellCol, centerCellRow)
        && !centerCell.properties.has('bridge') && centerCell.properties.has('water')) {
        const waterEffect = entity.get(WaterEffectComponent);
        const canSwim = this.canSwimFlag.get();
        if (!waterEffect || !canSwim) {
          return true; // blocked
        }
      }
    }

    return false; // not blocked
  }

  /** Returns the moving tile whose footprint covers this cell, if any. */
  private getMovingTileAt(cell: CellData, col: number, row: number): MovingTileComponent | null {
    for (const occupant of cell.occupants) {
      const tile = occupant.get(MovingTileComponent);
      if (tile?.coversCell(col, row)) {
        return tile;
      }
    }
    return null;
  }

  /**
   * Stepping off a moving tile is only allowed toward a cell the entity could
   * otherwise stand on — so walls always block, and water blocks unless the
   * entity can swim.
   */
  private canLeaveMovingTile(entity: Entity, toCell: CellData): boolean {
    if (this.grid.isWall(toCell)) return false;
    if (toCell.properties.has('void')) return false;

    if (!toCell.properties.has('bridge') && toCell.properties.has('water')) {
      const waterEffect = entity.get(WaterEffectComponent);
      if (!waterEffect || !this.canSwimFlag.get()) {
        return false;
      }
    }

    return true;
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
