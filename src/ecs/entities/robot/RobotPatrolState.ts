import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';
import { PatrolComponent } from '../../components/ai/PatrolComponent';
import { TransformComponent } from '../../components/core/TransformComponent';
import { LineOfSightComponent } from '../../components/combat/LineOfSightComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { Pathfinder } from '../../../systems/Pathfinder';

// Patrol state configuration
const WAYPOINT_REACHED_DISTANCE = 5;
const PATH_RECALC_INTERVAL_MS = 1000;

export class RobotPatrolState implements IState {
  private readonly entity: Entity;
  private readonly grid: Grid;
  private readonly playerEntity: Entity;
  private readonly pathfinder: Pathfinder;
  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex: number = 0;
  private pathRecalcTimer: number = 0;

  constructor(entity: Entity, grid: Grid, playerEntity: Entity) {
    this.entity = entity;
    this.grid = grid;
    this.playerEntity = playerEntity;
    this.pathfinder = new Pathfinder(grid);
  }

  onEnter(): void {
    this.path = null;
    this.currentPathIndex = 0;
    this.pathRecalcTimer = 0;
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    const patrol = this.entity.require(PatrolComponent);
    const transform = this.entity.require(TransformComponent);
    const los = this.entity.require(LineOfSightComponent);
    const stateMachine = this.entity.require(StateMachineComponent);
    const sprite = this.entity.require(SpriteComponent);
    const gridPos = this.entity.require(GridPositionComponent);

    this.pathRecalcTimer += delta;

    // Get current waypoint
    const waypoint = patrol.getCurrentWaypoint();
    const targetX = waypoint.col * this.grid.cellSize + this.grid.cellSize / 2;
    const targetY = waypoint.row * this.grid.cellSize + this.grid.cellSize / 2;

    // Calculate distance to waypoint
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const distance = Math.hypot(dx, dy);

    // Reached waypoint?
    if (distance < WAYPOINT_REACHED_DISTANCE) {
      patrol.nextWaypoint();
      this.path = null;
      return;
    }

    // Recalculate path periodically
    if (this.pathRecalcTimer >= PATH_RECALC_INTERVAL_MS || this.path === null) {
      this.pathRecalcTimer = 0;
      const robotCell = this.grid.worldToCell(transform.x, transform.y);

      this.path = this.pathfinder.findPath(
        robotCell.col,
        robotCell.row,
        waypoint.col,
        waypoint.row,
        gridPos.currentLayer,
        false,
        true
      );
      this.currentPathIndex = 0;
    }

    // Move along path
    if (this.path && this.path.length > 1) {
      if (this.currentPathIndex === 0) {
        this.currentPathIndex = 1;
      }

      if (this.currentPathIndex < this.path.length) {
        const targetNode = this.path[this.currentPathIndex];
        const nodeX = targetNode.col * this.grid.cellSize + this.grid.cellSize / 2;
        const nodeY = targetNode.row * this.grid.cellSize + this.grid.cellSize / 2;

        const nodeDx = nodeX - transform.x;
        const nodeDy = nodeY - transform.y;
        const nodeDistance = Math.hypot(nodeDx, nodeDy);

        if (nodeDistance < 10) {
          this.currentPathIndex++;
        } else {
          const dirX = nodeDx / nodeDistance;
          const dirY = nodeDy / nodeDistance;
          const moveSpeed = patrol.speed * (delta / 1000);

          transform.x += dirX * moveSpeed;
          transform.y += dirY * moveSpeed;

          // Update facing direction and idle frame
          const direction = dirFromDelta(dirX, dirY);
          const frameIndex = this.getIdleFrameForDirection(direction);
          sprite.sprite.setFrame(frameIndex);

          // Update line of sight facing angle
          los.facingAngle = Math.atan2(dirY, dirX);
        }
      }
    } else {
      // Fallback: move directly if no path
      const dirX = dx / distance;
      const dirY = dy / distance;
      const moveSpeed = patrol.speed * (delta / 1000);

      transform.x += dirX * moveSpeed;
      transform.y += dirY * moveSpeed;

      const direction = dirFromDelta(dirX, dirY);
      const frameIndex = this.getIdleFrameForDirection(direction);
      sprite.sprite.setFrame(frameIndex);

      los.facingAngle = Math.atan2(dirY, dirX);
    }

    // Check line of sight to player
    if (los.canSeeTarget(this.entity, this.playerEntity)) {
      stateMachine.stateMachine.enter('alert');
      return;
    }
  }

  private getIdleFrameForDirection(direction: Direction): number {
    // Sprite sheet row 0: idle frames for 8 directions
    // Order: south, north, west, east, north-west, north-east, south-west, south-east
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
    return directionMap[direction] || 0;
  }
}
