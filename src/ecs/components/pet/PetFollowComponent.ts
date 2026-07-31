import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader, CellCoord } from '../../../systems/grid/Grid';
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
import { ComponentStateMachine } from '../../../systems/state/ComponentStateMachine';
import { PetSyncJumpBehavior } from './PetSyncJumpBehavior';
import { PlayerProximityChecker } from '../../systems/movement/PlayerProximityChecker';

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

  private readonly sm: ComponentStateMachine<PetState>;
  private isHidden = false;
  private isBarking = false;
  private wasInWater = false;

  private readonly pathFollower: PathFollower;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  private hasRunAnim = false;

  private wanderTargetX = 0;
  private wanderTargetY = 0;
  private wanderTimerMs = 0;
  private wanderDurationMs = 0;
  private currentSpeedPxPerSec = 0;

  private syncJumpBehavior!: PetSyncJumpBehavior;
  private readonly pathfinder: Pathfinder;
  private readonly _tmpCell: CellCoord = { col: 0, row: 0 };
  private readonly proximityChecker = new PlayerProximityChecker({
    teleportPx: TELEPORT_DISTANCE_PX,
    followPx: START_FOLLOW_DISTANCE_PX,
    stopPx: STOP_DISTANCE_PX,
  });

  constructor(
    private readonly grid: GridReader,
    private readonly playerEntity: Entity,
    private readonly directionCount: 4 | 8 = 8
  ) {
    this.pathFollower = new PathFollower(grid.cellSize, 32);
    this.pathfinder = new Pathfinder(grid, grid.getBlockedAreaCells());
    this.sm = new ComponentStateMachine<PetState>('idle', {
      idle: { update: (delta) => this.updateIdle(delta) },
      following: { update: (delta) => this.updateFollowing(delta) },
      wandering_move: { update: (delta) => this.updateWanderingMove(delta) },
      wandering_pause: { update: (delta) => this.updateWanderingPause(delta) },
      riding: { update: (delta) => this.updateRiding(delta) },
      sync_jumping: { update: (delta) => this.updateSyncJump(delta) },
      sync_falling: { update: (delta) => this.updateSyncFall(delta) },
    });
  }

  update(delta: number): void {
    // Check if player is in water or jumping in/out
    const water = this.playerEntity.get(WaterEffectComponent);

    if (water) {
      const isInWater = water.getIsInWater();
      const isHopping = water.isHopping();

      // Player just entered water → start riding
      if (isInWater && this.sm.state !== 'riding') {
        this.sm.transition('riding');
        this.wasInWater = true;
        this.pathFollower.clear();
        const sprite = this.entity.get(SpriteComponent);
        if (sprite) {
          sprite.sprite.setAlpha(1);
          sprite.visualOffsetYPx = 0;
        }
        const gridCollision = this.entity.get(GridCollisionComponent);
        if (gridCollision) gridCollision.enabled = false;
        const playerWalk = this.playerEntity.get(WalkComponent);
        if (playerWalk && playerWalk.lastDir !== Direction.None) {
          this.currentDirection = playerWalk.lastDir;
        }
      }

      // Player exited water and hop is complete → resume following
      if (this.sm.state === 'riding' && !isInWater && !isHopping && this.wasInWater) {
        this.wasInWater = false;
        this.sm.transition('idle');
        const gridCollision = this.entity.get(GridCollisionComponent);
        if (gridCollision) {
          gridCollision.enabled = true;
          const transform = this.entity.require(TransformComponent);
          gridCollision.syncPreviousPosition(transform.x, transform.y);
        }
        const sprite = this.entity.get(SpriteComponent);
        if (sprite) {
          sprite.sprite.setDepth(Depth.pet);
          sprite.sprite.setAngle(0);
        }
      }
    }

    this.sm.update(delta);
  }

  private updateIdle(_delta: number): void {
    if (this.isHidden || this.isBarking) return;
    this.syncPetLayer();

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    const petCell = this.grid.worldToCellInto(transform.x, transform.y, this._tmpCell);
    const petCellData = this.grid.getCell(petCell.col, petCell.row);
    if (petCellData?.properties.has('void')) {
      const feetCell = getPlayerFeetCell(this.playerEntity, this.grid);
      const feetWorld = this.grid.cellToWorld(feetCell.col, feetCell.row);
      transform.x = feetWorld.x + this.grid.cellSize / 2;
      transform.y = feetWorld.y + this.grid.cellSize / 2;
      this.sm.transition('idle');
      this.pathFollower.clear();
      return;
    }

    const prox = this.proximityChecker.check(transform.x, transform.y, playerTransform.x, playerTransform.y);

    if (prox.shouldTeleport) {
      this.teleportToPlayer(transform, playerTransform);
      return;
    }

    if (prox.shouldFollow) {
      this.sm.transition('following');
      const newDir = dirFromDelta(prox.dx, prox.dy);
      if (newDir !== Direction.None) {
        this.currentDirection = newDir;
        this.entity.require(AnimationComponent).animationSystem.playIfChanged(`${this.getMoveAnimPrefix()}_${this.currentDirection}`);
      }
    } else {
      this.startWanderMove(this.entity.require(AnimationComponent), playerTransform);
    }
  }

  private updateFollowing(delta: number): void {
    if (this.isHidden || this.isBarking) return;
    this.syncPetLayer();

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const anim = this.entity.require(AnimationComponent);
    const prox = this.proximityChecker.check(transform.x, transform.y, playerTransform.x, playerTransform.y);

    if (prox.shouldTeleport) {
      this.teleportToPlayer(transform, playerTransform);
      return;
    }

    // Close enough → start wandering
    if (prox.shouldStop) {
      this.startWanderMove(anim, playerTransform);
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
  }

  private updateWanderingPause(delta: number): void {
    if (this.isHidden || this.isBarking) return;
    this.syncPetLayer();

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const prox = this.proximityChecker.check(transform.x, transform.y, playerTransform.x, playerTransform.y);

    if (prox.shouldTeleport) {
      this.teleportToPlayer(transform, playerTransform);
      return;
    }

    if (prox.shouldFollow) {
      this.sm.transition('following');
      return;
    }
    this.wanderTimerMs += delta;
    if (this.wanderTimerMs >= this.wanderDurationMs) {
      this.startWanderMove(this.entity.require(AnimationComponent), playerTransform);
    }
  }

  private updateWanderingMove(delta: number): void {
    if (this.isHidden || this.isBarking) return;
    this.syncPetLayer();

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const prox = this.proximityChecker.check(transform.x, transform.y, playerTransform.x, playerTransform.y);

    if (prox.shouldTeleport) {
      this.teleportToPlayer(transform, playerTransform);
      return;
    }

    if (prox.shouldFollow) {
      this.sm.transition('following');
      return;
    }
    this.wanderTimerMs += delta;
    const distToTarget = Math.hypot(this.wanderTargetX - transform.x, this.wanderTargetY - transform.y);
    if (this.wanderTimerMs >= this.wanderDurationMs || distToTarget < 4) {
      this.startWanderPause(this.entity.require(AnimationComponent), playerTransform);
      return;
    }
    this.moveToward(transform, this.wanderTargetX, this.wanderTargetY, delta, this.entity.require(AnimationComponent), WANDER_SPEED_PX_PER_SEC);
  }

  private syncPetLayer(): void {
    // No-op: layer is determined by GridCollisionComponent from the actual
    // cell the pet occupies. Syncing from the player caused collision failures
    // when the player's layer was stale after platform jumps.
  }

  private teleportToPlayer(transform: TransformComponent, playerTransform: TransformComponent): void {
    transform.x = playerTransform.x;
    transform.y = playerTransform.y;
    this.sm.transition('idle');
    this.pathFollower.clear();
    const anim = this.entity.require(AnimationComponent);
    anim.animationSystem.playIfChanged(`idle_${this.currentDirection}`);
  }

  private updateRiding(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const anim = this.entity.require(AnimationComponent);
    const sprite = this.entity.get(SpriteComponent);
    const playerWalk = this.playerEntity.get(WalkComponent);

    // Sync direction from player BEFORE calculating offset
    if (playerWalk) {
      const dir = playerWalk.lastDir;
      if (dir !== Direction.None) {
        this.currentDirection = dir;
      }
    }

    // Stick to player with per-direction offset
    const offset = RIDE_OFFSETS[this.currentDirection] ?? RIDE_OFFSETS[Direction.Down];
    transform.x = playerTransform.x + offset.x;
    transform.y = playerTransform.y + offset.y;
    if (sprite) sprite.sprite.setAngle(offset.deg);

    // Play animation and set depth
    if (playerWalk) {
      let animDir = this.currentDirection;
      if (this.directionCount === 4) {
        if (animDir === Direction.UpLeft || animDir === Direction.UpRight) animDir = Direction.Up;
        else if (animDir === Direction.DownLeft || animDir === Direction.DownRight) animDir = Direction.Down;
      }
      anim.animationSystem.playIfChanged(`idle_${animDir}`);

      if (sprite) {
        const isFacingDown = this.currentDirection === Direction.Down || this.currentDirection === Direction.DownLeft || this.currentDirection === Direction.DownRight;
        sprite.sprite.setDepth(isFacingDown ? Depth.playerSwimming - 1 : Depth.playerSwimming + 1);
      }
    }
  }

  private updateSyncJump(delta: number): void {
    const result = this.syncJumpBehavior.updateJump(delta);
    if (result === 'fall') {
      this.sm.transition('sync_falling');
    } else if (result === 'done') {
      this.finishSyncJump();
    }
  }

  private updateSyncFall(delta: number): void {
    if (this.syncJumpBehavior.updateFall(delta)) {
      this.finishSyncJump();
    }
  }

  private finishSyncJump(): void {
    const transform = this.entity.require(TransformComponent);
    this.syncJumpBehavior.finishJump(transform);

    const cell = this.grid.worldToCellInto(transform.x, transform.y, this._tmpCell);
    const cellData = this.grid.getCell(cell.col, cell.row);
    if (cellData?.properties.has('void')) {
      const feetCell = getPlayerFeetCell(this.playerEntity, this.grid);
      const feetWorld = this.grid.cellToWorld(feetCell.col, feetCell.row);
      transform.x = feetWorld.x + this.grid.cellSize / 2;
      transform.y = feetWorld.y + this.grid.cellSize / 2;
      this.syncJumpBehavior.finishJump(transform);
    }

    this.sm.transition('idle');
  }

  private recalculatePath(): void {
    const transform = this.entity.require(TransformComponent);

    const startCell = this.grid.worldToCellInto(transform.x, transform.y, this._tmpCell);
    const goalCell = getPlayerFeetCell(this.playerEntity, this.grid);

    const petGridPos = this.entity.get(GridPositionComponent);
    const layer = petGridPos?.currentLayer ?? 0;

    const path = this.pathfinder.findPath(
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
      anim.animationSystem.playIfChanged(`${this.getMoveAnimPrefix()}_${this.currentDirection}`);
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
      anim.animationSystem.playIfChanged(`${this.getMoveAnimPrefix()}_${this.currentDirection}`);
    }
  }

  private startWanderPause(anim: AnimationComponent, _playerTransform: TransformComponent): void {
    this.sm.transition('wandering_pause');
    this.wanderTimerMs = 0;
    this.wanderDurationMs = WANDER_PAUSE_MIN_MS + Math.random() * (WANDER_PAUSE_MAX_MS - WANDER_PAUSE_MIN_MS);
    anim.animationSystem.playIfChanged(`idle_${this.currentDirection}`);
  }

  private startWanderMove(anim: AnimationComponent, playerTransform: TransformComponent): void {
    this.sm.transition('wandering_move');
    this.wanderTimerMs = 0;
    this.wanderDurationMs = WANDER_MOVE_MIN_MS + Math.random() * (WANDER_MOVE_MAX_MS - WANDER_MOVE_MIN_MS);
    const angle = Math.random() * Math.PI * 2;
    const targetX = playerTransform.x + Math.cos(angle) * WANDER_RADIUS_PX;
    const targetY = playerTransform.y + Math.sin(angle) * WANDER_RADIUS_PX;
    const targetCellCoord = this.grid.worldToCellInto(targetX, targetY, this._tmpCell);
    const targetCell = this.grid.getCell(targetCellCoord.col, targetCellCoord.row);
    const petGridPos = this.entity.get(GridPositionComponent);
    const petLayer = petGridPos?.currentLayer ?? 0;
    if (targetCell?.properties.has('void') ||
        (targetCell && this.grid.isWall(targetCell)) ||
        this.grid.isPointInBlockedArea(targetX, targetY, petLayer) ||
        (targetCell && targetCell.layer !== petLayer)) {
      this.startWanderPause(anim, playerTransform);
      return;
    }
    this.wanderTargetX = targetX;
    this.wanderTargetY = targetY;
    const transform = this.entity.require(TransformComponent);
    const newDir = dirFromDelta(this.wanderTargetX - transform.x, this.wanderTargetY - transform.y);
    if (newDir !== Direction.None) this.currentDirection = newDir;
    anim.animationSystem.playIfChanged(`walk_${this.currentDirection}`);
  }

  getIsHidden(): boolean {
    return this.isHidden;
  }

  getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  private getMoveAnimPrefix(): string {
    return (this.sm.state === 'following' && this.hasRunAnim) ? 'run' : 'walk';
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

  syncJump(landCol: number, landRow: number, durationMs: number, isFallJump: boolean, flightDurationMs: number, trackEntity?: Entity): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    if (!this.syncJumpBehavior) {
      this.syncJumpBehavior = new PetSyncJumpBehavior(this.entity, this.playerEntity, this.grid);
    }
    this.sm.transition('sync_jumping');
    const dir = this.syncJumpBehavior.startJump(landCol, landRow, durationMs, isFallJump, flightDurationMs, trackEntity);
    this.currentDirection = dir;
    this.pathFollower.clear();
    const anim = this.entity.get(AnimationComponent);
    if (anim) anim.animationSystem.playIfChanged(`idle_${this.currentDirection}`);
  }
}
