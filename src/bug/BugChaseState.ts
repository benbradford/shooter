import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { KnockbackComponent } from '../ecs/components/movement/KnockbackComponent';
import { BugHopComponent } from '../ecs/components/movement/BugHopComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import type { Grid } from '../utils/Grid';
import { Pathfinder } from '../utils/Pathfinder';

const FRAME_DURATION_MS = 125;
const ATTACK_RANGE_PX = 128;
const PATH_RECALC_INTERVAL_MS = 500;

export class BugChaseState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private readonly grid: Grid;
  private readonly speedPxPerSec: number;
  private readonly pathfinder: Pathfinder;
  private animTimer = 0;
  private currentFrame = 0;
  private isMovingToCell = false;
  private targetCellCol = 0;
  private targetCellRow = 0;
  private path: Array<{ col: number; row: number }> | null = null;
  private pathRecalcTimer = 0;
  private currentPathIndex = 0;

  constructor(entity: Entity, playerEntity: Entity, grid: Grid, speedPxPerSec: number) {
    this.entity = entity;
    this.playerEntity = playerEntity;
    this.grid = grid;
    this.speedPxPerSec = speedPxPerSec;
    this.pathfinder = new Pathfinder(grid);
  }

  onEnter(): void {}

  onExit(): void {}

  onUpdate(delta: number): void {
    if (this.shouldSkipUpdate()) return;

    const components = this.getRequiredComponents();
    if (!components) return;

    const { transform, playerTransform, gridPos, sprite } = components;

    if (this.shouldAttack(transform, playerTransform)) return;

    this.updatePath(transform, playerTransform);
    this.updateMovement(delta, transform, gridPos, sprite);
  }

  private shouldSkipUpdate(): boolean {
    const hop = this.entity.get(BugHopComponent);
    if (hop?.isActive()) return true;

    const knockback = this.entity.get(KnockbackComponent);
    return knockback?.isActive ?? false;
  }

  private getRequiredComponents() {
    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const sprite = this.entity.get(SpriteComponent);

    if (!transform || !playerTransform || !gridPos || !sprite) {
      return null;
    }

    return { transform, playerTransform, gridPos, sprite };
  }

  private shouldAttack(transform: TransformComponent, playerTransform: TransformComponent): boolean {
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distanceToPlayer = Math.hypot(dx, dy);

    if (distanceToPlayer <= ATTACK_RANGE_PX) {
      const stateMachine = this.entity.get(StateMachineComponent);
      if (stateMachine) {
        stateMachine.stateMachine.enter('attack');
      }
      return true;
    }
    return false;
  }

  private updatePath(transform: TransformComponent, playerTransform: TransformComponent): void {
    this.pathRecalcTimer += this.pathRecalcTimer;
    if (this.pathRecalcTimer < PATH_RECALC_INTERVAL_MS && this.path !== null) return;

    this.pathRecalcTimer = 0;
    const bugCell = this.grid.worldToCell(transform.x, transform.y);
    const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);

    this.path = this.pathfinder.findPath(
      bugCell.col, bugCell.row,
      playerCell.col, playerCell.row,
      0
    );
    this.currentPathIndex = 0;
  }

  private updateMovement(
    delta: number,
    transform: TransformComponent,
    gridPos: GridPositionComponent,
    sprite: SpriteComponent
  ): void {
    if (!this.isMovingToCell && this.path && this.path.length > 1) {
      this.startMovingToNextNode();
    }

    if (this.isMovingToCell) {
      this.moveTowardsTarget(delta, transform, gridPos, sprite);
    }
  }

  private startMovingToNextNode(): void {
    if (!this.path) return;
    this.currentPathIndex = Math.min(this.currentPathIndex + 1, this.path.length - 1);
    const targetNode = this.path[this.currentPathIndex];
    this.isMovingToCell = true;
    this.targetCellCol = targetNode.col;
    this.targetCellRow = targetNode.row;
  }

  private moveTowardsTarget(
    delta: number,
    transform: TransformComponent,
    gridPos: GridPositionComponent,
    sprite: SpriteComponent
  ): void {
    const targetWorld = this.grid.cellToWorld(this.targetCellCol, this.targetCellRow);
    const targetX = targetWorld.x + this.grid.cellSize / 2;
    const targetY = targetWorld.y + this.grid.cellSize / 2;
    const distance = Math.hypot(targetX - transform.x, targetY - transform.y);

    if (distance > 5) {
      this.moveAndAnimate(delta, transform, sprite, targetX, targetY, distance);
    } else {
      this.arriveAtTarget(transform, gridPos);
    }
  }

  private moveAndAnimate(
    delta: number,
    transform: TransformComponent,
    sprite: SpriteComponent,
    targetX: number,
    targetY: number,
    distance: number
  ): void {
    const moveX = (targetX - transform.x) / distance * this.speedPxPerSec * (delta / 1000);
    const moveY = (targetY - transform.y) / distance * this.speedPxPerSec * (delta / 1000);
    transform.x += moveX;
    transform.y += moveY;

    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const baseFrame = this.getDirectionFrame(dx, dy);

    this.animTimer += delta;
    if (this.animTimer >= FRAME_DURATION_MS) {
      this.animTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 4;
    }
    sprite.sprite.setFrame(baseFrame + this.currentFrame);
  }

  private getDirectionFrame(dx: number, dy: number): number {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 12 : 8;
    }
    return dy > 0 ? 0 : 4;
  }

  private arriveAtTarget(transform: TransformComponent, gridPos: GridPositionComponent): void {
    const targetWorld = this.grid.cellToWorld(this.targetCellCol, this.targetCellRow);
    transform.x = targetWorld.x + this.grid.cellSize / 2;
    transform.y = targetWorld.y + this.grid.cellSize / 2;
    gridPos.currentCell.col = this.targetCellCol;
    gridPos.currentCell.row = this.targetCellRow;
    this.isMovingToCell = false;
  }
}
