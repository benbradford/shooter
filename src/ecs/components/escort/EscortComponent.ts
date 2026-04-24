import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventListener } from '../../systems/EventListener';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import type { EntityManager } from '../../EntityManager';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { Pathfinder } from '../../../systems/Pathfinder';
import { Direction, dirFromDelta } from '../../../constants/Direction';

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
  readonly grid: Grid;
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
}

const PATH_RECALC_MS = 500;
const TELEPORT_DISTANCE_PX = 800;
const STOP_DISTANCE_PX = 64;
const ARRIVAL_THRESHOLD_PX = 8;

export class EscortComponent implements Component, EventListener {
  entity!: Entity;

  private readonly grid: Grid;
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

  private state: EscortState;
  private crouchPhase: CrouchPhase = 'holding';
  private previousActiveState: 'following' | 'walking_to_destination' = 'following';

  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
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
    this.state = props.initialState;

    // (V2 fix): Only register when dormant
    if (this.state === 'dormant' && this.awakeOnEvent) {
      this.eventManager.register(this.awakeOnEvent, this);
      this.isEventRegistered = true;
    }

    // (V5 fix): Initialize spawn tracking for cross-level
    if (this.state === 'waiting_for_player_move') {
      this.playerSpawnCol = props.col;
      this.playerSpawnRow = props.row;
    }
  }

  // --- Event Listener (Awakening) ---

  onEvent(eventName: string): void {
    if (eventName !== this.awakeOnEvent) return;
    if (this.state !== 'dormant') return;

    // (F3 fix): Deactivate any existing active escort
    const ws = WorldStateManager.getInstance();
    const previousEscortId = ws.getFlag('current_escort');
    if (previousEscortId && previousEscortId !== this.entity.id) {
      this.clearEscortFlags(previousEscortId);
      for (const e of this.entityManager.getAll()) {
        if (e.id === previousEscortId && !e.isDestroyed) {
          const prevComp = e.get(EscortComponent);
          if (prevComp) prevComp.forceCompleted();
        }
      }
    }

    this.state = 'awakening';
    this.playAnim('crouch_reverse');

    ws.setFlag('current_escort', this.entity.id);
    this.persistEscortDefinition();

    // Deregister — one-shot
    this.eventManager.deregister(this.awakeOnEvent, this);
    this.isEventRegistered = false;
  }

  // --- Update ---

  update(delta: number): void {
    switch (this.state) {
      case 'dormant':
      case 'completed':
        return;
      case 'awakening':
        this.updateAwakening();
        return;
      case 'waiting_for_player_move':
        this.updateWaitingForPlayerMove();
        return;
      case 'following':
        if (this.checkEnemies()) return;
        if (this.checkDestinationReachable()) return;
        this.updateFollowing(delta);
        return;
      case 'crouching':
        this.updateCrouching();
        return;
      case 'walking_to_destination':
        if (this.checkEnemies()) return;
        this.updateWalkingToDestination(delta);
        return;
      case 'completing':
        this.updateCompleting();
        return;
    }
  }

  // --- State: Awakening ---

  private updateAwakening(): void {
    const anim = this.entity.require(AnimationComponent);
    if (anim.animationSystem.isOnLastFrame('crouch_reverse')) {
      this.state = 'following';
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
      this.state = 'following';
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }

  // --- State: Following ---

  private updateFollowing(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    // Sync layer with player
    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const escortGridPos = this.entity.get(GridPositionComponent);
    if (playerGridPos && escortGridPos) {
      escortGridPos.currentLayer = playerGridPos.currentLayer;
    }

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const dist = Math.hypot(dx, dy);

    if (dist > TELEPORT_DISTANCE_PX) {
      transform.x = playerTransform.x;
      transform.y = playerTransform.y;
      this.path = null;
      this.playAnim(`idle_${this.currentDirection}`);
      return;
    }

    if (dist <= STOP_DISTANCE_PX) {
      this.path = null;
      this.playAnim(`idle_${this.currentDirection}`);
      return;
    }

    this.pathRecalcTimerMs += delta;
    if (!this.path || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
      this.recalculatePathToPlayer();
      this.pathRecalcTimerMs = 0;
    }

    if (this.path && this.path.length > 0) {
      this.followPath(delta, transform);
    } else {
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }

  // --- State: Crouching ---

  private checkEnemies(): boolean {
    if (this.escortType !== 'knight') return false;

    if (this.areEnemiesNearby()) {
      if (this.state !== 'crouching') {
        this.previousActiveState = this.state as 'following' | 'walking_to_destination';
        this.state = 'crouching';
        this.crouchPhase = 'crouching_down';
        this.playAnim('crouch_forward');
        this.path = null;
        return true;
      }
    }
    return false;
  }

  private updateCrouching(): void {
    const anim = this.entity.require(AnimationComponent);

    if (this.crouchPhase === 'crouching_down') {
      if (anim.animationSystem.isOnLastFrame('crouch_forward')) {
        this.crouchPhase = 'holding';
      }
      return;
    }

    if (this.crouchPhase === 'holding') {
      if (!this.areEnemiesNearby()) {
        this.crouchPhase = 'standing_up';
        this.playAnim('crouch_reverse');
      }
      return;
    }

    if (this.crouchPhase === 'standing_up') {
      if (anim.animationSystem.isOnLastFrame('crouch_reverse')) {
        this.state = this.previousActiveState;
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
      0, false, true
    );

    if (path && path.length <= this.reachDistance) {
      this.state = 'walking_to_destination';
      this.path = path;
      this.currentPathIndex = 1;
      this.pathRecalcTimerMs = 0;
      return true;
    }

    return false;
  }

  private updateWalkingToDestination(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const destX = this.destinationCol * this.grid.cellSize + this.grid.cellSize / 2;
    const destY = this.destinationRow * this.grid.cellSize + this.grid.cellSize / 2;
    const distToDest = Math.hypot(destX - transform.x, destY - transform.y);

    if (distToDest < ARRIVAL_THRESHOLD_PX) {
      transform.x = destX;
      transform.y = destY;
      this.enterCompleting();
      return;
    }

    this.pathRecalcTimerMs += delta;
    if (!this.path || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
      this.recalculatePathToDestination();
      this.pathRecalcTimerMs = 0;
    }

    if (this.path && this.path.length > 0) {
      this.followPath(delta, transform);
    }
  }

  // (F2 fix): Fallback when destination unreachable
  private recalculatePathToDestination(): void {
    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());

    this.path = pathfinder.findPath(
      startCell.col, startCell.row,
      this.destinationCol, this.destinationRow,
      0, false, true
    );

    if (!this.path) {
      // Try adjacent cells
      this.path = this.findPathToAdjacentCell(pathfinder, startCell);
    }

    if (!this.path) {
      // Completely unreachable — revert to following
      this.state = 'following';
      return;
    }

    this.currentPathIndex = 1;
  }

  // --- State: Completing (F1 fix) ---

  private enterCompleting(): void {
    this.state = 'completing';

    // (F1 fix): Set completion flags IMMEDIATELY, before animation
    const ws = WorldStateManager.getInstance();
    ws.setFlag('current_escort', '');
    ws.setFlag(`escort_${this.entity.id}_completed`, 'true');
    ws.setFlag(`escort_${this.entity.id}_completed_level`, this.currentLevelName);
    ws.setFlag(`escort_${this.entity.id}_completed_col`, String(this.destinationCol));
    ws.setFlag(`escort_${this.entity.id}_completed_row`, String(this.destinationRow));

    this.playAnim('arms_stretched');
    this.eventManager.raiseEvent(`${this.entity.id}_reached_destination`);
  }

  private updateCompleting(): void {
    const anim = this.entity.require(AnimationComponent);
    if (anim.animationSystem.isOnLastFrame('arms_stretched')) {
      this.state = 'completed';
    }
  }

  // --- Pathfinding Helpers ---

  private recalculatePathToPlayer(): void {
    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const goalCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());
    this.path = pathfinder.findPath(startCell.col, startCell.row, goalCell.col, goalCell.row, 0, false, true);
    this.currentPathIndex = 1;
  }

  private followPath(delta: number, transform: TransformComponent): void {
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

    if (dist < ARRIVAL_THRESHOLD_PX) {
      this.currentPathIndex++;
      return;
    }

    const moveDist = this.followSpeed * (delta / 1000);
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
        0, false, true
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
      if (enemy.isDestroyed || !enemy.tags.has('enemy')) continue;
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

  // --- World State Persistence ---

  private persistEscortDefinition(): void {
    const ws = WorldStateManager.getInstance();
    const id = this.entity.id;
    ws.setFlag(`escort_${id}_type`, this.escortType);
    ws.setFlag(`escort_${id}_origin_level`, this.currentLevelName);
    ws.setFlag(`escort_${id}_destination_level`, this.destinationLevel);
    ws.setFlag(`escort_${id}_destination_col`, String(this.destinationCol));
    ws.setFlag(`escort_${id}_destination_row`, String(this.destinationRow));
    ws.setFlag(`escort_${id}_reach_distance`, String(this.reachDistance));
    ws.setFlag(`escort_${id}_follow_speed`, String(this.followSpeed));
    ws.setFlag(`escort_${id}_follow_to_levels`, this.followToLevels.join(','));
    ws.setFlag(`escort_${id}_enemy_detect_px`, String(this.enemyDetectDistancePx));
  }

  private clearEscortFlags(escortId: string): void {
    const ws = WorldStateManager.getInstance();
    const keys = [
      'type', 'origin_level', 'destination_level', 'destination_col',
      'destination_row', 'reach_distance', 'follow_speed', 'follow_to_levels', 'enemy_detect_px',
    ];
    for (const k of keys) {
      ws.setFlag(`escort_${escortId}_${k}`, '');
    }
  }

  // (F3 fix): Allow external force to completed
  forceCompleted(): void {
    this.state = 'completed';
  }

  // --- Cleanup (V2 fix) ---

  onDestroy(): void {
    if (this.isEventRegistered) {
      this.eventManager.deregister(this.awakeOnEvent, this);
      this.isEventRegistered = false;
    }
  }
}
