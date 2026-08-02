import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid, CellCoord } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import { WalkComponent } from './WalkComponent';
import { GridCellBlocker } from './GridCellBlocker';
import { BugHopComponent } from './BugHopComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { KnockbackComponent } from './KnockbackComponent';
import { GridMovementValidator } from './GridMovementValidator';
import { MovingTileComponent } from '../moving-tile/MovingTileComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';


export class GridCollisionComponent implements Component {
  entity!: Entity;
  private previousX: number = 0;
  private previousY: number = 0;
  private occupiedCells: Set<number> = new Set();
  private swapOccupiedCells: Set<number> = new Set();
  enabled = true;
  blockedByPushable: Entity | null = null;
  /** Set by MovingTileComponent.carryRiders() — suppresses collision validation for this frame. */
  onMovingTile = false;
  /** The last cell the player occupied before stepping onto a moving tile. Used for tileDeath respawn. */
  lastCellBeforeMovingTile: { col: number; row: number } | null = null;
  /** Whether the onMovingTile flag was set on the previous frame (used to detect boarding). */
  private wasOnMovingTile = false;

  private readonly validator: GridMovementValidator;

  // Pre-allocated temp objects for zero-alloc worldToCell calls in hot paths
  private readonly _tmpCells: readonly [CellCoord, CellCoord, CellCoord, CellCoord, CellCoord, CellCoord] = [
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
  ];

  constructor(private readonly grid: Grid) {
    this.validator = new GridMovementValidator(grid);
  }

  private static encodeCellKey(col: number, row: number): number {
    return col * 10000 + row;
  }

  private static decodeCellKey(key: number): { col: number; row: number } {
    return { col: Math.floor(key / 10000), row: key % 10000 };
  }

  getGrid(): Grid {
    return this.grid;
  }

  syncPreviousPosition(x: number, y: number): void {
    this.previousX = x;
    this.previousY = y;
  }

  // eslint-disable-next-line complexity
  update(_delta: number): void {
    if (!this.enabled) return;
    this.blockedByPushable = null;
    this.validator.blockedByPushable = null;

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

    // When carried by a moving tile (flag set by carryRiders on previous frame),
    // clamp the player to the tile bounds only in directions where stepping off
    // would put them into water or void. If the adjacent ground is walkable,
    // allow them to leave the tile freely.
    let skipCollision = false;
    if (this.onMovingTile) {
      const tileComp = this.findRidingTile(newX + gridPos.collisionBox.offsetX, newY + gridPos.collisionBox.offsetY);
      if (tileComp) {
        const tileTransform = tileComp.entity.get(TransformComponent);
        if (tileTransform) {
          const halfTileW = (tileComp.widthCells * this.grid.cellSize) / 2;
          const halfTileH = (tileComp.heightCells * this.grid.cellSize) / 2;
          const halfBoxW = gridPos.collisionBox.width / 2;
          const halfBoxH = gridPos.collisionBox.height / 2;

          const minX = tileTransform.x - halfTileW + halfBoxW;
          const maxX = tileTransform.x + halfTileW - halfBoxW;
          const minY = tileTransform.y - halfTileH + halfBoxH - gridPos.collisionBox.offsetY;
          const maxY = tileTransform.y + halfTileH - halfBoxH - gridPos.collisionBox.offsetY;

          let clampedX = transform.x;
          let clampedY = transform.y;

          // Only clamp in X if stepping off would put us in water/void
          if (transform.x < minX) {
            clampedX = this.shouldClampEdge(tileComp, tileTransform, 'left') ? minX : transform.x;
          } else if (transform.x > maxX) {
            clampedX = this.shouldClampEdge(tileComp, tileTransform, 'right') ? maxX : transform.x;
          }

          if (transform.y < minY) {
            clampedY = this.shouldClampEdge(tileComp, tileTransform, 'up') ? minY : transform.y;
          } else if (transform.y > maxY) {
            clampedY = this.shouldClampEdge(tileComp, tileTransform, 'down') ? maxY : transform.y;
          }

          transform.x = clampedX;
          transform.y = clampedY;
          skipCollision = true;
        }
      } else {
        // No longer on a tile — clear the flag and run normal collision
        this.onMovingTile = false;
      }
    }

    if (!skipCollision && this.validator.checkCollision(this.entity, transform.x, transform.y, this.previousX, this.previousY, gridPos, this._tmpCells)) {
      this.blockedByPushable = this.validator.blockedByPushable;

      const xOnlyBlocked = this.validator.checkCollision(this.entity, newX, this.previousY, this.previousX, this.previousY, gridPos, this._tmpCells);
      const yOnlyBlocked = this.validator.checkCollision(this.entity, this.previousX, newY, this.previousX, this.previousY, gridPos, this._tmpCells);

      const walk = this.entity.get(WalkComponent);
      const knockback = this.entity.get(KnockbackComponent);

      if (xOnlyBlocked && yOnlyBlocked) {
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
        knockback?.stop();
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
      }
    }

    // Sync blockedByPushable from validator (set during canMoveTo)
    this.blockedByPushable ??= this.validator.blockedByPushable;

    // Proactive pushable detection: probe 1px beyond collision box edge
    if (!this.blockedByPushable && (newX !== this.previousX || newY !== this.previousY)) {
      const dx = newX - this.previousX;
      const dy = newY - this.previousY;
      const boxLeft = transform.x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
      const boxTop = transform.y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
      const boxRight = boxLeft + gridPos.collisionBox.width;
      const boxBottom = boxTop + gridPos.collisionBox.height;
      const centerX = (boxLeft + boxRight) / 2;
      const centerY = (boxTop + boxBottom) / 2;

      let probeX = centerX;
      let probeY = centerY;
      if (Math.abs(dx) > Math.abs(dy)) {
        probeX = dx > 0 ? boxRight + 1 : boxLeft - 1;
      } else {
        probeY = dy > 0 ? boxBottom + 1 : boxTop - 1;
      }
      const probeCell = this.grid.worldToCellInto(probeX, probeY, this._tmpCells[0]);
      const probeCellData = this.grid.getCell(probeCell.col, probeCell.row);
      if (probeCellData) {
        for (const occupant of probeCellData.occupants) {
          if (occupant.get(GridCellBlocker)) {
            this.blockedByPushable = occupant;
            break;
          }
        }
      }
    }

    const boxLeft = transform.x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxTop = transform.y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxRight = boxLeft + gridPos.collisionBox.width;
    const boxBottom = boxTop + gridPos.collisionBox.height;

    const topLeftCell = this.grid.worldToCellInto(boxLeft, boxTop, this._tmpCells[1]);
    const bottomRightCell = this.grid.worldToCellInto(boxRight - 1, boxBottom - 1, this._tmpCells[2]);

    const newOccupiedCells = this.swapOccupiedCells;
    newOccupiedCells.clear();
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        newOccupiedCells.add(GridCollisionComponent.encodeCellKey(col, row));
      }
    }

    this.occupiedCells.forEach(key => {
      if (!newOccupiedCells.has(key)) {
        const { col, row } = GridCollisionComponent.decodeCellKey(key);
        this.grid.removeOccupant(col, row, this.entity);
      }
    });

    newOccupiedCells.forEach(key => {
      if (!this.occupiedCells.has(key)) {
        const { col, row } = GridCollisionComponent.decodeCellKey(key);
        this.grid.addOccupant(col, row, this.entity);
      }
    });

    // Swap sets: swapOccupiedCells becomes occupiedCells, old occupiedCells becomes swap buffer
    this.swapOccupiedCells = this.occupiedCells;
    this.occupiedCells = newOccupiedCells;

    // Update currentCell based on collision box center (feet position).
    const centerX = transform.x + gridPos.collisionBox.offsetX;
    const centerY = transform.y + gridPos.collisionBox.offsetY;
    const centerCell = this.grid.worldToCellInto(centerX, centerY, this._tmpCells[3]);

    gridPos.previousCell.col = gridPos.currentCell.col;
    gridPos.previousCell.row = gridPos.currentCell.row;
    gridPos.currentCell.col = centerCell.col;
    gridPos.currentCell.row = centerCell.row;

    const layerCellData = this.grid.getCell(centerCell.col, centerCell.row);

    if (layerCellData) {
      gridPos.currentLayer = this.grid.getLayer(layerCellData);
    }

    // Track last safe cell before boarding a moving tile
    if (this.onMovingTile && !this.wasOnMovingTile) {
      // Just boarded — use the last known safe ground cell as respawn point
      // (already tracked below each frame when not on a tile)
    }
    if (!this.onMovingTile) {
      this.wasOnMovingTile = false;
      // Track last safe ground cell while NOT on a moving tile
      // Only save if the cell is genuinely walkable ground (not water/void/blocked)
      if (layerCellData && !layerCellData.properties.has('water') && !layerCellData.properties.has('void') && !layerCellData.properties.has('blocked')) {
        this.lastCellBeforeMovingTile = { col: centerCell.col, row: centerCell.row };
      }
    } else {
      // Check for tileDeath while riding a moving tile
      if (this.entity.tags.has('player') && layerCellData?.properties.has('tileDeath')) {
        this.triggerTileDeath();
      }
      this.wasOnMovingTile = true;
    }

    this.previousX = transform.x;
    this.previousY = transform.y;

    this.grid.renderCollisionBox(boxLeft, boxTop, gridPos.collisionBox.width, gridPos.collisionBox.height);
  }

  /**
   * Check if a moving tile covers the given cell or a neighboring cell.
   * Checks the cell and its immediate orthogonal neighbors for tile occupants
   * whose geometric footprint (coversCell) includes the query coordinates.
   */
  /** Check if the tile edge in the given direction has water/void (should clamp) or safe ground (allow exit). */
  private shouldClampEdge(tile: MovingTileComponent, tileTransform: TransformComponent, direction: 'left' | 'right' | 'up' | 'down'): boolean {
    const cellSize = this.grid.cellSize;
    const tileCol = Math.floor(tileTransform.x / cellSize);
    const tileRow = Math.floor(tileTransform.y / cellSize);

    let checkCols: number[];
    let checkRows: number[];

    switch (direction) {
      case 'left':
        checkCols = [tileCol - Math.ceil(tile.widthCells / 2) - 1 + 1];
        checkRows = Array.from({ length: tile.heightCells }, (_, i) => tileRow - Math.floor(tile.heightCells / 2) + i);
        // Check the column just to the left of the tile
        checkCols = [tile.getTopLeftCol() - 1];
        checkRows = Array.from({ length: tile.heightCells }, (_, i) => tile.getTopLeftRow() + i);
        break;
      case 'right':
        checkCols = [tile.getTopLeftCol() + tile.widthCells];
        checkRows = Array.from({ length: tile.heightCells }, (_, i) => tile.getTopLeftRow() + i);
        break;
      case 'up':
        checkRows = [tile.getTopLeftRow() - 1];
        checkCols = Array.from({ length: tile.widthCells }, (_, i) => tile.getTopLeftCol() + i);
        break;
      case 'down':
        checkRows = [tile.getTopLeftRow() + tile.heightCells];
        checkCols = Array.from({ length: tile.widthCells }, (_, i) => tile.getTopLeftCol() + i);
        break;
    }

    // If ANY cell beyond the edge is water, void, or blocked (or out of bounds), clamp
    for (const col of checkCols) {
      for (const row of checkRows) {
        const cell = this.grid.getCell(col, row);
        if (!cell) return true; // out of bounds = clamp
        if (cell.properties.has('void')) return true;
        if (cell.properties.has('blocked')) return true;
        if (cell.properties.has('tileDeath')) return true;
        if (cell.properties.has('water') && !cell.properties.has('bridge')) {
          const canSwim = this.entity.get(WaterEffectComponent) && this.validator.getCanSwim();
          if (!canSwim) return true;
        }
      }
    }
    return false; // safe ground — allow stepping off
  }

  /** Find the moving tile the entity is currently riding (pixel-based, checks neighbors). */
  private findRidingTile(centerX: number, centerY: number): MovingTileComponent | null {
    const col = Math.floor(centerX / this.grid.cellSize);
    const row = Math.floor(centerY / this.grid.cellSize);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const cell = this.grid.getCell(col + dc, row + dr);
        if (!cell) continue;
        for (const occupant of cell.occupants) {
          const tile = occupant.get(MovingTileComponent);
          if (tile?.coversCellPixel(col, row, this.grid.cellSize)) return tile;
        }
      }
    }
    return null;
  }

  private triggerTileDeath(): void {
    const sm = this.entity.get(StateMachineComponent);
    if (!sm || sm.stateMachine.getCurrentKey() === 'tileDeath' || sm.stateMachine.getCurrentKey() === 'death') return;

    // Stop moving with the tile immediately
    this.onMovingTile = false;
    this.wasOnMovingTile = false;

    const tileDeathState = sm.stateMachine.getState('tileDeath') as { setRespawnCell?: (col: number, row: number) => void } | undefined;
    if (tileDeathState?.setRespawnCell && this.lastCellBeforeMovingTile) {
      tileDeathState.setRespawnCell(this.lastCellBeforeMovingTile.col, this.lastCellBeforeMovingTile.row);
    }
    sm.stateMachine.enter('tileDeath');
  }

  onDestroy(): void {
    this.occupiedCells.forEach(key => {
      const { col, row } = GridCollisionComponent.decodeCellKey(key);
      this.grid.removeOccupant(col, row, this.entity);
    });
    this.occupiedCells.clear();
    this.validator.destroy();
  }
}
