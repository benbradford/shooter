import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { Direction, dirFromDelta } from '../constants/Direction';
import type { Grid } from '../utils/Grid';
import { PatrolComponent } from '../ecs/components/PatrolComponent';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { GridPositionComponent } from '../ecs/components/GridPositionComponent';
import { LineOfSightComponent } from '../ecs/components/LineOfSightComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';

export class RobotPatrolState implements IState {
  private entity: Entity;
  private grid: Grid;
  private playerEntity: Entity;

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
    const patrol = this.entity.get(PatrolComponent);
    const transform = this.entity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const los = this.entity.get(LineOfSightComponent);
    const stateMachine = this.entity.get(StateMachineComponent);
    const sprite = this.entity.get(SpriteComponent);

    if (!patrol || !transform || !gridPos || !los || !stateMachine || !sprite) return;

    // Check line of sight to player
    if (los.canSeeTarget(this.entity, this.playerEntity)) {
      stateMachine.stateMachine.enter('alert');
      return;
    }

    // Get current waypoint
    const waypoint = patrol.getCurrentWaypoint();
    const targetX = waypoint.col * this.grid.cellSize + this.grid.cellSize / 2;
    const targetY = waypoint.row * this.grid.cellSize + this.grid.cellSize / 2;

    // Calculate direction to waypoint
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Reached waypoint?
    if (distance < 5) {
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
