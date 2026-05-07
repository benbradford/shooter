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
import { HealthComponent } from '../core/HealthComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import type { JumpStartInfo } from './JumpComponent';

const TAKEOFF_DURATION_MS = 180;
const FLIGHT_DURATION_MS = 300;
const LAND_DURATION_MS = 180;
const JUMP_HEIGHT_PX = 30;
const FALL_DURATION_MS = 600;
const FALL_DRIFT_PX = 20;
const FALL_DAMAGE = 10;

export type JumpPhase = 'idle' | 'takeoff' | 'flight' | 'landing' | 'falling';

export type StartJumpProps = {
  readonly entity: Entity;
  readonly landCol: number;
  readonly landRow: number;
  readonly dx: number;
  readonly dy: number;
  readonly isFallJump: boolean;
  readonly isPlatformJump: boolean;
  readonly isWaterJump: boolean;
  readonly isWaterEntry: boolean;
};

export class JumpAnimator {
  phase: JumpPhase = 'idle';
  private phaseTimer = 0;
  private startX = 0;
  private startY = 0;
  private targetX = 0;
  private targetY = 0;
  private jumpDir: Direction = Direction.Down;
  private isFallJump = false;
  private isPlatformJump = false;
  private isWaterEntry = false;
  private isWaterJump = false;
  private originalScale = 1;
  private safeX = 0;
  private safeY = 0;

  private onJumpStart?: (info: JumpStartInfo) => void;

  constructor(private readonly grid: GridReader) {}

  setOnJumpStart(callback: ((info: JumpStartInfo) => void) | undefined): void {
    this.onJumpStart = callback;
  }

  updateSafePosition(entity: Entity): void {
    const transform = entity.get(TransformComponent);
    const gridPos = entity.get(GridPositionComponent);
    if (!transform || !gridPos) return;
    const cell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
    if (cell && !cell.properties.has('void')) {
      this.safeX = transform.x;
      this.safeY = transform.y;
    }
  }

  startJump(props: StartJumpProps): void {
    const { entity, landCol, landRow, dx, dy, isFallJump, isPlatformJump, isWaterJump, isWaterEntry } = props;
    this.isFallJump = isFallJump;
    this.isPlatformJump = isPlatformJump;
    this.isWaterJump = isWaterJump;
    this.isWaterEntry = isWaterEntry;
    this.jumpDir = dirFromDelta(dx, dy);
    this.phase = 'takeoff';
    this.phaseTimer = 0;

    const transform = entity.require(TransformComponent);
    this.startX = transform.x;
    this.startY = transform.y;
    this.originalScale = transform.scale;

    const landWorld = this.grid.cellToWorld(landCol, landRow);
    this.targetX = dx === 0 ? transform.x : landWorld.x + this.grid.cellSize / 2;
    this.targetY = dy === 0 ? transform.y : landWorld.y + this.grid.cellSize / 2;

    if (this.isWaterJump && !this.isWaterEntry) {
      this.targetX = landWorld.x + this.grid.cellSize / 2;
      this.targetY = landWorld.y + this.grid.cellSize / 2;
    }

    if (this.isPlatformJump) {
      const PLATFORM_JUMP_OFFSET_PX = 20;
      const landCell = this.grid.getCell(landCol, landRow);
      const gridPos = entity.get(GridPositionComponent);
      const isDropping = landCell && gridPos && landCell.layer < gridPos.currentLayer;
      if (dx !== 0 && dy === 0 && isDropping) {
        this.targetY += PLATFORM_JUMP_OFFSET_PX * 2;
      } else if (dy !== 0) {
        this.targetY -= PLATFORM_JUMP_OFFSET_PX;
      }
    }

    entity.get(InputComponent)?.setEnabled(false);
    const walk = entity.get(WalkComponent);
    if (walk) { walk.setEnabled(false); walk.resetVelocity(true, true); }
    const collision = entity.get(CollisionComponent);
    if (collision) collision.enabled = false;
    const gridCollision = entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    const totalDurationMs = (this.isFallJump ? FALL_DURATION_MS : LAND_DURATION_MS) + TAKEOFF_DURATION_MS + FLIGHT_DURATION_MS;
    const flightDurationMs = TAKEOFF_DURATION_MS + FLIGHT_DURATION_MS;
    this.onJumpStart?.({ targetX: this.targetX, targetY: this.targetY, landCol, landRow, totalDurationMs, flightDurationMs, isFallJump: this.isFallJump });

    const hasJumpAnim = this.playAnim(entity, `jump_takeoff_${this.jumpDir}`);
    if (!hasJumpAnim) {
      this.phase = 'flight';
      this.phaseTimer = 0;
    }
  }

  update(entity: Entity, delta: number): void {
    this.phaseTimer += delta;

    if (this.phase === 'takeoff') {
      this.playAnim(entity, `jump_takeoff_${this.jumpDir}`);
      if (this.phaseTimer >= TAKEOFF_DURATION_MS) {
        this.phase = 'flight';
        this.phaseTimer = 0;
        this.playAnim(entity, `jump_flight_${this.jumpDir}`);
      }
    } else if (this.phase === 'flight') {
      this.updateFlight(entity);
    } else if (this.phase === 'landing') {
      this.playAnim(entity, `jump_land_${this.jumpDir}`);
      if (this.phaseTimer >= LAND_DURATION_MS) {
        this.finishJump(entity);
      }
    } else if (this.phase === 'falling') {
      this.updateFalling(entity);
    }
  }

  private updateFlight(entity: Entity): void {
    const progress = Math.min(1, this.phaseTimer / FLIGHT_DURATION_MS);

    const transform = entity.require(TransformComponent);
    transform.x = this.startX + (this.targetX - this.startX) * progress;
    transform.y = this.startY + (this.targetY - this.startY) * progress;

    const sprite = entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = Math.sin(progress * Math.PI) * -JUMP_HEIGHT_PX;
    }

    this.playAnim(entity, `jump_flight_${this.jumpDir}`);

    if (progress >= 1) {
      if (this.isFallJump) {
        this.phase = 'falling';
        this.phaseTimer = 0;
        if (sprite) sprite.visualOffsetYPx = 0;
        this.startX = transform.x;
        this.startY = transform.y;
        const shadow = entity.get(ShadowComponent);
        if (shadow) shadow.shadow.setVisible(false);
        this.playAnim(entity, `fall_${Direction.Down}`);
        return;
      }

      const hasLandAnim = !this.isWaterEntry && this.playAnim(entity, `jump_land_${this.jumpDir}`);
      if (hasLandAnim) {
        this.phase = 'landing';
        this.phaseTimer = 0;
        if (sprite) sprite.visualOffsetYPx = 0;
      } else {
        if (sprite) sprite.visualOffsetYPx = 0;
        this.finishJump(entity);
      }
    }
  }

  private updateFalling(entity: Entity): void {
    const progress = Math.min(1, this.phaseTimer / FALL_DURATION_MS);

    const transform = entity.require(TransformComponent);
    transform.y = this.startY + progress * FALL_DRIFT_PX;
    const shrink = 1 - progress;
    transform.scale = this.originalScale * shrink;

    const shadow = entity.get(ShadowComponent);
    if (shadow) {
      shadow.shadow.setVisible(false);
      shadow.shadow.setScale(shadow.props.scale * shrink);
    }

    if (progress >= 1) {
      this.finishFall(entity);
    }
  }

  private finishFall(entity: Entity): void {
    const transform = entity.require(TransformComponent);

    transform.scale = this.originalScale;
    transform.x = this.safeX;
    transform.y = this.safeY;

    const shadow = entity.get(ShadowComponent);
    if (shadow) {
      shadow.shadow.setVisible(true);
      shadow.shadow.setScale(shadow.props.scale);
    }

    const health = entity.get(HealthComponent);
    if (health) health.takeDamage(FALL_DAMAGE);

    const sprite = entity.get(SpriteComponent);
    if (sprite) sprite.visualOffsetYPx = 0;

    this.phase = 'idle';

    const gridPos = entity.get(GridPositionComponent);
    if (gridPos) {
      gridPos.currentCell = this.grid.worldToCell(transform.x, transform.y);
    }

    this.reEnableSystems(entity, transform);
    this.playAnim(entity, `idle_${this.jumpDir}`);
  }

  private finishJump(entity: Entity): void {
    this.phase = 'idle';

    const transform = entity.require(TransformComponent);

    const gridPos = entity.get(GridPositionComponent);
    if (gridPos) {
      const cx = transform.x + gridPos.collisionBox.offsetX;
      const cy = transform.y + gridPos.collisionBox.offsetY;
      gridPos.currentCell = this.grid.worldToCell(cx, cy);
      const landCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      if (landCell) {
        gridPos.currentLayer = landCell.layer;
        this.nudgeAwayFromHigherLayers(transform, gridPos, landCell.layer);
      }
    }

    this.reEnableSystems(entity, transform);
    const landAnimPrefix = this.isWaterEntry ? 'swim' : 'idle';
    this.isWaterEntry = false;
    this.playAnim(entity, `${landAnimPrefix}_${this.jumpDir}`);
  }

  private nudgeAwayFromHigherLayers(transform: TransformComponent, gridPos: GridPositionComponent, landLayer: number): void {
    const box = gridPos.collisionBox;
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    const cx = transform.x + box.offsetX;
    const cy = transform.y + box.offsetY;

    const leftCell = this.grid.worldToCell(cx - halfW, cy);
    const rightCell = this.grid.worldToCell(cx + halfW, cy);
    const topCell = this.grid.worldToCell(cx, cy - halfH);
    const bottomCell = this.grid.worldToCell(cx, cy + halfH);

    const leftData = this.grid.getCell(leftCell.col, leftCell.row);
    const rightData = this.grid.getCell(rightCell.col, rightCell.row);
    const topData = this.grid.getCell(topCell.col, topCell.row);
    const bottomData = this.grid.getCell(bottomCell.col, bottomCell.row);

    const NUDGE_PX = 2;

    if (leftData && this.grid.getLayer(leftData) > landLayer && !this.grid.isTransition(leftData)) {
      const cellRight = (leftCell.col + 1) * this.grid.cellSize;
      transform.x = cellRight - box.offsetX + halfW + NUDGE_PX;
    }
    if (rightData && this.grid.getLayer(rightData) > landLayer && !this.grid.isTransition(rightData)) {
      const cellLeft = rightCell.col * this.grid.cellSize;
      transform.x = cellLeft - box.offsetX - halfW - NUDGE_PX;
    }
    if (topData && this.grid.getLayer(topData) > landLayer && !this.grid.isTransition(topData)) {
      const cellBottom = (topCell.row + 1) * this.grid.cellSize;
      transform.y = cellBottom - box.offsetY + halfH + NUDGE_PX;
    }
    if (bottomData && this.grid.getLayer(bottomData) > landLayer && !this.grid.isTransition(bottomData)) {
      const cellTop = bottomCell.row * this.grid.cellSize;
      transform.y = cellTop - box.offsetY - halfH - NUDGE_PX;
    }
  }

  private reEnableSystems(entity: Entity, transform: TransformComponent): void {
    entity.get(InputComponent)?.setEnabled(true);
    entity.get(WalkComponent)?.setEnabled(true);
    const collision = entity.get(CollisionComponent);
    if (collision) collision.enabled = true;
    const gridCollision = entity.get(GridCollisionComponent);
    if (gridCollision) {
      gridCollision.enabled = true;
      gridCollision.syncPreviousPosition(transform.x, transform.y);
    }
  }

  private playAnim(entity: Entity, key: string): boolean {
    const anim = entity.get(AnimationComponent);
    if (!anim) return false;
    if (!anim.animationSystem.hasAnimation(key)) return false;
    if (anim.animationSystem.getCurrentKey() !== key) {
      anim.animationSystem.play(key);
    }
    return true;
  }
}
