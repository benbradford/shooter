import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';
import { PatrolComponent } from '../../components/ai/PatrolComponent';
import { TransformComponent } from '../../components/core/TransformComponent';
import { LineOfSightComponent } from '../../components/combat/LineOfSightComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';

// Patrol state configuration
const WAYPOINT_REACHED_DISTANCE = 5;

export class RobotPatrolState implements IState {
  private readonly entity: Entity;
  private readonly grid: Grid;
  private readonly playerEntity: Entity;

  constructor(entity: Entity, grid: Grid, playerEntity: Entity) {
    this.entity = entity;
    this.grid = grid;
    this.playerEntity = playerEntity;
  }

  onEnter(): void {
    // Start patrol movement
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

    // Get current waypoint
    const waypoint = patrol.getCurrentWaypoint();
    const targetX = waypoint.col * this.grid.cellSize + this.grid.cellSize / 2;
    const targetY = waypoint.row * this.grid.cellSize + this.grid.cellSize / 2;

    // Calculate direction to waypoint
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const distance = Math.hypot(dx, dy);

    // Reached waypoint?
    if (distance < WAYPOINT_REACHED_DISTANCE) {
      patrol.nextWaypoint();
      return;
    }

    // Move towards waypoint
    const dirX = dx / distance;
    const dirY = dy / distance;
    const moveSpeed = patrol.speed * (delta / 1000);

    transform.x += dirX * moveSpeed;
    transform.y += dirY * moveSpeed;

    // Update facing direction and idle frame
    const direction = dirFromDelta(dirX, dirY);
    const frameIndex = this.getIdleFrameForDirection(direction);
    sprite.sprite.setFrame(frameIndex);

    // Update line of sight facing angle
    los.facingAngle = Math.atan2(dirY, dirX);

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
