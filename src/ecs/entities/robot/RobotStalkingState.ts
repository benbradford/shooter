import type { IState } from '../../../ecs/systems/state/IState';
import type { Entity } from '../../Entity';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import { TransformComponent } from '../../components/core/TransformComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { PatrolComponent } from '../../components/ai/PatrolComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { Pathfinder } from '../../../ecs/systems/Pathfinder';
import type { Grid } from '../../../ecs/systems/Grid';

// Stalking state configuration
const ATTACK_RANGE_PX = 500;
const MIN_DISTANCE_PX = 150;
const STALKING_SPEED_MULTIPLIER = 1.5;
const ANIMATION_SPEED_MS = 100;
const PATH_RECALC_INTERVAL_MS = 500;

export class RobotStalkingState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private readonly grid: Grid;
  private readonly pathfinder: Pathfinder;
  private readonly fireballDelayTime: number;
  private stalkingTime: number = 0;
  private currentDirection: Direction = Direction.Down;
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private path: Array<{ col: number; row: number }> | null = null;
  private pathRecalcTimer: number = 0;
  private currentPathIndex: number = 0;

  constructor(entity: Entity, playerEntity: Entity, grid: Grid, fireballDelayTime: number) {
    this.entity = entity;
    this.playerEntity = playerEntity;
    this.grid = grid;
    this.pathfinder = new Pathfinder(grid);
    this.fireballDelayTime = fireballDelayTime;
  }

  onEnter(): void {
    this.stalkingTime = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.path = null;
    this.pathRecalcTimer = 0;
    this.currentPathIndex = 0;
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    this.stalkingTime += delta;
    this.animationTimer += delta;
    this.pathRecalcTimer += delta;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const stateMachine = this.entity.require(StateMachineComponent);
    const sprite = this.entity.require(SpriteComponent);
    const patrol = this.entity.require(PatrolComponent);
    const gridPos = this.entity.require(GridPositionComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    if (distance < MIN_DISTANCE_PX) {
      stateMachine.stateMachine.enter('retreat');
      return;
    }

    if (this.shouldAttack(distance)) {
      stateMachine.stateMachine.enter('fireball');
      return;
    }

    this.updatePath(transform, playerTransform, gridPos);
    this.moveAlongPath(transform, patrol, delta);
    this.updateAnimation(sprite);
  }

  private shouldAttack(distance: number): boolean {
    return distance <= ATTACK_RANGE_PX && this.stalkingTime >= this.fireballDelayTime;
  }

  private updatePath(transform: TransformComponent, playerTransform: TransformComponent, gridPos: GridPositionComponent): void {
    if (this.pathRecalcTimer >= PATH_RECALC_INTERVAL_MS || this.path === null) {
      this.pathRecalcTimer = 0;
      const robotCell = this.grid.worldToCell(transform.x, transform.y);
      const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);

      this.path = this.pathfinder.findPath(
        robotCell.col,
        robotCell.row,
        playerCell.col,
        playerCell.row,
        gridPos.currentLayer,
        false,
        true
      );
      
      this.currentPathIndex = 0;
    }
  }

  private moveAlongPath(transform: TransformComponent, patrol: PatrolComponent, delta: number): void {
    if (this.path && this.path.length > 1) {
      this.followPath(transform, patrol, delta);
    } else {
      this.moveDirectly(transform, patrol, delta);
    }
  }

  private followPath(transform: TransformComponent, patrol: PatrolComponent, delta: number): void {
    if (this.currentPathIndex === 0) {
      this.currentPathIndex = 1;
    }

    if (!this.path) return;

    const targetNode = this.path[this.currentPathIndex];
    const targetWorld = this.grid.cellToWorld(targetNode.col, targetNode.row);
    const targetX = targetWorld.x + this.grid.cellSize / 2;
    const targetY = targetWorld.y + this.grid.cellSize / 2;

    const dirX = targetX - transform.x;
    const dirY = targetY - transform.y;
    const distToTarget = Math.hypot(dirX, dirY);

    if (distToTarget < 10) {
      this.currentPathIndex++;
      if (this.currentPathIndex >= this.path.length) {
        this.path = null;
      }
    } else {
      const normalizedDirX = dirX / distToTarget;
      const normalizedDirY = dirY / distToTarget;
      const moveSpeed = patrol.speed * STALKING_SPEED_MULTIPLIER * (delta / 1000);

      transform.x += normalizedDirX * moveSpeed;
      transform.y += normalizedDirY * moveSpeed;

      this.currentDirection = dirFromDelta(normalizedDirX, normalizedDirY);
    }
  }

  private moveDirectly(transform: TransformComponent, patrol: PatrolComponent, delta: number): void {
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (!playerTransform) return;
    
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    const dirX = dx / distance;
    const dirY = dy / distance;
    const moveSpeed = patrol.speed * STALKING_SPEED_MULTIPLIER * (delta / 1000);

    transform.x += dirX * moveSpeed;
    transform.y += dirY * moveSpeed;

    this.currentDirection = dirFromDelta(dirX, dirY);
  }

  private updateAnimation(sprite: SpriteComponent): void {
    if (this.animationTimer >= ANIMATION_SPEED_MS) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 8;
    }

    const frameIndex = this.getWalkFrameForDirection(this.currentDirection, this.animationFrame);
    sprite.sprite.setFrame(frameIndex);
  }

  private getWalkFrameForDirection(direction: Direction, frame: number): number {
    // Walk animation starts at frame 8
    // 8 directions × 8 frames = 64 frames
    const directionMap: Record<Direction, number> = {
      [Direction.None]: 0,
      [Direction.Down]: 0,
      [Direction.Up]: 1,
      [Direction.Left]: 2,
      [Direction.Right]: 3,
      [Direction.UpLeft]: 4,
      [Direction.UpRight]: 5,
      [Direction.DownLeft]: 6,
      [Direction.DownRight]: 7,
    };
    const dirIndex = directionMap[direction] || 0;
    return 8 + (dirIndex * 8) + frame;
  }
}
