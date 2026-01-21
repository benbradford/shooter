import Phaser from 'phaser';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { GridPositionComponent } from '../ecs/components/GridPositionComponent';
import { GridCollisionComponent } from '../ecs/components/GridCollisionComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { PatrolComponent, type PatrolWaypoint } from '../ecs/components/PatrolComponent';
import { LineOfSightComponent } from '../ecs/components/LineOfSightComponent';
import { KnockbackComponent } from '../ecs/components/KnockbackComponent';
import { StateMachine } from '../utils/state/StateMachine';
import { RobotPatrolState } from './RobotPatrolState';
import { RobotAlertState } from './RobotAlertState';
import { RobotStalkingState } from './RobotStalkingState';
import { RobotFireballState } from './RobotFireballState';
import { RobotHitState } from './RobotHitState';
import { RobotDeathState } from './RobotDeathState';
import type { Grid } from '../utils/Grid';

// Robot configuration constants
const ROBOT_SCALE = 3;
const ROBOT_SPRITE_FRAME = 0; // South idle
const ROBOT_HITBOX = { offsetX: 0, offsetY: 16, width: 32, height: 16 };
const ROBOT_LINE_OF_SIGHT_RANGE = 800;
const ROBOT_FIELD_OF_VIEW = Math.PI * 0.75;
const ROBOT_KNOCKBACK_FRICTION = 8;
const ROBOT_KNOCKBACK_DURATION = 500; // milliseconds

export function createStalkingRobotEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid,
  playerEntity: Entity,
  waypoints: PatrolWaypoint[],
  health: number,
  speed: number
): Entity {
  const entity = new Entity('stalking_robot');

  // Transform
  const transform = entity.add(new TransformComponent(x, y, 0, ROBOT_SCALE));

  // Sprite
  const sprite = entity.add(new SpriteComponent(scene, 'floating_robot', transform));
  sprite.sprite.setFrame(ROBOT_SPRITE_FRAME);

  // Grid position
  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, ROBOT_HITBOX));

  // Grid collision - check layers 1 and 2 (same as player)
  entity.add(new GridCollisionComponent(grid));

  // Health
  entity.add(new HealthComponent({ maxHealth: health }));

  // Patrol
  entity.add(new PatrolComponent(waypoints, speed));

  // Line of sight
  entity.add(new LineOfSightComponent({
    range: ROBOT_LINE_OF_SIGHT_RANGE,
    grid,
    fieldOfView: ROBOT_FIELD_OF_VIEW
  }));

  // Knockback
  entity.add(new KnockbackComponent(ROBOT_KNOCKBACK_FRICTION, ROBOT_KNOCKBACK_DURATION));

  // State machine
  const stateMachine = new StateMachine(
    {
      patrol: new RobotPatrolState(entity, grid, playerEntity),
      alert: new RobotAlertState(entity, scene, playerEntity),
      stalking: new RobotStalkingState(entity, playerEntity),
      fireball: new RobotFireballState(entity, playerEntity),
      hit: new RobotHitState(entity),
      death: new RobotDeathState(entity),
    },
    'patrol'
  );

  entity.add(new StateMachineComponent(stateMachine));

  return entity;
}
