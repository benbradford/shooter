import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { SoundManager } from '../../../systems/SoundManager';

export type PushableProps = {
  grid: Grid;
  pushEnabled: boolean;
  doesPersist: boolean;
  singlePushOnly: boolean;
  spawnCol: number;
  spawnRow: number;
  layer: number;
};

const MOVE_SPEED_PX_PER_SEC = 100;

export const PUSH_ALIGNMENT_DIVISOR = 2.5;

export class PushableComponent implements Component {
  entity!: Entity;
  pushEnabled: boolean;
  readonly doesPersist: boolean;
  private readonly singlePushOnly: boolean;
  private readonly grid: Grid;
  readonly spawnCol: number;
  readonly spawnRow: number;
  readonly layer: number;
  private isLocked = false;

  private isMoving = false;
  private moveStartX = 0;
  private moveStartY = 0;
  private moveTargetX = 0;
  private moveTargetY = 0;
  private moveProgress = 0;
  private moveTotalDistPx = 0;
  private currentCol = 0;
  private currentRow = 0;

  constructor(props: PushableProps) {
    this.grid = props.grid;
    this.pushEnabled = props.pushEnabled;
    this.doesPersist = props.doesPersist;
    this.singlePushOnly = props.singlePushOnly;
    this.spawnCol = props.spawnCol;
    this.spawnRow = props.spawnRow;
    this.layer = props.layer;
  }

  initPosition(col: number, row: number): void {
    this.currentCol = col;
    this.currentRow = row;
  }

  getIsMoving(): boolean {
    return this.isMoving;
  }

  getIsLocked(): boolean {
    return this.isLocked;
  }

  getCurrentCol(): number {
    return this.currentCol;
  }

  getCurrentRow(): number {
    return this.currentRow;
  }

  startMove(targetCol: number, targetRow: number, grid: Grid): void {
    const transform = this.entity.require(TransformComponent);
    this.moveStartX = transform.x;
    this.moveStartY = transform.y;
    const targetWorld = grid.cellToWorld(targetCol, targetRow);
    this.moveTargetX = targetWorld.x + grid.cellSize / 2;
    this.moveTargetY = targetWorld.y + grid.cellSize / 2;
    this.moveProgress = 0;
    this.moveTotalDistPx = Math.hypot(this.moveTargetX - this.moveStartX, this.moveTargetY - this.moveStartY);
    this.isMoving = true;

    // Disable GridCollisionComponent during move (sole occupant ownership)
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    // Atomic occupant swap: free source, claim target
    grid.removeOccupant(this.currentCol, this.currentRow, this.entity);
    grid.addOccupant(targetCol, targetRow, this.entity);

    // Update GridPositionComponent to target
    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) {
      gridPos.currentCell = { col: targetCol, row: targetRow };
    }

    this.currentCol = targetCol;
    this.currentRow = targetRow;
  }

  update(delta: number): void {
    if (!this.isMoving) return;

    const transform = this.entity.require(TransformComponent);
    this.moveProgress += (MOVE_SPEED_PX_PER_SEC * delta / 1000) / this.moveTotalDistPx;

    if (this.moveProgress >= 1) {
      this.moveProgress = 1;
      this.isMoving = false;

      if (this.singlePushOnly) {
        this.pushEnabled = false;
      }

      // Check if landed on push_lock cell
      const cell = this.grid.getCell(this.currentCol, this.currentRow);
      if (cell?.properties.has('push_lock')) {
        this.pushEnabled = false;
        this.isLocked = true;
        SoundManager.getInstance().play('click1');
      }

      // Re-enable GridCollisionComponent and sync its previous position
      const gridCollision = this.entity.get(GridCollisionComponent);
      if (gridCollision) {
        gridCollision.syncPreviousPosition(this.moveTargetX, this.moveTargetY);
        gridCollision.enabled = true;
      }
    }

    transform.x = this.moveStartX + (this.moveTargetX - this.moveStartX) * this.moveProgress;
    transform.y = this.moveStartY + (this.moveTargetY - this.moveStartY) * this.moveProgress;
  }
}
