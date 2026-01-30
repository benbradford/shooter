import type { IState } from '../../../utils/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { BugHopComponent } from '../../components/movement/BugHopComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import type { Grid } from '../../../utils/Grid';
import { Pathfinder } from '../../../utils/Pathfinder';

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



  onUpdate(delta: number): void {
    if (this.shouldSkipUpdate()) return;

    const { transform, playerTransform, gridPos, sprite } = this.getRequiredComponents();

    if (this.shouldAttack(transform, playerTransform)) return;

    this.updatePath(delta, transform, playerTransform);
    this.updateMovement(delta, transform, gridPos, sprite);
  }

  private shouldSkipUpdate(): boolean {
    const hop = this.entity.get(BugHopComponent);
    if (hop?.isActive()) return true;
    
    if (hop?.justEnded()) {
      this.path = null;
      this.pathRecalcTimer = PATH_RECALC_INTERVAL_MS;
      this.isMovingToCell = false;
      this.currentPathIndex = 0;
    }

    const knockback = this.entity.get(KnockbackComponent);
    return knockback?.isActive ?? false;
  }

  private getRequiredComponents() {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    const sprite = this.entity.require(SpriteComponent);

    return { transform, playerTransform, gridPos, sprite };
  }

  private shouldAttack(transform: TransformComponent, playerTransform: TransformComponent): boolean {
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distanceToPlayer = Math.hypot(dx, dy);

    if (distanceToPlayer <= ATTACK_RANGE_PX) {
      const gridPos = this.entity.get(GridPositionComponent);
      const playerGridPos = this.playerEntity.get(GridPositionComponent);
      
      if (gridPos && playerGridPos && gridPos.currentLayer !== playerGridPos.currentLayer) {
        return false;
      }
      
      const stateMachine = this.entity.get(StateMachineComponent);
      if (stateMachine) {
        stateMachine.stateMachine.enter('attack');
      }
      return true;
    }
    return false;
  }

  private updatePath(delta: number, transform: TransformComponent, playerTransform: TransformComponent): void {
    this.pathRecalcTimer += delta;
    if (this.pathRecalcTimer < PATH_RECALC_INTERVAL_MS && this.path !== null) return;

    this.pathRecalcTimer = 0;
    const bugCell = this.grid.worldToCell(transform.x, transform.y);
    const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    const gridPos = this.entity.require(GridPositionComponent);

    this.path = this.pathfinder.findPath(
      bugCell.col, bugCell.row,
      playerCell.col, playerCell.row,
      gridPos.currentLayer,
      true
    );
    this.currentPathIndex = 0;
  }

  private updateMovement(
    delta: number,
    transform: TransformComponent,
    gridPos: GridPositionComponent,
    sprite: SpriteComponent
  ): void {
    if (gridPos.currentLayer === 1) {
      const cellBelow = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row + 1);
      if (cellBelow?.layer === 1) {
        const cellTwoBelow = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row + 2);
        if (cellTwoBelow?.layer === 0) {
          const playerTransform = this.playerEntity.get(TransformComponent);
          if (playerTransform && playerTransform.y > transform.y) {
            const hop = this.entity.get(BugHopComponent);
            if (hop && !hop.isActive()) {
              const targetWorld = this.grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row + 2);
              const targetX = targetWorld.x + this.grid.cellSize / 2;
              const targetY = targetWorld.y + this.grid.cellSize / 2;
              hop.hop(targetX, targetY, gridPos.currentCell.col, gridPos.currentCell.row + 2);
              return;
            }
          }
        }
      }
    }
    
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
    
    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) {
      const targetCell = this.grid.getCell(targetNode.col, targetNode.row);
      if (targetCell && targetCell.layer !== gridPos.currentLayer) {
        const hop = this.entity.get(BugHopComponent);
        if (hop) {
          let hopCol = targetNode.col;
          let hopRow = targetNode.row;
          
          const movingDown = targetNode.row > gridPos.currentCell.row;
          const movingUp = targetNode.row < gridPos.currentCell.row;
          
          if (movingDown && gridPos.currentLayer === 1 && targetCell.layer === 0) {
            const nextCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row + 1);
            if (nextCell?.layer === 1) {
              hopRow = gridPos.currentCell.row + 2;
              hopCol = gridPos.currentCell.col;
            }
          } else if (movingUp && gridPos.currentLayer === 0 && targetCell.layer === 1) {
            const nextCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row - 1);
            if (nextCell?.layer === 1) {
              hopRow = gridPos.currentCell.row - 2;
              hopCol = gridPos.currentCell.col;
            }
          }
          
          const targetWorld = this.grid.cellToWorld(hopCol, hopRow);
          const targetX = targetWorld.x + this.grid.cellSize / 2;
          const targetY = targetWorld.y + this.grid.cellSize / 2;
          hop.hop(targetX, targetY, hopCol, hopRow);
          return;
        }
      }
    }
    
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

  private arriveAtTarget(transform: TransformComponent, _gridPos: GridPositionComponent): void {
    const targetWorld = this.grid.cellToWorld(this.targetCellCol, this.targetCellRow);
    transform.x = targetWorld.x + this.grid.cellSize / 2;
    transform.y = targetWorld.y + this.grid.cellSize / 2;
    this.isMovingToCell = false;
  }
}
