import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { Pathfinder } from '../../../systems/Pathfinder';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import { Depth } from '../../../constants/DepthConstants';
import { getPlayerFeetCell } from '../../../utils/PlayerPositionHelper';

import { WalkComponent } from '../movement/WalkComponent';

const FOLLOW_SPEED_PX_PER_SEC = 300;
const STOP_DISTANCE_PX = 128;
const START_FOLLOW_DISTANCE_PX = 192;
const TELEPORT_DISTANCE_PX = 800;
const ABILITY_DISABLE_DISTANCE_PX = 250;
const PATH_RECALC_MS = 1000;
const WANDER_SPEED_PX_PER_SEC = 60;
const WANDER_RADIUS_PX = 64;
const WANDER_PAUSE_MIN_MS = 800;
const WANDER_PAUSE_MAX_MS = 2000;
const WANDER_MOVE_MIN_MS = 600;
const WANDER_MOVE_MAX_MS = 1500;
const SPEED_TRANSITION_DURATION_MS = 500;
const RIDE_OFFSETS: Record<Direction, { x: number; y: number; deg: number }> = {
  [Direction.None]: { x: 0, y: 0, deg: 0 },
  [Direction.Down]: { x: 0, y: -14, deg: 0 },
  [Direction.Up]: { x: 0, y: 0, deg: 0 },
  [Direction.Left]: { x: 10, y: -4, deg: 30 },
  [Direction.Right]: { x: -12, y: -6, deg: -30 },
  [Direction.UpLeft]: { x: 5, y: 0, deg: 0 },
  [Direction.UpRight]: { x: -4, y: 0, deg: 0 },
  [Direction.DownLeft]: { x: 0, y: -8, deg: 0 },
  [Direction.DownRight]: { x: 0, y: -8, deg: 0 },
};

type PetState = 'idle' | 'following' | 'wandering_move' | 'wandering_pause' | 'riding';

export class PetFollowComponent implements Component {
  entity!: Entity;

  private state: PetState = 'idle';
  private isHidden = false;
  private isBarking = false;
  private wasInWater = false;
  private lastAnimKey = '';

  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  private hasRunAnim = false;

  private wanderTargetX = 0;
  private wanderTargetY = 0;
  private wanderTimerMs = 0;
  private wanderDurationMs = 0;
  private currentSpeedPxPerSec = 0;

  constructor(
    private readonly grid: Grid,
    private readonly playerEntity: Entity,
    private readonly directionCount: 4 | 8 = 8
  ) {}

  update(delta: number): void {
    // Check if player is in water or hopping
    const water = this.playerEntity.get(WaterEffectComponent);

    if (water) {
      const isInWater = water.getIsInWater();
      const isHopping = water.isHopping();

      // Player just entered water or is hopping in → start riding
      if ((isInWater || isHopping) && this.state !== 'riding') {
        this.state = 'riding';
        this.wasInWater = true;
        this.path = null;
        const sprite = this.entity.get(SpriteComponent);
        if (sprite) sprite.sprite.setAlpha(1);
        const gridCollision = this.entity.get(GridCollisionComponent);
        if (gridCollision) gridCollision.enabled = false;
      }

      // Player exited water and hop is complete → resume following
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

    if (this.isHidden || this.isBarking) return;

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
      this.path = null;
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
      if (!this.path || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
        this.recalculatePath();
        this.pathRecalcTimerMs = 0;
      }
      if (this.path && this.path.length > 0) {
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

    // Match player direction (snap to 4-dir if pet only has 4)
    if (playerWalk) {
      let dir = playerWalk.lastDir;
      if (this.directionCount === 4 && dir !== Direction.None) {
        if (dir === Direction.UpLeft || dir === Direction.UpRight) dir = Direction.Up;
        else if (dir === Direction.DownLeft || dir === Direction.DownRight) dir = Direction.Down;
      }
      if (dir !== Direction.None && dir !== this.currentDirection) {
        this.currentDirection = dir;
        this.playAnim(anim, `idle_${this.currentDirection}`);
      }

      // Render behind player when facing down, on top otherwise
      if (sprite) {
        const isFacingDown = dir === Direction.Down || dir === Direction.DownLeft || dir === Direction.DownRight;
        sprite.sprite.setDepth(isFacingDown ? Depth.playerSwimming - 1 : Depth.playerSwimming + 1);
      }
    }
  }

  private recalculatePath(): void {
    const transform = this.entity.require(TransformComponent);

    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const goalCell = getPlayerFeetCell(this.playerEntity, this.grid);

    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());

    this.path = pathfinder.findPath(
      startCell.col, startCell.row,
      goalCell.col, goalCell.row,
      0, false, true
    );
    this.currentPathIndex = 1;
  }

  private followPath(delta: number, transform: TransformComponent, anim: AnimationComponent): void {
    if (!this.path || this.currentPathIndex >= this.path.length) {
      this.path = null;
      return;
    }

    const target = this.path[this.currentPathIndex];
    const targetX = target.col * this.grid.cellSize + this.grid.cellSize / 2;
    const targetY = target.row * this.grid.cellSize + this.grid.cellSize / 2;

    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 32) {
      this.currentPathIndex++;
      return;
    }

    this.moveToward(transform, targetX, targetY, delta, anim, FOLLOW_SPEED_PX_PER_SEC);
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
    this.wanderTargetX = playerTransform.x + Math.cos(angle) * WANDER_RADIUS_PX;
    this.wanderTargetY = playerTransform.y + Math.sin(angle) * WANDER_RADIUS_PX;
    const transform = this.entity.require(TransformComponent);
    const newDir = dirFromDelta(this.wanderTargetX - transform.x, this.wanderTargetY - transform.y);
    if (newDir !== Direction.None) this.currentDirection = newDir;
    this.playAnim(anim, `walk_${this.currentDirection}`);
  }

  getIsTooFar(): boolean {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distancePx = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
    return distancePx > ABILITY_DISABLE_DISTANCE_PX;
  }

  getIsHidden(): boolean {
    return this.isHidden;
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
}
