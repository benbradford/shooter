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

export function createStalkingRobotEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid,
  playerEntity: Entity,
  waypoints: PatrolWaypoint[],
  health: number = 100,
  speed: number = 100
): Entity {
  const entity = new Entity('stalking_robot');

  // Transform - 4x scale for robots (larger than player)
  const transform = entity.add(new TransformComponent(x, y, 0, 3));

  // Sprite - use frame 0 (south idle) from sprite sheet
  const sprite = entity.add(new SpriteComponent(scene, 'floating_robot', transform));
  sprite.sprite.setFrame(0);

  // Grid position
  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(
    startCell.col,
    startCell.row,
    { offsetX: 0, offsetY: 16, width: 32, height: 16 }
  ));

  // Grid collision - check layers 1 and 2 (same as player)
  entity.add(new GridCollisionComponent(grid));

  // Health
  entity.add(new HealthComponent({ maxHealth: health }));

  // Patrol
  entity.add(new PatrolComponent(waypoints, speed));

  // Line of sight
  entity.add(new LineOfSightComponent(500)); // 500 pixel range

  // Knockback
  entity.add(new KnockbackComponent(5, 2000)); // friction=5, duration=2s

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
