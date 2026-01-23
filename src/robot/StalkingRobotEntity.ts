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
import { FireballPropertiesComponent } from '../ecs/components/FireballPropertiesComponent';
import { CollisionComponent } from '../ecs/components/CollisionComponent';
import { ShadowComponent } from '../ecs/components/ShadowComponent';
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
const ROBOT_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 50, width: 32, height: 16 };
const ROBOT_ENTITY_COLLISION_BOX = { offsetX: -22, offsetY: -40, width: 48, height: 85 };
const ROBOT_LINE_OF_SIGHT_RANGE = 800;
const ROBOT_FIELD_OF_VIEW = Math.PI * 0.75;
const ROBOT_KNOCKBACK_FRICTION = 8;
const ROBOT_KNOCKBACK_DURATION = 500; // milliseconds
const ROBOT_BULLET_DAMAGE = 10;
const ROBOT_KNOCKBACK_FORCE = 200;

export function createStalkingRobotEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid,
  playerEntity: Entity,
  waypoints: PatrolWaypoint[],
  health: number,
  speed: number,
  fireballSpeed: number,
  fireballDuration: number
): Entity {
  const entity = new Entity('stalking_robot');
  entity.tags.add('enemy');

  const transform = entity.add(new TransformComponent(x, y, 0, ROBOT_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'floating_robot', transform));
  sprite.sprite.setFrame(ROBOT_SPRITE_FRAME);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 2, offsetX: 0, offsetY: 60 }));
  shadow.init();

  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, ROBOT_GRID_COLLISION_BOX));

  entity.add(new GridCollisionComponent(grid));

  entity.add(new HealthComponent({ maxHealth: health }));

  entity.add(new PatrolComponent(waypoints, speed));

  entity.add(new LineOfSightComponent({
    range: ROBOT_LINE_OF_SIGHT_RANGE,
    grid,
    fieldOfView: ROBOT_FIELD_OF_VIEW
  }));

  const knockback = entity.add(new KnockbackComponent(ROBOT_KNOCKBACK_FRICTION, ROBOT_KNOCKBACK_DURATION));

  entity.add(new FireballPropertiesComponent(fireballSpeed, fireballDuration));
  const stateMachine = new StateMachine(
    {
      patrol: new RobotPatrolState(entity, grid, playerEntity),
      alert: new RobotAlertState(entity, scene, playerEntity),
      stalking: new RobotStalkingState(entity, playerEntity, grid),
      fireball: new RobotFireballState(entity, scene, playerEntity),
      hit: new RobotHitState(entity),
      death: new RobotDeathState(entity),
    },
    'patrol'
  );

  const stateMachineComp = entity.add(new StateMachineComponent(stateMachine));

  entity.add(new CollisionComponent({
    box: ROBOT_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        const healthComp = entity.get(HealthComponent);
        if (healthComp) {
          healthComp.takeDamage(ROBOT_BULLET_DAMAGE);
        }

        // Apply knockback from bullet direction
        const bulletTransform = other.get(TransformComponent);
        const robotTransform = entity.get(TransformComponent);
        if (bulletTransform && robotTransform && knockback) {
          const dx = robotTransform.x - bulletTransform.x;
          const dy = robotTransform.y - bulletTransform.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0) {
            knockback.applyKnockback(dx / distance, dy / distance, ROBOT_KNOCKBACK_FORCE);
          }
        }

        stateMachineComp.stateMachine.enter('hit');
      }
    }
  }));

  return entity;
}
