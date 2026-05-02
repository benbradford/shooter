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
  private isPlatformJump = false;
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
    if (!gridCollision) return;

    if (gridCollision.blockedByVoid) {
      this.handleVoidJump(gridCollision.blockedByVoid);
    } else if (gridCollision.blockedByPlatformEdge) {
      this.handlePlatformJump(gridCollision.blockedByPlatformEdge);
    }
  }

  private handleVoidJump(blocked: { fromCol: number; fromRow: number; toCol: number; toRow: number }): void {
    const { fromCol, fromRow, toCol, toRow } = blocked;

    // Cardinal only
    if (fromCol !== toCol && fromRow !== toRow) return;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const landCol = toCol + dx;
    const landRow = toRow + dy;

    const fromCell = this.grid.getCell(fromCol, fromRow);
    if (!fromCell) return;

    const landCell = this.grid.getCell(landCol, landRow);
    if (this.isLandingSafe(landCell, fromCell)) {
      this.isFallJump = false;
      this.isPlatformJump = false;
      this.startJump(landCol, landRow, dx, dy);
    } else {
      // Jump into the void cell itself — will fall
      this.isFallJump = true;
      this.isPlatformJump = false;
      this.startJump(toCol, toRow, dx, dy);
    }
  }

  private handlePlatformJump(blocked: { fromCol: number; fromRow: number; toCol: number; toRow: number }): void {
    const { fromCol, fromRow, toCol, toRow } = blocked;

    // Cardinal only
    if (fromCol !== toCol && fromRow !== toRow) return;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;

    const fromCell = this.grid.getCell(fromCol, fromRow);
    const toCell = this.grid.getCell(toCol, toRow);
    if (!fromCell || !toCell) return;

    // Don't jump if destination is stairs (preserve normal stair behavior)
    if (this.grid.isTransition(toCell)) return;

    // Determine landing cell: if blocked cell is a wall, skip over it (perspective wall)
    let landCol: number;
    let landRow: number;
    if (this.grid.isWall(toCell)) {
      landCol = toCol + dx;
      landRow = toRow + dy;
    } else {
      // Lower layer cell — land directly on it
      landCol = toCol;
      landRow = toRow;
    }

    const landCell = this.grid.getCell(landCol, landRow);
    if (!landCell) return;

    // Don't jump to stairs
    if (this.grid.isTransition(landCell)) return;

    // Check for GridCellBlocker occupants
    for (const occupant of landCell.occupants) {
      if (occupant.get(GridCellBlocker)) return;
    }

    if (landCell.properties.has('void')) {
      // Jump to void cell — will trigger fall sequence
      this.isFallJump = true;
      this.isPlatformJump = true;
      this.startJump(landCol, landRow, dx, dy);
    } else if (this.isValidPlatformLanding(landCell, fromCell)) {
      // Valid ground/water landing
      this.isFallJump = false;
      this.isPlatformJump = true;
      this.startJump(landCol, landRow, dx, dy);
    }
  }

  /** Check if a cell is a valid landing for a void jump (same layer, no obstacles) */
  private isLandingSafe(landCell: ReturnType<GridReader['getCell']>, fromCell: NonNullable<ReturnType<GridReader['getCell']>>): boolean {
    return !!landCell
      && landCell.layer === fromCell.layer
      && !landCell.properties.has('void')
      && !landCell.properties.has('wall')
      && !landCell.properties.has('blocked')
      && !(landCell.properties.has('platform') && landCell.layer > fromCell.layer)
      && ![...landCell.occupants].some(o => o.get(GridCellBlocker));
  }

  /** Check if a cell is a valid landing for a platform jump-down */
  private isValidPlatformLanding(landCell: NonNullable<ReturnType<GridReader['getCell']>>, _fromCell: NonNullable<ReturnType<GridReader['getCell']>>): boolean {
    // Valid destinations: lower layer ground (no properties), water, lower platform
    if (landCell.properties.has('wall') || landCell.properties.has('blocked')) return false;
    // Water is valid (WaterEffectComponent will handle entry)
    if (landCell.properties.has('water')) return true;
    // Ground or lower platform
    return true;
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

    // Perspective offset for platform jumps
    if (this.isPlatformJump) {
      const PLATFORM_JUMP_OFFSET_PX = 20;
      if (dx !== 0 && dy === 0) {
        // Jumping left or right: land 40px further south
        this.targetY += PLATFORM_JUMP_OFFSET_PX * 2;
      } else {
        // Jumping north or south: land 20px further north
        this.targetY -= PLATFORM_JUMP_OFFSET_PX;
      }
    }

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
          this.phase = 'falling';
          this.phaseTimer = 0;
          if (sprite) sprite.visualOffsetYPx = 0;
          this.startX = transform.x;
          this.startY = transform.y;
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
      this.updateFalling();
    }
  }

  private updateFalling(): void {
    const progress = Math.min(1, this.phaseTimer / FALL_DURATION_MS);

    const transform = this.entity.require(TransformComponent);
    transform.y = this.startY + progress * FALL_DRIFT_PX;
    const shrink = 1 - progress;
    transform.scale = this.originalScale * shrink;

    const shadow = this.entity.get(ShadowComponent);
    if (shadow) {
      shadow.shadow.setVisible(false);
      shadow.shadow.setScale(shadow.props.scale * shrink);
    }

    if (progress >= 1) {
      this.finishFall();
    }
  }

  private finishFall(): void {
    const transform = this.entity.require(TransformComponent);

    transform.scale = this.originalScale;
    transform.x = this.safeX;
    transform.y = this.safeY;

    const shadow = this.entity.get(ShadowComponent);
    if (shadow) {
      shadow.shadow.setVisible(true);
      shadow.shadow.setScale(shadow.props.scale);
    }

    const health = this.entity.get(HealthComponent);
    if (health) health.takeDamage(FALL_DAMAGE);

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) sprite.visualOffsetYPx = 0;

    this.phase = 'idle';

    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) {
      gridPos.currentCell = this.grid.worldToCell(transform.x, transform.y);
    }

    this.reEnableSystems(transform);
    this.playAnim(`idle_${this.jumpDir}`);
  }

  private finishJump(): void {
    this.phase = 'idle';

    const transform = this.entity.require(TransformComponent);

    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) {
      gridPos.currentCell = this.grid.worldToCell(transform.x, transform.y);
      // Update layer to match landing cell
      const landCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      if (landCell) {
        gridPos.currentLayer = landCell.layer;
      }
    }

    this.reEnableSystems(transform);
    this.playAnim(`idle_${this.jumpDir}`);
  }

  private reEnableSystems(transform: TransformComponent): void {
    this.entity.get(InputComponent)?.setEnabled(true);
    this.entity.get(WalkComponent)?.setEnabled(true);
    const collision = this.entity.get(CollisionComponent);
    if (collision) collision.enabled = true;
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) {
      gridCollision.enabled = true;
      gridCollision.syncPreviousPosition(transform.x, transform.y);
    }
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
}
