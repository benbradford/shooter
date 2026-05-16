import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import { getPlayerFeetCell } from '../../../utils/PlayerPositionHelper';

const SYNC_JUMP_ARC_HEIGHT_PX = 30;
const SYNC_FALL_DURATION_MS = 600;
const SYNC_FALL_FINISH_DELAY_MS = 50;
const SYNC_FALL_DRIFT_PX = 20;

export class PetSyncJumpBehavior {
  private syncJumpStartX = 0;
  private syncJumpStartY = 0;
  private syncJumpTargetX = 0;
  private syncJumpTargetY = 0;
  private syncJumpDurationMs = 0;
  private syncJumpTimerMs = 0;
  private isSyncFallJump = false;
  private syncFallTimerMs = 0;
  private syncFallStartY = 0;
  private originalScale = 1;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: GridReader,
  ) {}

  startJump(landCol: number, landRow: number, durationMs: number, isFallJump: boolean, flightDurationMs: number): Direction {
    const transform = this.entity.require(TransformComponent);
    this.syncJumpStartX = transform.x;
    this.syncJumpStartY = transform.y;
    const cellWorld = this.grid.cellToWorld(landCol, landRow);
    this.syncJumpTargetX = cellWorld.x + this.grid.cellSize / 2;
    this.syncJumpTargetY = cellWorld.y + this.grid.cellSize / 2;
    this.syncJumpDurationMs = isFallJump ? flightDurationMs : durationMs;
    this.syncJumpTimerMs = 0;
    this.isSyncFallJump = isFallJump;

    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    const dx = this.syncJumpTargetX - transform.x;
    const dy = this.syncJumpTargetY - transform.y;
    const dir = dirFromDelta(dx, dy);
    return dir === Direction.None ? Direction.Down : dir;
  }

  /** Returns true when jump is complete (transition to fall or idle). */
  updateJump(delta: number): 'jumping' | 'fall' | 'done' {
    this.syncJumpTimerMs += delta;
    const progress = Math.min(1, this.syncJumpTimerMs / this.syncJumpDurationMs);

    const transform = this.entity.require(TransformComponent);
    transform.x = this.syncJumpStartX + (this.syncJumpTargetX - this.syncJumpStartX) * progress;
    transform.y = this.syncJumpStartY + (this.syncJumpTargetY - this.syncJumpStartY) * progress;

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = Math.sin(progress * Math.PI) * -SYNC_JUMP_ARC_HEIGHT_PX;
    }

    if (progress < 1) return 'jumping';

    if (sprite) sprite.visualOffsetYPx = 0;
    if (this.isSyncFallJump) {
      this.syncFallTimerMs = 0;
      this.syncFallStartY = transform.y;
      this.originalScale = transform.scale;
      const shadow = this.entity.get(ShadowComponent);
      if (shadow) shadow.shadow.setVisible(false);
      return 'fall';
    }
    this.finishJump(transform);
    return 'done';
  }

  /** Returns true when fall is complete. */
  updateFall(delta: number): boolean {
    this.syncFallTimerMs += delta;
    const shrinkProgress = Math.min(1, this.syncFallTimerMs / SYNC_FALL_DURATION_MS);
    const transform = this.entity.require(TransformComponent);

    if (shrinkProgress < 1) {
      transform.y = this.syncFallStartY + shrinkProgress * SYNC_FALL_DRIFT_PX;
      transform.scale = this.originalScale * (1 - shrinkProgress);
      return false;
    }

    transform.scale = 0;
    if (this.syncFallTimerMs >= SYNC_FALL_DURATION_MS + SYNC_FALL_FINISH_DELAY_MS) {
      transform.scale = this.originalScale;
      const playerFeetCell = getPlayerFeetCell(this.playerEntity, this.grid);
      const cellWorld = this.grid.cellToWorld(playerFeetCell.col, playerFeetCell.row);
      transform.x = cellWorld.x + this.grid.cellSize / 2;
      transform.y = cellWorld.y + this.grid.cellSize / 2;
      const shadow = this.entity.get(ShadowComponent);
      if (shadow) shadow.shadow.setVisible(true);
      this.finishJump(transform);
      return true;
    }
    return false;
  }

  private finishJump(transform: TransformComponent): void {
    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const petGridPos = this.entity.get(GridPositionComponent);
    if (playerGridPos && petGridPos) {
      petGridPos.currentLayer = playerGridPos.currentLayer;
      petGridPos.currentCell = this.grid.worldToCell(transform.x, transform.y);
    }
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) {
      gridCollision.enabled = true;
      gridCollision.syncPreviousPosition(transform.x, transform.y);
    }
  }
}
