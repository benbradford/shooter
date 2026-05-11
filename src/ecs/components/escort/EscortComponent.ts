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
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { EscortPersistence } from './EscortPersistence';
import { EscortPathfinding } from './EscortPathfinding';
import { Direction } from '../../../constants/Direction';
import { PathFollower } from '../../systems/movement/PathFollower';
import { ComponentStateMachine } from '../../../systems/state/ComponentStateMachine';
import { EscortCrouchBehavior } from './EscortCrouchBehavior';

export type EscortState =
  | 'dormant'
  | 'awakening'
  | 'following'
  | 'crouching'
  | 'walking_to_destination'
  | 'completing'
  | 'completed'
  | 'waiting_for_player_move';

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
const STOP_DISTANCE_PX = 64;
const ARRIVAL_THRESHOLD_PX = 8;
const DESTINATION_OFFSET_Y_PX = 16;

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
  private crouchBehavior!: EscortCrouchBehavior;
  private previousActiveState: 'following' | 'walking_to_destination' = 'following';

  private readonly pathFollower: PathFollower;
  private pathfinding!: EscortPathfinding;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  private lastAnimKey = '';

  // (V5 fix): Cross-level spawn tracking
  private readonly playerSpawnCol: number = -1;
  private readonly playerSpawnRow: number = -1;

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

  private ensurePathfinding(): EscortPathfinding {
    if (!this.pathfinding) {
      this.pathfinding = new EscortPathfinding(this.grid, this.entity, this.playerEntity, this.pathFollower);
    }
    return this.pathfinding;
  }

  private updateFollowing(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    this.ensurePathfinding().syncLayerWithPlayer();

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
      this.ensurePathfinding().recalculatePathToPlayer();
      this.pathRecalcTimerMs = 0;
    }

    if (this.pathFollower.hasPath()) {
      this.followPath(delta, transform);
    } else {
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }

  // --- State: Crouching ---

  private ensureCrouchBehavior(): EscortCrouchBehavior {
    if (!this.crouchBehavior) {
      this.crouchBehavior = new EscortCrouchBehavior(
        this.entity, this.entityManager, this.enemyDetectDistancePx, (key) => this.playAnim(key),
      );
    }
    return this.crouchBehavior;
  }

  private checkEnemies(): boolean {
    if (this.escortType !== 'knight') return false;
    const crouch = this.ensureCrouchBehavior();

    if (crouch.areEnemiesNearby()) {
      if (this.sm.state !== 'crouching') {
        this.previousActiveState = this.sm.state as 'following' | 'walking_to_destination';
        this.sm.transition('crouching');
        crouch.startCrouch();
        this.pathFollower.clear();
        return true;
      }
    }
    return false;
  }

  private updateCrouching(delta: number): void {
    const crouch = this.ensureCrouchBehavior();
    const result = crouch.update(delta);
    if (result === 'done') {
      this.sm.transition(this.previousActiveState);
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }

  // --- State: Walking to Destination ---

  private checkDestinationReachable(): boolean {
    if (this.currentLevelName !== this.destinationLevel) return false;

    if (this.ensurePathfinding().checkDestinationReachable(this.destinationCol, this.destinationRow, this.reachDistance)) {
      this.sm.transition('walking_to_destination');
      this.previousActiveState = 'walking_to_destination';
      this.pathRecalcTimerMs = 0;
      this.playAnim(`walk_${this.currentDirection}`);
      return true;
    }

    return false;
  }

  private updateWalkingToDestination(delta: number): void {
    const pf = this.ensurePathfinding();
    pf.syncLayerWithPlayer();

    const dest = pf.getDestinationWorldPos(this.destinationCol, this.destinationRow);
    const { result, direction } = pf.moveDirectlyToward(dest.x, dest.y, this.followSpeed, delta, ARRIVAL_THRESHOLD_PX);

    if (result === 'arrived') {
      const transform = this.entity.require(TransformComponent);
      transform.y -= DESTINATION_OFFSET_Y_PX;
      this.enterCompleting();
      return;
    }

    if (result === 'moving') {
      const gridCollision = this.entity.get(GridCollisionComponent);
      if (gridCollision) gridCollision.enabled = false;
      if (direction !== Direction.None) this.currentDirection = direction;
      this.playAnim(`walk_${this.currentDirection}`);
      return;
    }

    // result === 'use_pathfinding'
    this.pathRecalcTimerMs += delta;
    if (!this.pathFollower.hasPath() || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
      this.recalculatePathToDestination();
      this.pathRecalcTimerMs = 0;
    }

    if (this.pathFollower.hasPath()) {
      this.followPath(delta, this.entity.require(TransformComponent));
    }
  }

  // (F2 fix): Fallback when destination unreachable
  private recalculatePathToDestination(): void {
    const result = this.ensurePathfinding().recalculatePathToDestination(this.destinationCol, this.destinationRow);
    if (result.fallback) {
      this.sm.transition('following');
    }
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

  // --- Path Following ---

  private followPath(delta: number, transform: TransformComponent): void {
    const result = this.pathFollower.follow(transform, this.followSpeed, delta);
    if (result.arrived) return;

    const newDir = result.direction;
    if (newDir !== Direction.None && newDir !== this.currentDirection) {
      this.currentDirection = newDir;
    }
    this.playAnim(`walk_${this.currentDirection}`);
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
