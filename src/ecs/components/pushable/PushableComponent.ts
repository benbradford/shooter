import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
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
const FALL_GRAVITY_PX_PER_SEC_SQ = 800;
const FALL_LAND_BOUNCE_PX = 4;
const FALL_LAND_BOUNCE_DURATION_MS = 150;

const DRAG_SOUNDS = ['drag1', 'drag2'] as const;

export const PUSH_ALIGNMENT_DIVISOR = 2.5;

export class PushableComponent implements Component {
  entity!: Entity;
  pushEnabled: boolean;
  readonly doesPersist: boolean;
  private readonly singlePushOnly: boolean;
  private readonly grid: Grid;
  readonly spawnCol: number;
  readonly spawnRow: number;
  layer: number;
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

  private isFalling = false;
  private fallVelocityPxPerSec = 0;
  private fallTargetY = 0;
  private fallLandCol = 0;
  private fallLandRow = 0;
  private fallLandLayer = 0;

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

  getIsFalling(): boolean {
    return this.isFalling;
  }

  /** Find the landing row below the current position. Returns -1 if no valid landing. */
  findLandingRow(fromCol: number, fromRow: number, fromLayer: number): number {
    for (let row = fromRow + 1; row < 100; row++) {
      const cell = this.grid.getCell(fromCol, row);
      if (!cell) return -1;
      const cellLayer = cell.layer;
      // Skip wall cells (same layer as platform)
      if (cellLayer >= fromLayer && (this.grid.isWall(cell) || cell.properties.has('platform'))) continue;
      // Found a lower-layer cell — land here
      if (cellLayer < fromLayer) return row;
      // Same layer, not wall/platform — land here
      return row;
    }
    return -1;
  }

  startFall(landingRow: number): void {
    // Free current cell
    this.grid.removeOccupant(this.currentCol, this.currentRow, this.entity);

    // Disable collision during fall
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    // Calculate landing position
    const landWorld = this.grid.cellToWorld(this.currentCol, landingRow);
    this.fallTargetY = landWorld.y + this.grid.cellSize / 2;
    this.fallLandCol = this.currentCol;
    this.fallLandRow = landingRow;
    const landCell = this.grid.getCell(this.currentCol, landingRow);
    this.fallLandLayer = landCell?.layer ?? 0;
    this.fallVelocityPxPerSec = 0;
    this.isFalling = true;

    // Hide shadow during fall
    const shadow = this.entity.get(ShadowComponent);
    if (shadow) shadow.shadow.setVisible(false);
  }

  startMove(targetCol: number, targetRow: number, grid: Grid): void {
    SoundManager.getInstance().play(DRAG_SOUNDS[Math.floor(Math.random() * DRAG_SOUNDS.length)]);
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
    if (this.isFalling) {
      this.updateFall(delta);
      return;
    }
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

  private updateFall(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const deltaSec = delta / 1000;

    this.fallVelocityPxPerSec += FALL_GRAVITY_PX_PER_SEC_SQ * deltaSec;
    transform.y += this.fallVelocityPxPerSec * deltaSec;

    if (transform.y >= this.fallTargetY) {
      transform.y = this.fallTargetY;
      this.isFalling = false;

      // Update grid state
      this.currentCol = this.fallLandCol;
      this.currentRow = this.fallLandRow;
      this.layer = this.fallLandLayer;
      this.grid.addOccupant(this.currentCol, this.currentRow, this.entity);

      const gridPos = this.entity.get(GridPositionComponent);
      if (gridPos) {
        gridPos.currentCell = { col: this.currentCol, row: this.currentRow };
        gridPos.currentLayer = this.fallLandLayer;
      }

      // Re-enable collision
      const gridCollision = this.entity.get(GridCollisionComponent);
      if (gridCollision) {
        gridCollision.syncPreviousPosition(transform.x, transform.y);
        gridCollision.enabled = true;
      }

      // Show shadow
      const shadow = this.entity.get(ShadowComponent);
      if (shadow) shadow.shadow.setVisible(true);

      // Landing bounce
      const sprite = this.entity.get(SpriteComponent);
      if (sprite) {
        sprite.visualOffsetYPx = -FALL_LAND_BOUNCE_PX;
        const scene = sprite.sprite.scene;
        scene.tweens.add({
          targets: sprite,
          visualOffsetYPx: 0,
          duration: FALL_LAND_BOUNCE_DURATION_MS,
          ease: 'Bounce.Out',
        });
      }

      SoundManager.getInstance().play('click1');
    }
  }
}
