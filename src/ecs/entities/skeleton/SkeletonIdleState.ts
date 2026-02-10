import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { TransformComponent } from '../../components/core/TransformComponent';
import { Direction } from '../../../constants/Direction';
import { Pathfinder } from '../../../systems/Pathfinder';
import type { Grid } from '../../../systems/grid/Grid';

const IDLE_MIN_DURATION_MS = 500;
const IDLE_MAX_DURATION_MS = 1000;
const MAX_CHASE_DISTANCE_CELLS = 16;
const MAX_CHASE_DISTANCE_PX = 800;

export class SkeletonIdleState implements IState {
  private elapsedMs = 0;
  private durationMs = 0;
  private readonly pathfinder: Pathfinder;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid
  ) {
    this.pathfinder = new Pathfinder(grid);
  }

  onEnter(): void {
    this.elapsedMs = 0;
    this.durationMs = IDLE_MIN_DURATION_MS + Math.random() * (IDLE_MAX_DURATION_MS - IDLE_MIN_DURATION_MS);

    const sprite = this.entity.require(SpriteComponent);
    const dirName = Direction[Direction.Down].toLowerCase();
    sprite.sprite.play(`skeleton_idle_${dirName}`);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= this.durationMs) {
      const transform = this.entity.require(TransformComponent);
      const playerTransform = this.playerEntity.require(TransformComponent);

      const skeletonCell = this.grid.worldToCell(transform.x, transform.y);
      const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);

      const path = this.pathfinder.findPath(
        skeletonCell.col,
        skeletonCell.row,
        playerCell.col,
        playerCell.row,
        0,
        false,
        true
      );

      const pathDistance = path ? path.length : Infinity;
      const pixelDistance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);

      if (pathDistance <= MAX_CHASE_DISTANCE_CELLS && pixelDistance <= MAX_CHASE_DISTANCE_PX) {
        const stateMachine = this.entity.require(StateMachineComponent);
        stateMachine.stateMachine.enter('walk');
      } else {
        this.elapsedMs = 0;
        this.durationMs = IDLE_MIN_DURATION_MS + Math.random() * (IDLE_MAX_DURATION_MS - IDLE_MIN_DURATION_MS);
      }
    }
  }
}
