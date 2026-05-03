import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { InputComponent } from '../input/InputComponent';
import { AttackButtonComponent } from '../input/AttackButtonComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';
import { HealthComponent } from '../core/HealthComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import type HudScene from '../../../scenes/HudScene';

const TAKEOFF_DURATION_MS = 180;
const FLIGHT_DURATION_MS = 300;
const LAND_DURATION_MS = 180;
const JUMP_HEIGHT_PX = 30;
const FALL_DURATION_MS = 600;
const FALL_DRIFT_PX = 20;
const FALL_DAMAGE = 10;

type JumpPhase = 'idle' | 'takeoff' | 'flight' | 'landing' | 'falling';

type PendingJump = {
  landCol: number;
  landRow: number;
  dx: number;
  dy: number;
  isFallJump: boolean;
  isPlatformJump: boolean;
};

export type JumpComponentProps = {
  readonly grid: GridReader;
  readonly scene?: Phaser.Scene;
};

export class JumpComponent implements Component {
  entity!: Entity;
  private readonly grid: GridReader;
  private readonly scene: Phaser.Scene | undefined;
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
  private pendingJump: PendingJump | null = null;
  private isShowingJumpIcon = false;
  private prevTransformX = 0;
  private prevTransformY = 0;

  constructor(props: JumpComponentProps) {
    this.grid = props.grid;
    this.scene = props.scene;
  }

  isJumping(): boolean {
    return this.phase !== 'idle';
  }

  private getAttackButton(): AttackButtonComponent | undefined {
    if (!this.scene) return undefined;
    const hudScene = this.scene.scene.get('HudScene') as HudScene | undefined;
    return hudScene?.getJoystickEntity()?.get(AttackButtonComponent);
  }

  update(delta: number): void {
    if (this.phase !== 'idle') {
      this.updateJump(delta);
      return;
    }

    // Track last safe position (non-void cell)
    this.updateSafePosition();

    // Single detection mechanism: check adjacent cell using active input + proximity
    const newPending = this.detectJumpFromInput();

    // Update icon state
    const attackButton = this.getAttackButton();
    if (newPending) {
      this.pendingJump = newPending;

      if (!this.scene) {
        // No scene = pet/NPC — auto-jump immediately
        this.isFallJump = newPending.isFallJump;
        this.isPlatformJump = newPending.isPlatformJump;
        this.startJump(newPending.landCol, newPending.landRow, newPending.dx, newPending.dy);
        this.pendingJump = null;
        return;
      }

      if (!this.isShowingJumpIcon) {
        attackButton?.setIconOverride('jump');
        this.isShowingJumpIcon = true;
      }
      // Execute jump on button press
      if (attackButton?.isAttackPressed()) {
        this.isFallJump = this.pendingJump.isFallJump;
        this.isPlatformJump = this.pendingJump.isPlatformJump;
        this.startJump(this.pendingJump.landCol, this.pendingJump.landRow, this.pendingJump.dx, this.pendingJump.dy);
        this.pendingJump = null;
        attackButton.setIconOverride(null);
        this.isShowingJumpIcon = false;
      }
    } else {
      this.pendingJump = null;
      if (this.isShowingJumpIcon) {
        attackButton?.setIconOverride(null);
        this.isShowingJumpIcon = false;
      }
    }

    // Track position for pet movement direction detection
    const t = this.entity.get(TransformComponent);
    if (t) {
      this.prevTransformX = t.x;
      this.prevTransformY = t.y;
    }
  }

  private detectJumpFromInput(): PendingJump | null {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return null;

    // Determine movement direction
    let moveX = 0;
    let moveY = 0;
    const walk = this.entity.get(WalkComponent);
    if (walk) {
      // Player: use input direction
      if (this.scene) {
        const input = this.entity.get(InputComponent);
        if (!input?.hasInput()) return null;
      }
      moveX = walk.lastMoveX;
      moveY = walk.lastMoveY;
    } else {
      // Pet: derive direction from transform delta
      moveX = transform.x - this.prevTransformX;
      moveY = transform.y - this.prevTransformY;
    }
    if (moveX === 0 && moveY === 0) return null;

    // Use collision box center (accounts for offsetY on the collision box)
    const gridPos = this.entity.get(GridPositionComponent);
    const offsetX = gridPos?.collisionBox.offsetX ?? 0;
    const offsetY = gridPos?.collisionBox.offsetY ?? 0;
    const cx = transform.x + offsetX;
    const cy = transform.y + offsetY;

    // Use collision box center to determine which cell they're in
    const fromCell = this.grid.worldToCell(cx, cy);
    const fromCellData = this.grid.getCell(fromCell.col, fromCell.row);
    if (!fromCellData) return null;

    // Cardinal direction from input
    let dx = 0;
    let dy = 0;
    if (Math.abs(moveX) > Math.abs(moveY)) {
      dx = moveX > 0 ? 1 : -1;
    } else {
      dy = moveY > 0 ? 1 : -1;
    }

    // Proximity check: player must be near the edge of their cell in the jump direction
    if (this.scene) {
      const cellWorld = this.grid.cellToWorld(fromCell.col, fromCell.row);
      const EDGE_PROXIMITY_PX = 18;
      if (dx > 0 && (cellWorld.x + this.grid.cellSize) - cx > EDGE_PROXIMITY_PX) return null;
      if (dx < 0 && cx - cellWorld.x > EDGE_PROXIMITY_PX) return null;
      if (dy > 0 && (cellWorld.y + this.grid.cellSize) - cy > EDGE_PROXIMITY_PX) return null;
      if (dy < 0 && cy - cellWorld.y > EDGE_PROXIMITY_PX) return null;
    }

    const toCol = fromCell.col + dx;
    const toRow = fromCell.row + dy;
    const toCell = this.grid.getCell(toCol, toRow);
    if (!toCell) return null;

    // Void cell adjacent
    if (toCell.properties.has('void')) {
      return this.resolveVoidJump({ fromCol: fromCell.col, fromRow: fromCell.row, toCol, toRow });
    }

    // Platform edge
    if (fromCellData.properties.has('platform') && !this.grid.isTransition(toCell)) {
      const isWallOrLower = this.grid.isWall(toCell) || this.grid.getLayer(toCell) < this.grid.getLayer(fromCellData);
      if (isWallOrLower) {
        return this.resolvePlatformJump({ fromCol: fromCell.col, fromRow: fromCell.row, toCol, toRow });
      }
    }

    return null;
  }

  private resolveVoidJump(blocked: { fromCol: number; fromRow: number; toCol: number; toRow: number }): PendingJump | null {
    const { fromCol, fromRow, toCol, toRow } = blocked;
    if (fromCol !== toCol && fromRow !== toRow) return null;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const landCol = toCol + dx;
    const landRow = toRow + dy;

    const fromCell = this.grid.getCell(fromCol, fromRow);
    if (!fromCell) return null;

    const landCell = this.grid.getCell(landCol, landRow);
    if (this.isLandingSafe(landCell, fromCell)) {
      return { landCol, landRow, dx, dy, isFallJump: false, isPlatformJump: false };
    }
    // Jump into the void cell itself — will fall (player only, not pets)
    if (!this.scene) return null;
    return { landCol: toCol, landRow: toRow, dx, dy, isFallJump: true, isPlatformJump: false };
  }

  private resolvePlatformJump(blocked: { fromCol: number; fromRow: number; toCol: number; toRow: number }): PendingJump | null {
    const { fromCol, fromRow, toCol, toRow } = blocked;
    if (fromCol !== toCol && fromRow !== toRow) return null;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;

    const fromCell = this.grid.getCell(fromCol, fromRow);
    const toCell = this.grid.getCell(toCol, toRow);
    if (!fromCell || !toCell) return null;

    if (this.grid.isTransition(toCell)) return null;

    let landCol: number;
    let landRow: number;
    if (this.grid.isWall(toCell)) {
      landCol = toCol + dx;
      landRow = toRow + dy;
    } else {
      const farCol = toCol + dx;
      const farRow = toRow + dy;
      const farCell = this.grid.getCell(farCol, farRow);
      if (farCell && farCell.properties.has('platform') && farCell.layer <= fromCell.layer
        && !this.grid.isWall(farCell) && !this.grid.isTransition(farCell)) {
        landCol = farCol;
        landRow = farRow;
      } else {
        landCol = toCol;
        landRow = toRow;
      }
    }

    const landCell = this.grid.getCell(landCol, landRow);
    if (!landCell) return null;
    if (this.grid.isTransition(landCell)) return null;

    for (const occupant of landCell.occupants) {
      if (occupant.get(GridCellBlocker)) return null;
    }

    if (landCell.properties.has('void')) {
      if (!this.scene) return null; // Pets never jump into void
      return { landCol, landRow, dx, dy, isFallJump: true, isPlatformJump: true };
    } else if (this.isValidPlatformLanding(landCell, fromCell)) {
      return { landCol, landRow, dx, dy, isFallJump: false, isPlatformJump: true };
    }
    return null;
  }

  private isLandingSafe(landCell: ReturnType<GridReader['getCell']>, fromCell: NonNullable<ReturnType<GridReader['getCell']>>): boolean {
    return !!landCell
      && landCell.layer === fromCell.layer
      && !landCell.properties.has('void')
      && !landCell.properties.has('wall')
      && !landCell.properties.has('blocked')
      && !(landCell.properties.has('platform') && landCell.layer > fromCell.layer)
      && ![...landCell.occupants].some(o => o.get(GridCellBlocker));
  }

  private isValidPlatformLanding(landCell: NonNullable<ReturnType<GridReader['getCell']>>, _fromCell: NonNullable<ReturnType<GridReader['getCell']>>): boolean {
    if (landCell.properties.has('wall') || landCell.properties.has('blocked')) return false;
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
    this.targetX = dx !== 0 ? landWorld.x + this.grid.cellSize / 2 : transform.x;
    this.targetY = dy !== 0 ? landWorld.y + this.grid.cellSize / 2 : transform.y;

    if (this.isPlatformJump) {
      const PLATFORM_JUMP_OFFSET_PX = 20;
      const landCell = this.grid.getCell(landCol, landRow);
      const gridPos = this.entity.get(GridPositionComponent);
      const isDropping = landCell && gridPos && landCell.layer < gridPos.currentLayer;
      if (dx !== 0 && dy === 0 && isDropping) {
        this.targetY += PLATFORM_JUMP_OFFSET_PX * 2;
      } else if (dy !== 0) {
        this.targetY -= PLATFORM_JUMP_OFFSET_PX;
      }
    }

    this.entity.get(InputComponent)?.setEnabled(false);
    const walk = this.entity.get(WalkComponent);
    if (walk) { walk.setEnabled(false); walk.resetVelocity(true, true); }
    const collision = this.entity.get(CollisionComponent);
    if (collision) collision.enabled = false;
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

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
      // Use collision box center (not transform) to match GridCollisionComponent's layer detection
      const cx = transform.x + gridPos.collisionBox.offsetX;
      const cy = transform.y + gridPos.collisionBox.offsetY;
      gridPos.currentCell = this.grid.worldToCell(cx, cy);
      const landCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      if (landCell) {
        gridPos.currentLayer = landCell.layer;

        // Nudge away from adjacent higher-layer cells to prevent collision box overlap
        this.nudgeAwayFromHigherLayers(transform, gridPos, landCell.layer);
      }
    }

    this.reEnableSystems(transform);
    this.playAnim(`idle_${this.jumpDir}`);
  }

  private nudgeAwayFromHigherLayers(transform: TransformComponent, gridPos: GridPositionComponent, landLayer: number): void {
    const box = gridPos.collisionBox;
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    const cx = transform.x + box.offsetX;
    const cy = transform.y + box.offsetY;

    // Check cells at each edge of the collision box
    const leftCell = this.grid.worldToCell(cx - halfW, cy);
    const rightCell = this.grid.worldToCell(cx + halfW, cy);
    const topCell = this.grid.worldToCell(cx, cy - halfH);
    const bottomCell = this.grid.worldToCell(cx, cy + halfH);

    const leftData = this.grid.getCell(leftCell.col, leftCell.row);
    const rightData = this.grid.getCell(rightCell.col, rightCell.row);
    const topData = this.grid.getCell(topCell.col, topCell.row);
    const bottomData = this.grid.getCell(bottomCell.col, bottomCell.row);

    const NUDGE_PX = 2;

    // Nudge right if left edge overlaps higher layer
    if (leftData && this.grid.getLayer(leftData) > landLayer && !this.grid.isTransition(leftData)) {
      const cellRight = (leftCell.col + 1) * this.grid.cellSize;
      transform.x = cellRight - box.offsetX + halfW + NUDGE_PX;
    }
    // Nudge left if right edge overlaps higher layer
    if (rightData && this.grid.getLayer(rightData) > landLayer && !this.grid.isTransition(rightData)) {
      const cellLeft = rightCell.col * this.grid.cellSize;
      transform.x = cellLeft - box.offsetX - halfW - NUDGE_PX;
    }
    // Nudge down if top edge overlaps higher layer
    if (topData && this.grid.getLayer(topData) > landLayer && !this.grid.isTransition(topData)) {
      const cellBottom = (topCell.row + 1) * this.grid.cellSize;
      transform.y = cellBottom - box.offsetY + halfH + NUDGE_PX;
    }
    // Nudge up if bottom edge overlaps higher layer
    if (bottomData && this.grid.getLayer(bottomData) > landLayer && !this.grid.isTransition(bottomData)) {
      const cellTop = bottomCell.row * this.grid.cellSize;
      transform.y = cellTop - box.offsetY - halfH - NUDGE_PX;
    }
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
