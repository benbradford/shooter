import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { Pathfinder } from '../../../systems/Pathfinder';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import { PathFollower } from '../../systems/movement/PathFollower';
import { Depth } from '../../../constants/DepthConstants';
import { getPlayerFeetCell } from '../../../utils/PlayerPositionHelper';
import { ShadowComponent } from '../visual/ShadowComponent';

import { WalkComponent } from '../movement/WalkComponent';

const FOLLOW_SPEED_PX_PER_SEC = 300;
const CATCHUP_SPEED_PX_PER_SEC = 500;
const CATCHUP_DISTANCE_PX = 400;
const STOP_DISTANCE_PX = 128;
const START_FOLLOW_DISTANCE_PX = 192;
const TELEPORT_DISTANCE_PX = 800;
const PATH_RECALC_MS = 1000;
const WANDER_SPEED_PX_PER_SEC = 60;
const WANDER_RADIUS_PX = 64;
const WANDER_PAUSE_MIN_MS = 800;
const WANDER_PAUSE_MAX_MS = 2000;
const WANDER_MOVE_MIN_MS = 600;
const WANDER_MOVE_MAX_MS = 1500;
const SPEED_TRANSITION_DURATION_MS = 500;
const SYNC_JUMP_ARC_HEIGHT_PX = 30;
const SYNC_FALL_DURATION_MS = 600;
const SYNC_FALL_FINISH_DELAY_MS = 50;
const SYNC_FALL_DRIFT_PX = 20;
const RIDE_OFFSETS: Record<Direction, { x: number; y: number; deg: number }> = {
  [Direction.None]: { x: 0, y: 0, deg: 0 },
  [Direction.Down]: { x: 0, y: -14, deg: 0 },
  [Direction.Up]: { x: 0, y: 0, deg: 0 },
  [Direction.Left]: { x: 10, y: -4, deg: 30 },
  [Direction.Right]: { x: -12, y: -6, deg: -30 },
  [Direction.UpLeft]: { x: 10, y: 0, deg: -10 },
  [Direction.UpRight]: { x: -10, y: 0, deg: 10 },
  [Direction.DownLeft]: { x: 5, y: -12, deg: 40 },
  [Direction.DownRight]: { x: -5, y: -12, deg: -40 },
};

type PetState = 'idle' | 'following' | 'wandering_move' | 'wandering_pause' | 'riding' | 'sync_jumping' | 'sync_falling';

export class PetFollowComponent implements Component {
  entity!: Entity;

  private state: PetState = 'idle';
  private isHidden = false;
  private isBarking = false;
  private wasInWater = false;
  private lastAnimKey = '';

  private readonly pathFollower: PathFollower;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  private hasRunAnim = false;

  private wanderTargetX = 0;
  private wanderTargetY = 0;
  private wanderTimerMs = 0;
  private wanderDurationMs = 0;
  private currentSpeedPxPerSec = 0;

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
    private readonly grid: GridReader,
    private readonly playerEntity: Entity,
    private readonly directionCount: 4 | 8 = 8
  ) {
    this.pathFollower = new PathFollower(grid.cellSize, 32);
  }

  update(delta: number): void {
    // Check if player is in water or jumping in/out
    const water = this.playerEntity.get(WaterEffectComponent);

    if (water) {
      const isInWater = water.getIsInWater();
      const isHopping = water.isHopping();

      // Player just entered water or is jumping in → start riding
      if ((isInWater || isHopping) && this.state !== 'riding') {
        this.state = 'riding';
        this.wasInWater = true;
        this.pathFollower.clear();
        const sprite = this.entity.get(SpriteComponent);
        if (sprite) sprite.sprite.setAlpha(1);
        const gridCollision = this.entity.get(GridCollisionComponent);
        if (gridCollision) gridCollision.enabled = false;
      }

      // Player exited water and jump is complete → resume following
      if (this.state === 'riding' && !isInWater && !isHopping && this.wasInWater) {
        this.wasInWater = false;
        this.state = 'idle';
        const gridCollision = this.entity.get(GridCollisionComponent);
        if (gridCollision) gridCollision.enabled = true;
        const sprite = this.entity.get(SpriteComponent);
        if (sprite) {
          sprite.sprite.setDepth(Depth.pet);
          sprite.sprite.setAngle(0);
        }
      }
    }

    if (this.state === 'riding') {
      this.updateRiding(delta);
      return;
    }

    if (this.state === 'sync_jumping') {
      this.updateSyncJump(delta);
      return;
    }

    if (this.state === 'sync_falling') {
      this.updateSyncFall(delta);
      return;
    }

    if (this.isHidden || this.isBarking) return;

    // Sync pet layer with player so walls/platforms only block when on higher layer
    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const petGridPos = this.entity.get(GridPositionComponent);
    if (playerGridPos && petGridPos) {
      petGridPos.currentLayer = playerGridPos.currentLayer;
    }

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const anim = this.entity.require(AnimationComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distancePx = Math.hypot(dx, dy);

    if (distancePx > TELEPORT_DISTANCE_PX) {
      transform.x = playerTransform.x;
      transform.y = playerTransform.y;
      this.state = 'idle';
      this.pathFollower.clear();
      this.playAnim(anim, `idle_${this.currentDirection}`);
      return;
    }

    // Too far → follow
    if (distancePx > START_FOLLOW_DISTANCE_PX && this.state !== 'following') {
      this.state = 'following';
      const newDir = dirFromDelta(dx, dy);
      if (newDir !== Direction.None) {
        this.currentDirection = newDir;
        this.playAnim(anim, `${this.getMoveAnimPrefix()}_${this.currentDirection}`);
      }
    }

    if (this.state === 'following') {
      // Close enough → start wandering
      if (distancePx <= STOP_DISTANCE_PX) {
        const playerTransformRef = this.playerEntity.require(TransformComponent);
        this.startWanderMove(anim, playerTransformRef);
        return;
      }

      this.pathRecalcTimerMs += delta;
      if (!this.pathFollower.hasPath() || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
        this.recalculatePath();
        this.pathRecalcTimerMs = 0;
      }
      if (this.pathFollower.hasPath()) {
        this.followPath(delta, transform, anim);
      }
      return;
    }

    if (this.state === 'wandering_pause') {
      // Player moved away → follow
      if (distancePx > START_FOLLOW_DISTANCE_PX) {
        this.state = 'following';
        return;
      }
      this.wanderTimerMs += delta;
      if (this.wanderTimerMs >= this.wanderDurationMs) {
        this.startWanderMove(anim, playerTransform);
      }
      return;
    }

    if (this.state === 'wandering_move') {
      // Player moved away → follow
      if (distancePx > START_FOLLOW_DISTANCE_PX) {
        this.state = 'following';
        return;
      }
      this.wanderTimerMs += delta;
      const distToTarget = Math.hypot(this.wanderTargetX - transform.x, this.wanderTargetY - transform.y);
      if (this.wanderTimerMs >= this.wanderDurationMs || distToTarget < 4) {
        this.startWanderPause(anim, playerTransform);
        return;
      }
      this.moveToward(transform, this.wanderTargetX, this.wanderTargetY, delta, anim, WANDER_SPEED_PX_PER_SEC);
      return;
    }

    // idle state - start wandering if close, follow if far
    if (distancePx > START_FOLLOW_DISTANCE_PX) {
      this.state = 'following';
    } else {
      this.startWanderMove(anim, playerTransform);
    }
  }

  private updateRiding(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const anim = this.entity.require(AnimationComponent);
    const sprite = this.entity.get(SpriteComponent);
    const playerWalk = this.playerEntity.get(WalkComponent);

    // Stick to player with per-direction offset
    const offset = RIDE_OFFSETS[this.currentDirection] ?? RIDE_OFFSETS[Direction.Down];
    transform.x = playerTransform.x + offset.x;
    transform.y = playerTransform.y + offset.y;
    if (sprite) sprite.sprite.setAngle(offset.deg);

    // Match player direction
    if (playerWalk) {
      const dir = playerWalk.lastDir;
      if (dir !== Direction.None) {
        this.currentDirection = dir;

        // Snap to 4-dir for animation only if pet has 4 directions
        let animDir = dir;
        if (this.directionCount === 4) {
          if (dir === Direction.UpLeft || dir === Direction.UpRight) animDir = Direction.Up;
          else if (dir === Direction.DownLeft || dir === Direction.DownRight) animDir = Direction.Down;
        }
        this.playAnim(anim, `idle_${animDir}`);
      }

      // Render behind player when facing down, on top otherwise
      if (sprite) {
        const isFacingDown = this.currentDirection === Direction.Down || this.currentDirection === Direction.DownLeft || this.currentDirection === Direction.DownRight;
        sprite.sprite.setDepth(isFacingDown ? Depth.playerSwimming - 1 : Depth.playerSwimming + 1);
      }
    }
  }

  private updateSyncJump(delta: number): void {
    this.syncJumpTimerMs += delta;
    const progress = Math.min(1, this.syncJumpTimerMs / this.syncJumpDurationMs);

    const transform = this.entity.require(TransformComponent);
    transform.x = this.syncJumpStartX + (this.syncJumpTargetX - this.syncJumpStartX) * progress;
    transform.y = this.syncJumpStartY + (this.syncJumpTargetY - this.syncJumpStartY) * progress;

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = Math.sin(progress * Math.PI) * -SYNC_JUMP_ARC_HEIGHT_PX;
    }

    if (progress >= 1) {
      if (sprite) sprite.visualOffsetYPx = 0;
      if (this.isSyncFallJump) {
        this.state = 'sync_falling';
        this.syncFallTimerMs = 0;
        this.syncFallStartY = transform.y;
        this.originalScale = transform.scale;
        const shadow = this.entity.get(ShadowComponent);
        if (shadow) shadow.shadow.setVisible(false);
        return;
      }
      this.finishSyncJump(transform);
    }
  }

  private updateSyncFall(delta: number): void {
    this.syncFallTimerMs += delta;
    const shrinkProgress = Math.min(1, this.syncFallTimerMs / SYNC_FALL_DURATION_MS);

    const transform = this.entity.require(TransformComponent);

    if (shrinkProgress < 1) {
      transform.y = this.syncFallStartY + shrinkProgress * SYNC_FALL_DRIFT_PX;
      transform.scale = this.originalScale * (1 - shrinkProgress);
      return;
    }

    // Shrink done — hide and wait for player to respawn
    transform.scale = 0;
    if (this.syncFallTimerMs >= SYNC_FALL_DURATION_MS + SYNC_FALL_FINISH_DELAY_MS) {
      transform.scale = this.originalScale;
      const playerFeetCell = getPlayerFeetCell(this.playerEntity, this.grid);
      const cellWorld = this.grid.cellToWorld(playerFeetCell.col, playerFeetCell.row);
      transform.x = cellWorld.x + this.grid.cellSize / 2;
      transform.y = cellWorld.y + this.grid.cellSize / 2;
      const shadow = this.entity.get(ShadowComponent);
      if (shadow) shadow.shadow.setVisible(true);
      this.finishSyncJump(transform);
    }
  }

  private finishSyncJump(transform: TransformComponent): void {
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
    this.state = 'idle';
  }

  private recalculatePath(): void {
    const transform = this.entity.require(TransformComponent);

    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const goalCell = getPlayerFeetCell(this.playerEntity, this.grid);

    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());

    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const layer = playerGridPos?.currentLayer ?? 0;

    const path = pathfinder.findPath(
      startCell.col, startCell.row,
      goalCell.col, goalCell.row,
      layer, false, true
    );
    this.pathFollower.setPath(path);
  }

  private followPath(delta: number, transform: TransformComponent, anim: AnimationComponent): void {
    const playerT = this.playerEntity.require(TransformComponent);
    const distToPlayer = Math.hypot(playerT.x - transform.x, playerT.y - transform.y);
    const t = Math.min(1, Math.max(0, (distToPlayer - START_FOLLOW_DISTANCE_PX) / (CATCHUP_DISTANCE_PX - START_FOLLOW_DISTANCE_PX)));
    const targetSpeed = FOLLOW_SPEED_PX_PER_SEC + t * (CATCHUP_SPEED_PX_PER_SEC - FOLLOW_SPEED_PX_PER_SEC);

    const lerpRate = Math.min(1, delta / SPEED_TRANSITION_DURATION_MS);
    this.currentSpeedPxPerSec += (targetSpeed - this.currentSpeedPxPerSec) * lerpRate;

    const result = this.pathFollower.follow(transform, this.currentSpeedPxPerSec, delta);
    if (result.arrived) return;

    const newDir = result.direction;
    if (newDir !== Direction.None && newDir !== this.currentDirection) {
      this.currentDirection = newDir;
      this.playAnim(anim, `${this.getMoveAnimPrefix()}_${this.currentDirection}`);
    }
  }

  private moveToward(
    transform: TransformComponent,
    targetX: number, targetY: number,
    delta: number, anim: AnimationComponent,
    targetSpeedPxPerSec: number
  ): void {
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) return;

    const lerpRate = Math.min(1, delta / SPEED_TRANSITION_DURATION_MS);
    this.currentSpeedPxPerSec += (targetSpeedPxPerSec - this.currentSpeedPxPerSec) * lerpRate;

    const moveDist = this.currentSpeedPxPerSec * (delta / 1000);

    if (moveDist >= dist) {
      transform.x = targetX;
      transform.y = targetY;
    } else {
      transform.x += (dx / dist) * moveDist;
      transform.y += (dy / dist) * moveDist;
    }

    const newDir = dirFromDelta(dx, dy);
    if (newDir !== Direction.None && newDir !== this.currentDirection) {
      this.currentDirection = newDir;
      this.playAnim(anim, `${this.getMoveAnimPrefix()}_${this.currentDirection}`);
    }
  }

  private startWanderPause(anim: AnimationComponent, _playerTransform: TransformComponent): void {
    this.state = 'wandering_pause';
    this.wanderTimerMs = 0;
    this.wanderDurationMs = WANDER_PAUSE_MIN_MS + Math.random() * (WANDER_PAUSE_MAX_MS - WANDER_PAUSE_MIN_MS);
    this.playAnim(anim, `idle_${this.currentDirection}`);
  }

  private startWanderMove(anim: AnimationComponent, playerTransform: TransformComponent): void {
    this.state = 'wandering_move';
    this.wanderTimerMs = 0;
    this.wanderDurationMs = WANDER_MOVE_MIN_MS + Math.random() * (WANDER_MOVE_MAX_MS - WANDER_MOVE_MIN_MS);
    const angle = Math.random() * Math.PI * 2;
    const targetX = playerTransform.x + Math.cos(angle) * WANDER_RADIUS_PX;
    const targetY = playerTransform.y + Math.sin(angle) * WANDER_RADIUS_PX;
    const targetCell = this.grid.getCell(this.grid.worldToCell(targetX, targetY).col, this.grid.worldToCell(targetX, targetY).row);
    if (targetCell?.properties.has('void')) {
      this.startWanderPause(anim, playerTransform);
      return;
    }
    this.wanderTargetX = targetX;
    this.wanderTargetY = targetY;
    const transform = this.entity.require(TransformComponent);
    const newDir = dirFromDelta(this.wanderTargetX - transform.x, this.wanderTargetY - transform.y);
    if (newDir !== Direction.None) this.currentDirection = newDir;
    this.playAnim(anim, `walk_${this.currentDirection}`);
  }

  getIsHidden(): boolean {
    return this.isHidden;
  }

  getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  private playAnim(anim: AnimationComponent, key: string): void {
    if (key === this.lastAnimKey) return;
    this.lastAnimKey = key;
    anim.animationSystem.play(key);
  }

  private getMoveAnimPrefix(): string {
    return (this.state === 'following' && this.hasRunAnim) ? 'run' : 'walk';
  }

  setHidden(hidden: boolean): void {
    this.isHidden = hidden;
  }

  setBarking(barking: boolean): void {
    this.isBarking = barking;
  }

  setHasRunAnim(has: boolean): void {
    this.hasRunAnim = has;
  }

  getIsBarking(): boolean {
    return this.isBarking;
  }

  syncJump(landCol: number, landRow: number, durationMs: number, isFallJump: boolean, flightDurationMs: number): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;
    this.state = 'sync_jumping';
    this.syncJumpStartX = transform.x;
    this.syncJumpStartY = transform.y;
    const cellWorld = this.grid.cellToWorld(landCol, landRow);
    this.syncJumpTargetX = cellWorld.x + this.grid.cellSize / 2;
    this.syncJumpTargetY = cellWorld.y + this.grid.cellSize / 2;
    this.syncJumpDurationMs = isFallJump ? flightDurationMs : durationMs;
    this.syncJumpTimerMs = 0;
    this.isSyncFallJump = isFallJump;
    this.pathFollower.clear();

    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    const dx = this.syncJumpTargetX - transform.x;
    const dy = this.syncJumpTargetY - transform.y;
    const dir = dirFromDelta(dx, dy);
    if (dir !== Direction.None) this.currentDirection = dir;
    const anim = this.entity.get(AnimationComponent);
    if (anim) this.playAnim(anim, `idle_${this.currentDirection}`);
  }
}
