import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventListener } from '../../systems/EventListener';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import type { EntityManager } from '../../EntityManager';
import type { GridReader } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { EscortPersistence } from './EscortPersistence';
import { Pathfinder } from '../../../systems/Pathfinder';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import { PathFollower } from '../../systems/movement/PathFollower';
import { LaserBeamComponent } from '../laser/LaserBeamComponent';
import { ComponentStateMachine } from '../../../systems/state/ComponentStateMachine';

export type EscortState =
  | 'dormant'
  | 'awakening'
  | 'following'
  | 'crouching'
  | 'walking_to_destination'
  | 'completing'
  | 'completed'
  | 'waiting_for_player_move';

type CrouchPhase = 'crouching_down' | 'holding' | 'standing_up';

export type EscortComponentProps = {
  readonly scene: Phaser.Scene;
  readonly grid: GridReader;
  readonly playerEntity: Entity;
  readonly entityManager: EntityManager;
  readonly eventManager: EventManagerSystem;
  readonly escortType: string;
  readonly awakeOnEvent: string;
  readonly destinationLevel: string;
  readonly destinationCol: number;
  readonly destinationRow: number;
  readonly reachDistance: number;
  readonly followSpeed: number;
  readonly followToLevels: string[];
  readonly enemyDetectDistancePx: number;
  readonly initialState: EscortState;
  readonly currentLevelName: string;
  readonly col: number;
  readonly row: number;
  readonly scale?: number;
  readonly shadowScale?: number;
  readonly shadowOffsetX?: number;
  readonly shadowOffsetY?: number;
}

const PATH_RECALC_MS = 500;
const CROUCH_COOLDOWN_MS = 2000;
const STOP_DISTANCE_PX = 64;
const ARRIVAL_THRESHOLD_PX = 8;
const DESTINATION_OFFSET_Y_PX = 16;
const SHIVER_AMPLITUDE_PX = 1.5;
const SHIVER_INTERVAL_MS = 40;

export class EscortComponent implements Component, EventListener {
  entity!: Entity;

  private readonly grid: GridReader;
  private readonly playerEntity: Entity;
  private readonly entityManager: EntityManager;
  private readonly eventManager: EventManagerSystem;
  private readonly escortType: string;
  private readonly awakeOnEvent: string;
  private readonly destinationLevel: string;
  private readonly destinationCol: number;
  private readonly destinationRow: number;
  private readonly reachDistance: number;
  private readonly followSpeed: number;
  private readonly followToLevels: string[];
  private readonly enemyDetectDistancePx: number;
  private readonly currentLevelName: string;
  private readonly escortScale?: number;
  private readonly escortShadowScale?: number;
  private readonly escortShadowOffsetX?: number;
  private readonly escortShadowOffsetY?: number;

  private readonly persistence = new EscortPersistence();
  private readonly sm: ComponentStateMachine<EscortState>;
  private crouchPhase: CrouchPhase = 'holding';
  private crouchCooldownMs = 0;
  private shiverTimerMs = 0;
  private previousActiveState: 'following' | 'walking_to_destination' = 'following';

  private readonly pathFollower: PathFollower;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  private lastAnimKey = '';

  // (V5 fix): Cross-level spawn tracking
  private playerSpawnCol = -1;
  private playerSpawnRow = -1;

  // (V2 fix): Track event registration
  private isEventRegistered = false;

  constructor(props: EscortComponentProps) {
    this.grid = props.grid;
    this.playerEntity = props.playerEntity;
    this.entityManager = props.entityManager;
    this.eventManager = props.eventManager;
    this.escortType = props.escortType;
    this.awakeOnEvent = props.awakeOnEvent;
    this.destinationLevel = props.destinationLevel;
    this.destinationCol = props.destinationCol;
    this.destinationRow = props.destinationRow;
    this.reachDistance = props.reachDistance;
    this.followSpeed = props.followSpeed;
    this.followToLevels = props.followToLevels;
    this.enemyDetectDistancePx = props.enemyDetectDistancePx;
    this.currentLevelName = props.currentLevelName;
    this.escortScale = props.scale;
    this.escortShadowScale = props.shadowScale;
    this.escortShadowOffsetX = props.shadowOffsetX;
    this.escortShadowOffsetY = props.shadowOffsetY;
    this.pathFollower = new PathFollower(this.grid.cellSize, ARRIVAL_THRESHOLD_PX);
    this.sm = new ComponentStateMachine<EscortState>(props.initialState, {
      awakening: { update: () => this.updateAwakening() },
      waiting_for_player_move: { update: () => this.updateWaitingForPlayerMove() },
      following: { update: (delta) => this.updateFollowingState(delta) },
      crouching: { update: (delta) => this.updateCrouching(delta) },
      walking_to_destination: { update: (delta) => this.updateWalkingToDestinationState(delta) },
      completing: { update: () => this.updateCompleting() },
    });

    // (V2 fix): Only register when dormant
    if (props.initialState === 'dormant' && this.awakeOnEvent) {
      this.eventManager.register(this.awakeOnEvent, this);
      this.isEventRegistered = true;
    }

    // (V5 fix): Initialize spawn tracking for cross-level
    if (props.initialState === 'waiting_for_player_move') {
      this.playerSpawnCol = props.col;
      this.playerSpawnRow = props.row;
    }
  }

  // --- Event Listener (Awakening) ---

  onEvent(eventName: string): void {
    if (eventName !== this.awakeOnEvent) return;
    if (this.sm.state !== 'dormant') return;

    // (F3 fix): Deactivate any existing active escort
    const previousEscortId = this.persistence.getCurrentEscortId();
    if (previousEscortId && previousEscortId !== this.entity.id) {
      this.persistence.clearFlags(previousEscortId);
      for (const e of this.entityManager.getAll()) {
        if (e.id === previousEscortId && !e.isDestroyed) {
          const prevComp = e.get(EscortComponent);
          if (prevComp) prevComp.forceCompleted();
        }
      }
    }

    this.sm.transition('awakening');
    this.playAnim('crouch_reverse');

    this.persistence.setCurrentEscortId(this.entity.id);
    this.persistence.persistDefinition(this.entity.id, {
      escortType: this.escortType,
      originLevel: this.currentLevelName,
      destinationLevel: this.destinationLevel,
      destinationCol: this.destinationCol,
      destinationRow: this.destinationRow,
      reachDistance: this.reachDistance,
      followSpeed: this.followSpeed,
      followToLevels: this.followToLevels,
      enemyDetectDistancePx: this.enemyDetectDistancePx,
      scale: this.escortScale,
      shadowScale: this.escortShadowScale,
      shadowOffsetX: this.escortShadowOffsetX,
      shadowOffsetY: this.escortShadowOffsetY,
    });

    // Deregister — one-shot
    this.eventManager.deregister(this.awakeOnEvent, this);
    this.isEventRegistered = false;
  }

  // --- Update ---

  update(delta: number): void {
    this.sm.update(delta);
  }

  // --- State: Awakening ---

  private updateAwakening(): void {
    const anim = this.entity.require(AnimationComponent);
    if (anim.animationSystem.isOnLastFrame('crouch_reverse')) {
      this.sm.transition('following');
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }

  // --- State: Waiting for Player Move (V4, V5) ---

  private updateWaitingForPlayerMove(): void {
    const playerTransform = this.playerEntity.require(TransformComponent);
    const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);

    if (playerCell.col !== this.playerSpawnCol || playerCell.row !== this.playerSpawnRow) {
      const sprite = this.entity.require(SpriteComponent);
      sprite.sprite.setAlpha(1);
      const shadow = this.entity.get(ShadowComponent);
      if (shadow?.shadow) shadow.shadow.setAlpha(1);
      this.sm.transition('following');
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }

  // --- State: Following (wrapper with enemy/destination checks) ---

  private updateFollowingState(delta: number): void {
    if (this.checkEnemies()) return;
    if (this.checkDestinationReachable()) return;
    this.updateFollowing(delta);
  }

  // --- State: Walking to Destination (wrapper with enemy check) ---

  private updateWalkingToDestinationState(delta: number): void {
    if (this.checkEnemies()) return;
    this.updateWalkingToDestination(delta);
  }

  // --- State: Following ---

  private updateFollowing(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    this.syncLayerWithPlayer();

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= STOP_DISTANCE_PX) {
      this.pathFollower.clear();
      this.playAnim(`idle_${this.currentDirection}`);
      return;
    }

    this.pathRecalcTimerMs += delta;
    if (!this.pathFollower.hasPath() || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
      this.recalculatePathToPlayer();
      this.pathRecalcTimerMs = 0;
    }

    if (this.pathFollower.hasPath()) {
      this.followPath(delta, transform);
    } else {
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }

  // --- State: Crouching ---

  private checkEnemies(): boolean {
    if (this.escortType !== 'knight') return false;

    if (this.areEnemiesNearby()) {
      if (this.sm.state !== 'crouching') {
        this.previousActiveState = this.sm.state as 'following' | 'walking_to_destination';
        this.sm.transition('crouching');
        this.crouchPhase = 'crouching_down';
        this.crouchCooldownMs = 0;
        this.playAnim('crouch_forward');
        this.pathFollower.clear();
        return true;
      }
    }
    return false;
  }

  private updateCrouching(delta: number): void {
    const anim = this.entity.require(AnimationComponent);

    if (this.crouchPhase === 'crouching_down') {
      if (anim.animationSystem.isOnLastFrame('crouch_forward')) {
        this.crouchPhase = 'holding';
      }
      return;
    }

    if (this.crouchPhase === 'holding') {
      // Shiver effect
      this.shiverTimerMs += delta;
      if (this.shiverTimerMs >= SHIVER_INTERVAL_MS) {
        this.shiverTimerMs = 0;
        const sprite = this.entity.require(SpriteComponent);
        sprite.sprite.x += (Math.random() - 0.5) * SHIVER_AMPLITUDE_PX * 2;
      }

      if (this.areEnemiesNearby()) {
        this.crouchCooldownMs = 0;
      } else {
        this.crouchCooldownMs += delta;
        if (this.crouchCooldownMs >= CROUCH_COOLDOWN_MS) {
          this.crouchPhase = 'standing_up';
          this.playAnim('crouch_reverse');
        }
      }
      return;
    }

    if (this.crouchPhase === 'standing_up') {
      if (anim.animationSystem.isOnLastFrame('crouch_reverse')) {
        this.sm.transition(this.previousActiveState);
        this.playAnim(`idle_${this.currentDirection}`);
      }
    }
  }

  // --- State: Walking to Destination ---

  private checkDestinationReachable(): boolean {
    if (this.currentLevelName !== this.destinationLevel) return false;

    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());
    const path = pathfinder.findPath(
      startCell.col, startCell.row,
      this.destinationCol, this.destinationRow,
      this.getPlayerLayer(), false, true
    );

    if (path && path.length <= this.reachDistance) {
      this.sm.transition('walking_to_destination');
      this.previousActiveState = 'walking_to_destination';
      this.pathFollower.setPath(path);
      this.pathRecalcTimerMs = 0;
      this.playAnim(`walk_${this.currentDirection}`);
      return true;
    }

    return false;
  }

  private updateWalkingToDestination(delta: number): void {
    this.syncLayerWithPlayer();
    const transform = this.entity.require(TransformComponent);
    const destX = this.destinationCol * this.grid.cellSize + this.grid.cellSize / 2;
    const destY = this.destinationRow * this.grid.cellSize + this.grid.cellSize / 2;
    const distToDest = Math.hypot(destX - transform.x, destY - transform.y);

    if (distToDest < ARRIVAL_THRESHOLD_PX) {
      transform.x = destX;
      transform.y = destY - DESTINATION_OFFSET_Y_PX;
      this.enterCompleting();
      return;
    }

    // If close enough, skip pathfinding and move directly
    if (distToDest < this.grid.cellSize * 1.5) {
      const gridCollision = this.entity.get(GridCollisionComponent);
      if (gridCollision) gridCollision.enabled = false;
      const dx = destX - transform.x;
      const dy = destY - transform.y;
      const moveDist = this.followSpeed * (delta / 1000);
      if (moveDist >= distToDest) {
        transform.x = destX;
        transform.y = destY;
      } else {
        transform.x += (dx / distToDest) * moveDist;
        transform.y += (dy / distToDest) * moveDist;
      }
      const newDir = dirFromDelta(dx, dy);
      if (newDir !== Direction.None) this.currentDirection = newDir;
      this.playAnim(`walk_${this.currentDirection}`);
      return;
    }

    this.pathRecalcTimerMs += delta;
    if (!this.pathFollower.hasPath() || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
      this.recalculatePathToDestination();
      this.pathRecalcTimerMs = 0;
    }

    if (this.pathFollower.hasPath()) {
      this.followPath(delta, transform);
    }
  }

  // (F2 fix): Fallback when destination unreachable
  private recalculatePathToDestination(): void {
    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());

    let path = pathfinder.findPath(
      startCell.col, startCell.row,
      this.destinationCol, this.destinationRow,
      this.getPlayerLayer(), false, true
    );

    if (!path) {
      path = this.findPathToAdjacentCell(pathfinder, startCell);
    }

    if (!path) {
      const destX = this.destinationCol * this.grid.cellSize + this.grid.cellSize / 2;
      const destY = this.destinationRow * this.grid.cellSize + this.grid.cellSize / 2;
      const distToDest = Math.hypot(destX - transform.x, destY - transform.y);
      if (distToDest > this.grid.cellSize * 1.5) {
        this.sm.transition('following');
      }
      return;
    }

    this.pathFollower.setPath(path);
  }

  // --- State: Completing (F1 fix) ---

  private enterCompleting(): void {
    this.sm.transition('completing');
    this.pathFollower.clear();

    // (F1 fix): Set completion flags IMMEDIATELY, before animation
    this.persistence.clearCurrentEscort();
    this.persistence.markCompleted(this.entity.id, this.currentLevelName, this.destinationCol, this.destinationRow);

    // Force animation change (clear dedup guard)
    this.lastAnimKey = '';
    this.playAnim('arms_stretched');
    this.eventManager.raiseEvent(`${this.entity.id}_reached_destination`);
  }

  private updateCompleting(): void {
    const anim = this.entity.require(AnimationComponent);
    if (anim.animationSystem.isOnLastFrame('arms_stretched')) {
      this.sm.transition('completed');
    }
  }

  // --- Pathfinding Helpers ---

  private syncLayerWithPlayer(): void {
    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const escortGridPos = this.entity.get(GridPositionComponent);
    if (playerGridPos && escortGridPos) {
      escortGridPos.currentLayer = playerGridPos.currentLayer;
    }
  }

  private getPlayerLayer(): number {
    return this.playerEntity.get(GridPositionComponent)?.currentLayer ?? 0;
  }

  private recalculatePathToPlayer(): void {
    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const goalCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());
    const path = pathfinder.findPath(startCell.col, startCell.row, goalCell.col, goalCell.row, this.getPlayerLayer(), false, true);
    this.pathFollower.setPath(path);
  }

  private followPath(delta: number, transform: TransformComponent): void {
    const result = this.pathFollower.follow(transform, this.followSpeed, delta);
    if (result.arrived) return;

    const newDir = result.direction;
    if (newDir !== Direction.None && newDir !== this.currentDirection) {
      this.currentDirection = newDir;
    }
    this.playAnim(`walk_${this.currentDirection}`);
  }

  private findPathToAdjacentCell(
    pathfinder: Pathfinder,
    startCell: { col: number; row: number }
  ): Array<{ col: number; row: number }> | null {
    const offsets = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];
    let bestPath: Array<{ col: number; row: number }> | null = null;
    for (const { dc, dr } of offsets) {
      const path = pathfinder.findPath(
        startCell.col, startCell.row,
        this.destinationCol + dc, this.destinationRow + dr,
        this.getPlayerLayer(), false, true
      );
      if (path && (!bestPath || path.length < bestPath.length)) {
        bestPath = path;
      }
    }
    return bestPath;
  }

  // --- Enemy Detection ---

  private areEnemiesNearby(): boolean {
    const transform = this.entity.require(TransformComponent);
    for (const enemy of this.entityManager.getAll()) {
      if (enemy.isDestroyed || (!enemy.tags.has('enemy') && !enemy.tags.has('laser'))) continue;
      if (enemy.tags.has('laser')) {
        const laser = enemy.get(LaserBeamComponent);
        if (laser && !laser.isActive()) continue;
      }
      const et = enemy.get(TransformComponent);
      if (!et) continue;
      if (Math.hypot(et.x - transform.x, et.y - transform.y) <= this.enemyDetectDistancePx) {
        return true;
      }
    }
    return false;
  }

  // --- Animation Helper ---

  private playAnim(key: string): void {
    if (key === this.lastAnimKey) return;
    this.lastAnimKey = key;
    this.entity.require(AnimationComponent).animationSystem.play(key);
  }

  // (F3 fix): Allow external force to completed
  forceCompleted(): void {
    this.sm.transition('completed');
  }

  // --- Cleanup (V2 fix) ---

  onDestroy(): void {
    if (this.isEventRegistered) {
      this.eventManager.deregister(this.awakeOnEvent, this);
      this.isEventRegistered = false;
    }
  }
}
