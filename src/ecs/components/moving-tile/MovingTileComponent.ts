import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid, GridReader, CellCoord, CellData } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { PetFollowComponent } from '../pet/PetFollowComponent';
import { isMoveStep, type MovingTileStep } from './MovingTileScript';

export type MovingTileProps = {
  grid: Grid;
  widthCells: number;
  heightCells: number;
  startCol: number;
  startRow: number;
  script: MovingTileStep[];
  scriptEnabled: boolean;
};

const ARRIVAL_THRESHOLD_PX = 0.5;

const RIDER_TAGS = ['player', 'pet'] as const;

const PET_BOARD_JUMP_DURATION_MS = 400;

/**
 * Shared lookup used by movement, water, and depth logic to ask
 * "is this cell currently covered by a moving tile's surface?"
 *
 * Because tile grid occupancy is snap-to-grid (only updates on full cell
 * boundary crossings), a tile may geometrically cover a cell without being
 * registered there yet. We check the cell and immediate neighbors using
 * pixel-based overlap (coversCellPixel) for accuracy.
 */
export function findMovingTileCovering(grid: GridReader, col: number, row: number): MovingTileComponent | null {
  const cellSize = grid.cellSize;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const neighbor = grid.getCell(col + dc, row + dr);
      if (!neighbor) continue;
      for (const occupant of neighbor.occupants) {
        const tile = occupant.get(MovingTileComponent);
        if (tile?.coversCellPixel(col, row, cellSize)) {
          return tile;
        }
      }
    }
  }
  return null;
}

/**
 * A platform-sized grid occupant that follows a looping script of wait/move steps.
 * Owns its own footprint occupancy (no GridCollisionComponent) so the movement
 * validator can special-case boarding and leaving it.
 */
export class MovingTileComponent implements Component {
  entity!: Entity;

  readonly widthCells: number;
  readonly heightCells: number;
  readonly startCol: number;
  readonly startRow: number;

  private readonly grid: Grid;
  private readonly script: MovingTileStep[];
  private readonly scriptEnabled: boolean;

  private stepIndex = 0;
  private waitRemainingMs = 0;
  private moveTargetX = 0;
  private moveTargetY = 0;
  private moveSpeedPxPerSec = 0;
  private isMoving = false;

  private topLeftCol: number;
  private topLeftRow: number;
  private readonly occupiedCells: Set<number> = new Set();

  private deltaX = 0;
  private deltaY = 0;

  private readonly _tmpCell: CellCoord = { col: 0, row: 0 };
  private readonly _ridersThisFrame: Set<Entity> = new Set();

  constructor(props: MovingTileProps) {
    this.grid = props.grid;
    this.widthCells = props.widthCells;
    this.heightCells = props.heightCells;
    this.startCol = props.startCol;
    this.startRow = props.startRow;
    this.script = props.script;
    this.scriptEnabled = props.scriptEnabled;
    this.topLeftCol = props.startCol;
    this.topLeftRow = props.startRow;
  }

  /** Claim the initial footprint. Called once after the entity is assembled. */
  init(): void {
    this.syncOccupancy();
    this.beginStep();
  }

  getTopLeftCol(): number {
    return this.topLeftCol;
  }

  getTopLeftRow(): number {
    return this.topLeftRow;
  }

  getIsMoving(): boolean {
    return this.isMoving;
  }

  /** World-space movement applied this frame, used to carry riders. */
  getDeltaX(): number {
    return this.deltaX;
  }

  getDeltaY(): number {
    return this.deltaY;
  }

  /** True when the given cell is part of this tile's footprint. */
  coversCell(col: number, row: number): boolean {
    return col >= this.topLeftCol && col < this.topLeftCol + this.widthCells
      && row >= this.topLeftRow && row < this.topLeftRow + this.heightCells;
  }

  /** True when the tile's pixel bounds overlap the given cell (continuous, not snap-to-grid). */
  coversCellPixel(col: number, row: number, cellSize: number): boolean {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return false;
    const tileLeft = transform.x - (this.widthCells * cellSize) / 2;
    const tileRight = transform.x + (this.widthCells * cellSize) / 2;
    const tileTop = transform.y - (this.heightCells * cellSize) / 2;
    const tileBottom = transform.y + (this.heightCells * cellSize) / 2;
    const cellLeft = col * cellSize;
    const cellRight = (col + 1) * cellSize;
    const cellTop = row * cellSize;
    const cellBottom = (row + 1) * cellSize;
    return tileRight > cellLeft && tileLeft < cellRight
      && tileBottom > cellTop && tileTop < cellBottom;
  }

  update(delta: number): void {
    this.deltaX = 0;
    this.deltaY = 0;
    if (!this.scriptEnabled || this.script.length === 0) return;

    if (this.isMoving) {
      this.updateMove(delta);
      return;
    }

    this.waitRemainingMs -= delta;
    if (this.waitRemainingMs <= 0) {
      this.advanceStep();
    }
  }

  private advanceStep(): void {
    this.stepIndex = (this.stepIndex + 1) % this.script.length;
    this.beginStep();
  }

  private beginStep(): void {
    const step = this.script[this.stepIndex];
    if (!step) return;

    if (isMoveStep(step)) {
      const targetWorld = this.grid.cellToWorld(step.moveTo.col, step.moveTo.row);
      this.moveTargetX = targetWorld.x + (this.widthCells * this.grid.cellSize) / 2;
      this.moveTargetY = targetWorld.y + (this.heightCells * this.grid.cellSize) / 2;
      this.moveSpeedPxPerSec = step.speedCellsPerSec * this.grid.cellSize;
      this.isMoving = true;
      this.waitRemainingMs = 0;
      this.signalPetToBoard();
    } else {
      this.isMoving = false;
      this.waitRemainingMs = step.waitMs;
    }
  }

  /**
   * When the tile starts moving and the player is aboard, signal the pet
   * to jump onto the tile so it rides along.
   */
  private signalPetToBoard(): void {
    // Check if the player is currently on this tile's footprint
    let playerOnTile = false;
    for (let row = this.topLeftRow; row < this.topLeftRow + this.heightCells; row++) {
      for (let col = this.topLeftCol; col < this.topLeftCol + this.widthCells; col++) {
        const cell = this.grid.getCell(col, row);
        if (!cell) continue;
        for (const occupant of cell.occupants) {
          if (occupant.tags.has('player')) { playerOnTile = true; break; }
        }
        if (playerOnTile) break;
      }
      if (playerOnTile) break;
    }
    if (!playerOnTile) return;

    // Find the pet — check if it's already on the tile
    let petEntity: Entity | null = null;
    let petAlreadyOnTile = false;
    for (let row = this.topLeftRow; row < this.topLeftRow + this.heightCells; row++) {
      for (let col = this.topLeftCol; col < this.topLeftCol + this.widthCells; col++) {
        const cell = this.grid.getCell(col, row);
        if (!cell) continue;
        for (const occupant of cell.occupants) {
          if (occupant.tags.has('pet')) {
            petEntity = occupant;
            petAlreadyOnTile = true;
          }
        }
      }
    }

    // If pet is not on the tile, search nearby cells
    if (!petEntity) {
      const searchRadius = 5;
      for (let row = this.topLeftRow - searchRadius; row < this.topLeftRow + this.heightCells + searchRadius && !petEntity; row++) {
        for (let col = this.topLeftCol - searchRadius; col < this.topLeftCol + this.widthCells + searchRadius && !petEntity; col++) {
          const cell = this.grid.getCell(col, row);
          if (!cell) continue;
          for (const occupant of cell.occupants) {
            if (occupant.tags.has('pet')) { petEntity = occupant; break; }
          }
        }
      }
    }

    if (!petEntity || petAlreadyOnTile) return;

    // Signal the pet to jump onto the tile's center cell, tracking the tile's
    // live position during flight so the arc lands correctly on a moving target.
    const petFollow = petEntity.get(PetFollowComponent);
    if (!petFollow) return;

    const landCol = this.topLeftCol + Math.floor(this.widthCells / 2);
    const landRow = this.topLeftRow + Math.floor(this.heightCells / 2);
    petFollow.syncJump(landCol, landRow, PET_BOARD_JUMP_DURATION_MS, false, PET_BOARD_JUMP_DURATION_MS, this.entity);
  }

  private updateMove(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const dx = this.moveTargetX - transform.x;
    const dy = this.moveTargetY - transform.y;
    const distancePx = Math.hypot(dx, dy);
    const stepPx = this.moveSpeedPxPerSec * (delta / 1000);

    const beforeX = transform.x;
    const beforeY = transform.y;

    if (distancePx <= Math.max(stepPx, ARRIVAL_THRESHOLD_PX)) {
      transform.x = this.moveTargetX;
      transform.y = this.moveTargetY;
      this.isMoving = false;
      this.advanceStep();
    } else {
      transform.x += (dx / distancePx) * stepPx;
      transform.y += (dy / distancePx) * stepPx;
    }

    this.deltaX = transform.x - beforeX;
    this.deltaY = transform.y - beforeY;

    this.carryRiders();
    this.syncOccupancy();
  }

  /** Move anything standing on the footprint by the same amount the tile moved. */
  private carryRiders(): void {
    if (this.deltaX === 0 && this.deltaY === 0) return;

    const riders = this._ridersThisFrame;
    riders.clear();

    // Scan the current (pre-syncOccupancy) footprint — this is where riders
    // were last registered. After a cell-boundary snap, the post-sync footprint
    // may no longer include a rider at the trailing edge, so we must look here.
    for (let row = this.topLeftRow; row < this.topLeftRow + this.heightCells; row++) {
      for (let col = this.topLeftCol; col < this.topLeftCol + this.widthCells; col++) {
        const cell = this.grid.getCell(col, row);
        if (!cell) continue;
        this.collectRidersOf(cell, riders);
      }
    }

    // Also scan one cell beyond the footprint in each direction of travel.
    // A rider at the trailing edge might have been registered in a cell that
    // the PREVIOUS syncOccupancy already abandoned (small delta between frames).
    if (this.deltaX !== 0 || this.deltaY !== 0) {
      const extraCol = this.deltaX > 0 ? this.topLeftCol - 1 : this.deltaX < 0 ? this.topLeftCol + this.widthCells : -1;
      const extraRow = this.deltaY > 0 ? this.topLeftRow - 1 : this.deltaY < 0 ? this.topLeftRow + this.heightCells : -1;

      if (extraCol >= 0) {
        for (let row = this.topLeftRow; row < this.topLeftRow + this.heightCells; row++) {
          const cell = this.grid.getCell(extraCol, row);
          if (cell) this.collectRidersOf(cell, riders);
        }
      }
      if (extraRow >= 0) {
        for (let col = this.topLeftCol; col < this.topLeftCol + this.widthCells; col++) {
          const cell = this.grid.getCell(col, extraRow);
          if (cell) this.collectRidersOf(cell, riders);
        }
      }
    }

    const tileTransform = this.entity.require(TransformComponent);
    const cellSize = this.grid.cellSize;
    const tileLeft = tileTransform.x - (this.widthCells * cellSize) / 2;
    const tileRight = tileLeft + this.widthCells * cellSize;
    const tileTop = tileTransform.y - (this.heightCells * cellSize) / 2;
    const tileBottom = tileTop + this.heightCells * cellSize;

    for (const rider of riders) {
      const riderTransform = rider.get(TransformComponent);
      if (!riderTransform) continue;
      // Geometric check: only carry if the rider's center is actually within
      // the tile's pixel footprint. Grid occupancy is cell-granular and can
      // register entities whose collision box barely clips into an adjacent cell.
      if (riderTransform.x < tileLeft || riderTransform.x > tileRight ||
          riderTransform.y < tileTop || riderTransform.y > tileBottom) {
        continue;
      }
      riderTransform.x += this.deltaX;
      riderTransform.y += this.deltaY;
      this.syncRiderCollision(rider, riderTransform);
      // Tell the rider's collision system to skip validation this frame —
      // the tile owns the movement and ground rules don't apply while aboard.
      const collision = rider.get(GridCollisionComponent);
      if (collision) collision.onMovingTile = true;
    }

    riders.clear();
  }

  /**
   * A rider's collision box can straddle several footprint cells, so gather the
   * unique set of riders first — otherwise each entity would be carried once per
   * overlapping cell and drift ahead of the tile.
   */
  private collectRidersOf(cell: CellData, riders: Set<Entity>): void {
    for (const occupant of cell.occupants) {
      if (occupant === this.entity) continue;
      if (!RIDER_TAGS.some(tag => occupant.tags.has(tag))) continue;
      riders.add(occupant);
    }
  }

  /**
   * The rider's collision resolver snapshots its position each frame and reverts
   * to it when a move is blocked. Advance that snapshot by the same delta so the
   * carry isn't treated as an illegal move and undone.
   */
  private syncRiderCollision(rider: Entity, riderTransform: TransformComponent): void {
    const collision = rider.get(GridCollisionComponent);
    collision?.syncPreviousPosition(riderTransform.x, riderTransform.y);
  }

  /** Recompute the footprint from the current transform and swap grid occupancy. */
  private syncOccupancy(): void {
    const transform = this.entity.require(TransformComponent);
    const left = transform.x - (this.widthCells * this.grid.cellSize) / 2;
    const top = transform.y - (this.heightCells * this.grid.cellSize) / 2;
    const topLeft = this.grid.worldToCellInto(left + this.grid.cellSize / 2, top + this.grid.cellSize / 2, this._tmpCell);

    if (topLeft.col === this.topLeftCol && topLeft.row === this.topLeftRow && this.occupiedCells.size > 0) {
      return;
    }

    for (const key of this.occupiedCells) {
      this.grid.removeOccupant(Math.floor(key / 10000), key % 10000, this.entity);
    }
    this.occupiedCells.clear();

    this.topLeftCol = topLeft.col;
    this.topLeftRow = topLeft.row;

    for (let row = this.topLeftRow; row < this.topLeftRow + this.heightCells; row++) {
      for (let col = this.topLeftCol; col < this.topLeftCol + this.widthCells; col++) {
        this.grid.addOccupant(col, row, this.entity);
        this.occupiedCells.add(col * 10000 + row);
      }
    }

    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) {
      gridPos.currentCell.col = this.topLeftCol;
      gridPos.currentCell.row = this.topLeftRow;
    }
  }

  onDestroy(): void {
    for (const key of this.occupiedCells) {
      this.grid.removeOccupant(Math.floor(key / 10000), key % 10000, this.entity);
    }
    this.occupiedCells.clear();
  }
}
