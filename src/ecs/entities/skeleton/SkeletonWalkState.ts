import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { Pathfinder } from '../../../systems/Pathfinder';
import { getSkeletonDifficultyConfig, type SkeletonDifficulty } from './SkeletonDifficultyConfig';
import { dirFromDelta, Direction } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';

const WALK_IDLE_PAUSE_MIN_MS = 3000;
const WALK_IDLE_PAUSE_MAX_MS = 5000;
const WALK_IDLE_PAUSE_DURATION_MS = 500;
const PATH_RECALC_INTERVAL_MS = 500;

export class SkeletonWalkState implements IState {
  private readonly pathfinder: Pathfinder;
  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private pathRecalcTimerMs = 0;
  private pauseTimerMs = 0;
  private nextPauseMs = 0;
  private isPaused = false;
  private pauseDurationMs = 0;
  private lastDirection = Direction.Down;
  private attackCooldownMs = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid
  ) {
    this.pathfinder = new Pathfinder(grid);
    this.nextPauseMs = WALK_IDLE_PAUSE_MIN_MS + Math.random() * (WALK_IDLE_PAUSE_MAX_MS - WALK_IDLE_PAUSE_MIN_MS);
  }

  onEnter(): void {
    this.path = null;
    this.currentPathIndex = 0;
    this.pathRecalcTimerMs = 0;
    this.pauseTimerMs = 0;
    this.isPaused = false;
  }

  onUpdate(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    const difficulty = this.entity.require(DifficultyComponent<SkeletonDifficulty>);
    const config = getSkeletonDifficultyConfig(difficulty.difficulty);
    const sprite = this.entity.require(SpriteComponent);

    this.pauseTimerMs += delta;
    this.attackCooldownMs -= delta;

    if (this.isPaused) {
      if (this.pauseTimerMs >= this.pauseDurationMs) {
        this.isPaused = false;
        this.pauseTimerMs = 0;
        this.nextPauseMs = WALK_IDLE_PAUSE_MIN_MS + Math.random() * (WALK_IDLE_PAUSE_MAX_MS - WALK_IDLE_PAUSE_MIN_MS);
      } else {
        const dirName = Direction[this.lastDirection].toLowerCase();
        sprite.sprite.play(`skeleton_idle_${dirName}`);
        return;
      }
    }

    if (this.pauseTimerMs >= this.nextPauseMs) {
      this.isPaused = true;
      this.pauseDurationMs = WALK_IDLE_PAUSE_DURATION_MS;
      this.pauseTimerMs = 0;
      return;
    }

    const distToPlayer = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
    if (distToPlayer <= config.attackRangePx && this.attackCooldownMs <= 0) {
      this.attackCooldownMs = config.attackCooldownMs;
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('attack');
      return;
    }

    this.pathRecalcTimerMs += delta;
    if (this.pathRecalcTimerMs >= PATH_RECALC_INTERVAL_MS || this.path === null) {
      this.pathRecalcTimerMs = 0;

      const skeletonCell = this.grid.worldToCell(transform.x, transform.y);
      const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);

      this.path = this.pathfinder.findPath(
        skeletonCell.col,
        skeletonCell.row,
        playerCell.col,
        playerCell.row,
        gridPos.currentLayer,
        false,
        true
      );
      this.currentPathIndex = 0;
    }

    if (this.path && this.path.length > 1) {
      if (this.currentPathIndex === 0) {
        this.currentPathIndex = 1;
      }

      if (this.currentPathIndex < this.path.length) {
        const targetNode = this.path[this.currentPathIndex];
        const targetWorld = this.grid.cellToWorld(targetNode.col, targetNode.row);
        const targetX = targetWorld.x + this.grid.cellSize / 2;
        const targetY = targetWorld.y + this.grid.cellSize / 2;

        const dirX = targetX - transform.x;
        const dirY = targetY - transform.y;
        const distance = Math.hypot(dirX, dirY);

        if (distance < 10) {
          this.currentPathIndex++;
        } else {
          const normalizedDirX = dirX / distance;
          const normalizedDirY = dirY / distance;

          transform.x += normalizedDirX * config.speedPxPerSec * (delta / 1000);
          transform.y += normalizedDirY * config.speedPxPerSec * (delta / 1000);

          this.lastDirection = dirFromDelta(normalizedDirX, normalizedDirY);
          const dirName = Direction[this.lastDirection].toLowerCase();
          sprite.sprite.play(`skeleton_walk_${dirName}`);
        }
      }
    } else {
      const dirX = playerTransform.x - transform.x;
      const dirY = playerTransform.y - transform.y;
      const distance = Math.hypot(dirX, dirY);

      if (distance > 10) {
        const normalizedDirX = dirX / distance;
        const normalizedDirY = dirY / distance;

        transform.x += normalizedDirX * config.speedPxPerSec * (delta / 1000);
        transform.y += normalizedDirY * config.speedPxPerSec * (delta / 1000);

        this.lastDirection = dirFromDelta(normalizedDirX, normalizedDirY);
        const dirName = Direction[this.lastDirection].toLowerCase();
        sprite.sprite.play(`skeleton_walk_${dirName}`);
      }
    }
  }
}
