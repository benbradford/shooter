import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import { getThrowerDifficultyConfig } from './ThrowerDifficultyConfig';
import { Pathfinder } from '../utils/Pathfinder';
import type { Grid } from '../utils/Grid';
import { dirFromDelta, directionToAnimationName } from '../constants/Direction';

export class ThrowerRunningState implements IState {
  private readonly pathfinder: Pathfinder;
  private path: Array<{ col: number; row: number }> | null = null;
  private pathRecalcTimerMs: number = 0;
  private currentPathIndex: number = 0;
  private throwTimerMs: number = 0;
  private targetCol: number = -1;
  private targetRow: number = -1;
  private lastPositionCol: number = -1;
  private lastPositionRow: number = -1;
  private stuckTimerMs: number = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid
  ) {
    this.pathfinder = new Pathfinder(grid);
  }

  onEnter(): void {
    const difficulty = this.entity.require(DifficultyComponent);
    const config = getThrowerDifficultyConfig(difficulty.difficulty);
    this.throwTimerMs = config.throwFrequencyMs;
  }

  onUpdate(delta: number): void {
    this.throwTimerMs -= delta;
    this.pathRecalcTimerMs += delta;
    this.stuckTimerMs += delta;

    if (this.throwTimerMs <= 0) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('throwing');
      return;
    }

    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    const difficulty = this.entity.require(DifficultyComponent);
    const config = getThrowerDifficultyConfig(difficulty.difficulty);

    const currentCell = this.grid.worldToCell(transform.x, transform.y);
    
    if (currentCell.col === this.lastPositionCol && currentCell.row === this.lastPositionRow) {
      if (this.stuckTimerMs >= 1000) {
        this.path = null;
        this.stuckTimerMs = 0;
      }
    } else {
      this.lastPositionCol = currentCell.col;
      this.lastPositionRow = currentCell.row;
      this.stuckTimerMs = 0;
    }

    if (this.pathRecalcTimerMs >= 500 || this.path === null) {
      this.pathRecalcTimerMs = 0;
      this.findCoverPosition();
      
      if (this.targetCol !== -1 && this.targetRow !== -1) {
        this.path = this.pathfinder.findPath(
          currentCell.col,
          currentCell.row,
          this.targetCol,
          this.targetRow,
          gridPos.currentLayer,
          false,
          true
        );
        this.currentPathIndex = 0;
      }
    }

    if (this.path && this.path.length > 1) {
      this.followPath(transform, config.speedPxPerSec, delta);
    }
  }

  private findCoverPosition(): void {
    const playerTransform = this.playerEntity.require(TransformComponent);
    const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    const playerGridPos = this.playerEntity.require(GridPositionComponent);
    
    const searchRadius = 10;
    let bestCol = -1;
    let bestRow = -1;
    let bestScore = -1;

    for (let dCol = -searchRadius; dCol <= searchRadius; dCol++) {
      for (let dRow = -searchRadius; dRow <= searchRadius; dRow++) {
        const col = playerCell.col + dCol;
        const row = playerCell.row + dRow;
        
        const cell = this.grid.getCell(col, row);
        if (!cell || cell.layer > playerGridPos.currentLayer) continue;
        
        const hasWallBetween = this.checkWallBetween(col, row, playerCell.col, playerCell.row, playerGridPos.currentLayer);
        if (!hasWallBetween) continue;
        
        const distToPlayer = Math.hypot(dCol, dRow);
        const score = distToPlayer;
        
        if (score > bestScore) {
          bestScore = score;
          bestCol = col;
          bestRow = row;
        }
      }
    }

    this.targetCol = bestCol;
    this.targetRow = bestRow;
  }

  private checkWallBetween(col1: number, row1: number, col2: number, row2: number, layer: number): boolean {
    const dx = col2 - col1;
    const dy = row2 - row1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const checkCol = Math.round(col1 + dx * t);
      const checkRow = Math.round(row1 + dy * t);
      
      const cell = this.grid.getCell(checkCol, checkRow);
      if (cell && cell.layer > layer) {
        return true;
      }
    }
    
    return false;
  }

  private followPath(transform: TransformComponent, speedPxPerSec: number, delta: number): void {
    if (!this.path || this.currentPathIndex >= this.path.length) {
      this.path = null;
      return;
    }

    if (this.currentPathIndex === 0) {
      this.currentPathIndex = 1;
    }

    const targetNode = this.path[this.currentPathIndex];
    const targetWorld = this.grid.cellToWorld(targetNode.col, targetNode.row);
    const targetX = targetWorld.x + this.grid.cellSize / 2;
    const targetY = targetWorld.y + this.grid.cellSize / 2;

    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 10) {
      this.currentPathIndex++;
      if (this.currentPathIndex >= this.path.length) {
        this.path = null;
      }
    } else {
      const moveX = (dx / distance) * speedPxPerSec * (delta / 1000);
      const moveY = (dy / distance) * speedPxPerSec * (delta / 1000);
      
      transform.x += moveX;
      transform.y += moveY;

      const dir = dirFromDelta(dx, dy);
      const dirName = directionToAnimationName(dir);
      const sprite = this.entity.require(SpriteComponent);
      const animKey = `thrower_walk_${dirName}`;
      if (!sprite.sprite.anims.isPlaying || sprite.sprite.anims.currentAnim?.key !== animKey) {
        sprite.sprite.play(animKey);
      }
    }
  }
}
