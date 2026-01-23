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
import { ProjectileComponent } from '../ecs/components/ProjectileComponent';
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
const ROBOT_LINE_OF_SIGHT_RANGE = 500;
const ROBOT_FIELD_OF_VIEW = Math.PI * 0.75;
const ROBOT_KNOCKBACK_FRICTION = 0.85;
const ROBOT_KNOCKBACK_DURATION_MS = 300;
const ROBOT_BULLET_DAMAGE = 10;
const ROBOT_KNOCKBACK_FORCE_PX_PER_SEC = 500;

export interface CreateStalkingRobotProps {
  scene: Phaser.Scene;
  x: number;
  y: number;
  grid: Grid;
  playerEntity: Entity;
  waypoints: PatrolWaypoint[];
  health: number;
  speed: number;
  fireballSpeed: number;
  fireballDuration: number;
}

export function createStalkingRobotEntity(props: CreateStalkingRobotProps): Entity {
  const { scene, x, y, grid, playerEntity, waypoints, health, speed, fireballSpeed, fireballDuration } = props;
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

  entity.add(new KnockbackComponent(ROBOT_KNOCKBACK_FRICTION, ROBOT_KNOCKBACK_DURATION_MS));

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

        // Apply knockback from projectile's direction (normalized)
        const knockback = entity.get(KnockbackComponent);
        const projectile = other.get(ProjectileComponent);
        if (knockback && projectile) {
          const length = Math.hypot(projectile.dirX, projectile.dirY);
          const normalizedDirX = projectile.dirX / length;
          const normalizedDirY = projectile.dirY / length;
          knockback.applyKnockback(normalizedDirX, normalizedDirY, ROBOT_KNOCKBACK_FORCE_PX_PER_SEC);
        }

        // Enter hit state (or reset if already in hit state)
        const currentState = stateMachineComp.stateMachine.getCurrentKey();
        if (currentState === 'hit') {
          stateMachineComp.stateMachine.enter('stalking');
        }
        stateMachineComp.stateMachine.enter('hit');
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    KnockbackComponent,
    GridPositionComponent,
    GridCollisionComponent,
    LineOfSightComponent,
    StateMachineComponent,
  ]);

  return entity;
}
