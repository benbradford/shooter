import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { KnockbackComponent } from '../ecs/components/movement/KnockbackComponent';
import { BugHopComponent } from '../ecs/components/movement/BugHopComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import type { Grid } from '../utils/Grid';

const FRAME_DURATION_MS = 125;
const ATTACK_RANGE_PX = 128;

export class BugChaseState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private readonly grid: Grid;
  private readonly speedPxPerSec: number;
  private animTimer = 0;
  private currentFrame = 0;
  private isMovingToCell = false;
  private targetCellCol = 0;
  private targetCellRow = 0;

  constructor(entity: Entity, playerEntity: Entity, grid: Grid, speedPxPerSec: number) {
    this.entity = entity;
    this.playerEntity = playerEntity;
    this.grid = grid;
    this.speedPxPerSec = speedPxPerSec;
  }

  onEnter(): void {}

  onExit(): void {}

  onUpdate(delta: number): void {
    const hop = this.entity.get(BugHopComponent);
    if (hop?.isActive()) {
      return;
    }

    const knockback = this.entity.get(KnockbackComponent);
    if (knockback?.isActive) {
      return;
    }

    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const sprite = this.entity.get(SpriteComponent);
    if (!transform || !playerTransform || !gridPos || !sprite) {
      return;
    }

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distanceToPlayer = Math.hypot(dx, dy);

    if (distanceToPlayer <= ATTACK_RANGE_PX) {
      const stateMachine = this.entity.get(StateMachineComponent);
      if (stateMachine) {
        stateMachine.stateMachine.enter('attack');
      }
      return;
    }

    if (!this.isMovingToCell) {
      let targetCol = gridPos.currentCell.col;
      let targetRow = gridPos.currentCell.row;

      if (Math.abs(dx) > Math.abs(dy)) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }

      const targetCell = this.grid.getCell(targetCol, targetRow);
      const cellLayer = targetCell?.layer ?? 0;
      const isValidTarget = targetCell && cellLayer === 0 && 
                            targetCol >= 0 && targetCol < this.grid.cols &&
                            targetRow >= 0 && targetRow < this.grid.rows;
      
      if (isValidTarget) {
        this.isMovingToCell = true;
        this.targetCellCol = targetCol;
        this.targetCellRow = targetRow;
      }
    }

    if (this.isMovingToCell) {
      const targetWorld = this.grid.cellToWorld(this.targetCellCol, this.targetCellRow);
      const targetX = targetWorld.x + this.grid.cellSize / 2;
      const targetY = targetWorld.y + this.grid.cellSize / 2;
      const distance = Math.hypot(targetX - transform.x, targetY - transform.y);

      if (distance > 5) {
        const moveX = (targetX - transform.x) / distance * this.speedPxPerSec * (delta / 1000);
        const moveY = (targetY - transform.y) / distance * this.speedPxPerSec * (delta / 1000);
        transform.x += moveX;
        transform.y += moveY;

        const dx = targetX - transform.x;
        const dy = targetY - transform.y;
        let baseFrame = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          baseFrame = dx > 0 ? 12 : 8;
        } else {
          baseFrame = dy > 0 ? 0 : 4;
        }

        this.animTimer += delta;
        if (this.animTimer >= FRAME_DURATION_MS) {
          this.animTimer = 0;
          this.currentFrame = (this.currentFrame + 1) % 4;
        }
        sprite?.sprite.setFrame(baseFrame + this.currentFrame);
      } else {
        transform.x = targetX;
        transform.y = targetY;
        gridPos.currentCell.col = this.targetCellCol;
        gridPos.currentCell.row = this.targetCellRow;
        this.isMovingToCell = false;
      }
    }
  }
}
