import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { InputComponent } from '../input/InputComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';
import { HealthComponent } from '../core/HealthComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';

const TAKEOFF_DURATION_MS = 180;
const FLIGHT_DURATION_MS = 300;
const LAND_DURATION_MS = 180;
const JUMP_HEIGHT_PX = 30;
const FALL_DURATION_MS = 600;
const FALL_DRIFT_PX = 20;
const FALL_DAMAGE = 10;

type JumpPhase = 'idle' | 'takeoff' | 'flight' | 'landing' | 'falling';

export type VoidJumpComponentProps = {
  readonly grid: GridReader;
};

export class VoidJumpComponent implements Component {
  entity!: Entity;
  private readonly grid: GridReader;
  private phase: JumpPhase = 'idle';
  private phaseTimer = 0;
  private startX = 0;
  private startY = 0;
  private targetX = 0;
  private targetY = 0;
  private jumpDir: Direction = Direction.Down;
  private isFallJump = false;
  private safeX = 0;
  private safeY = 0;
  private originalScale = 1;

  constructor(props: VoidJumpComponentProps) {
    this.grid = props.grid;
  }

  isJumping(): boolean {
    return this.phase !== 'idle';
  }

  update(delta: number): void {
    if (this.phase !== 'idle') {
      this.updateJump(delta);
      return;
    }

    // Track last safe position (non-void cell)
    this.updateSafePosition();

    const gridCollision = this.entity.get(GridCollisionComponent);
    if (!gridCollision?.blockedByVoid) return;

    const { fromCol, fromRow, toCol, toRow } = gridCollision.blockedByVoid;

    // Cardinal only
    if (fromCol !== toCol && fromRow !== toRow) return;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const landCol = toCol + dx;
    const landRow = toRow + dy;

    const fromCell = this.grid.getCell(fromCol, fromRow);
    if (!fromCell) return;

    // Check if landing cell is valid for a safe jump
    const landCell = this.grid.getCell(landCol, landRow);
    const isLandingSafe = landCell
      && landCell.layer === fromCell.layer
      && !landCell.properties.has('void')
      && !landCell.properties.has('wall')
      && !landCell.properties.has('blocked')
      && !(landCell.properties.has('platform') && landCell.layer > fromCell.layer)
      && ![...landCell.occupants].some(o => o.get(GridCellBlocker));

    if (isLandingSafe) {
      this.isFallJump = false;
      this.startJump(landCol, landRow, dx, dy);
    } else {
      // Jump into the void cell itself — will fall
      this.isFallJump = true;
      this.startJump(toCol, toRow, dx, dy);
    }
  }

  private updateSafePosition(): void {
    const transform = this.entity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    if (!transform || !gridPos) return;
    const cell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
    if (cell && !cell.properties.has('void')) {
      this.safeX = transform.x;
      this.safeY = transform.y;
    }
  }

  private startJump(landCol: number, landRow: number, dx: number, dy: number): void {
    this.jumpDir = dirFromDelta(dx, dy);
    this.phase = 'takeoff';
    this.phaseTimer = 0;

    const transform = this.entity.require(TransformComponent);
    this.startX = transform.x;
    this.startY = transform.y;
    this.originalScale = transform.scale;

    const landWorld = this.grid.cellToWorld(landCol, landRow);
    // Snap to cell center on the jump axis, keep player's current position on perpendicular axis
    this.targetX = dx !== 0 ? landWorld.x + this.grid.cellSize / 2 : transform.x;
    this.targetY = dy !== 0 ? landWorld.y + this.grid.cellSize / 2 : transform.y;

    // Disable input, movement, collision
    this.entity.get(InputComponent)?.setEnabled(false);
    const walk = this.entity.get(WalkComponent);
    if (walk) { walk.setEnabled(false); walk.resetVelocity(true, true); }
    const collision = this.entity.get(CollisionComponent);
    if (collision) collision.enabled = false;
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    // Play takeoff animation (skip phase if no animation exists)
    const hasJumpAnim = this.playAnim(`jump_takeoff_${this.jumpDir}`);
    if (!hasJumpAnim) {
      // No jump animations — go straight to flight (pets, escorts)
      this.phase = 'flight';
      this.phaseTimer = 0;
    }
  }

  private updateJump(delta: number): void {
    this.phaseTimer += delta;

    if (this.phase === 'takeoff') {
      this.playAnim(`jump_takeoff_${this.jumpDir}`);
      if (this.phaseTimer >= TAKEOFF_DURATION_MS) {
        this.phase = 'flight';
        this.phaseTimer = 0;
        this.playAnim(`jump_flight_${this.jumpDir}`);
      }
    } else if (this.phase === 'flight') {
      const progress = Math.min(1, this.phaseTimer / FLIGHT_DURATION_MS);

      const transform = this.entity.require(TransformComponent);
      transform.x = this.startX + (this.targetX - this.startX) * progress;
      transform.y = this.startY + (this.targetY - this.startY) * progress;

      const sprite = this.entity.get(SpriteComponent);
      if (sprite) {
        sprite.visualOffsetYPx = Math.sin(progress * Math.PI) * -JUMP_HEIGHT_PX;
      }

      this.playAnim(`jump_flight_${this.jumpDir}`);

      if (progress >= 1) {
        if (this.isFallJump) {
          // Landed on void — start falling
          this.phase = 'falling';
          this.phaseTimer = 0;
          if (sprite) sprite.visualOffsetYPx = 0;
          this.startX = transform.x;
          this.startY = transform.y;
          // Hide shadow during fall
          const shadow = this.entity.get(ShadowComponent);
          if (shadow) shadow.shadow.setVisible(false);
          this.playAnim(`fall_${Direction.Down}`);
          return;
        }

        const hasLandAnim = this.playAnim(`jump_land_${this.jumpDir}`);
        if (hasLandAnim) {
          this.phase = 'landing';
          this.phaseTimer = 0;
          if (sprite) sprite.visualOffsetYPx = 0;
        } else {
          if (sprite) sprite.visualOffsetYPx = 0;
          this.finishJump();
        }
      }
    } else if (this.phase === 'landing') {
      this.playAnim(`jump_land_${this.jumpDir}`);
      if (this.phaseTimer >= LAND_DURATION_MS) {
        this.finishJump();
      }
    } else if (this.phase === 'falling') {
      this.updateFalling(delta);
    }
  }

  private updateFalling(_delta: number): void {
    const progress = Math.min(1, this.phaseTimer / FALL_DURATION_MS);

    const transform = this.entity.require(TransformComponent);
    // Drift down slightly
    transform.y = this.startY + progress * FALL_DRIFT_PX;
    // Shrink sprite to simulate falling into void
    transform.scale = this.originalScale * (1 - progress);

    if (progress >= 1) {
      this.finishFall();
    }
  }

  private finishFall(): void {
    const transform = this.entity.require(TransformComponent);

    // Restore scale
    transform.scale = this.originalScale;

    // Teleport to last safe position
    transform.x = this.safeX;
    transform.y = this.safeY;

    // Show shadow again
    const shadow = this.entity.get(ShadowComponent);
    if (shadow) shadow.shadow.setVisible(true);

    // Deduct health
    const health = this.entity.get(HealthComponent);
    if (health) health.takeDamage(FALL_DAMAGE);

    // Reset sprite visual offset
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) sprite.visualOffsetYPx = 0;

    this.phase = 'idle';

    // Update grid position
    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) {
      gridPos.currentCell = this.grid.worldToCell(transform.x, transform.y);
    }

    // Re-enable systems
    this.entity.get(InputComponent)?.setEnabled(true);
    this.entity.get(WalkComponent)?.setEnabled(true);
    const collision = this.entity.get(CollisionComponent);
    if (collision) collision.enabled = true;
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) {
      gridCollision.enabled = true;
      gridCollision.syncPreviousPosition(transform.x, transform.y);
    }

    // Return to idle
    this.playAnim(`idle_${this.jumpDir}`);
  }

  /** Returns true if the animation exists and was played */
  private playAnim(key: string): boolean {
    const anim = this.entity.get(AnimationComponent);
    if (!anim) return false;
    if (!anim.animationSystem.hasAnimation(key)) return false;
    if (anim.animationSystem.getCurrentKey() !== key) {
      anim.animationSystem.play(key);
    }
    return true;
  }

  private finishJump(): void {
    this.phase = 'idle';

    const transform = this.entity.require(TransformComponent);

    // Update grid position
    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) {
      gridPos.currentCell = this.grid.worldToCell(transform.x, transform.y);
    }

    // Re-enable systems
    this.entity.get(InputComponent)?.setEnabled(true);
    this.entity.get(WalkComponent)?.setEnabled(true);
    const collision = this.entity.get(CollisionComponent);
    if (collision) collision.enabled = true;
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) {
      gridCollision.enabled = true;
      gridCollision.syncPreviousPosition(transform.x, transform.y);
    }

    // Return to idle
    this.playAnim(`idle_${this.jumpDir}`);
  }
}
