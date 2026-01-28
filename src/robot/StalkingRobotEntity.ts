import Phaser from 'phaser';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../ecs/components/movement/GridCollisionComponent';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { PatrolComponent, type PatrolWaypoint } from '../ecs/components/ai/PatrolComponent';
import { LineOfSightComponent } from '../ecs/components/combat/LineOfSightComponent';
import { KnockbackComponent } from '../ecs/components/movement/KnockbackComponent';
import { FireballPropertiesComponent } from '../ecs/components/ai/FireballPropertiesComponent';
import { CollisionComponent } from '../ecs/components/combat/CollisionComponent';
import { ShadowComponent } from '../ecs/components/core/ShadowComponent';
import { ProjectileComponent } from '../ecs/components/combat/ProjectileComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import { RobotHitParticlesComponent } from '../ecs/components/visual/RobotHitParticlesComponent';
import { HitFlashComponent } from '../ecs/components/visual/HitFlashComponent';
import { StateMachine } from '../utils/state/StateMachine';
import { RobotPatrolState } from './RobotPatrolState';
import { RobotAlertState } from './RobotAlertState';
import { RobotStalkingState } from './RobotStalkingState';
import { RobotRetreatState } from './RobotRetreatState';
import { RobotFireballState } from './RobotFireballState';
import { RobotHitState } from './RobotHitState';
import { RobotDeathState } from './RobotDeathState';
import type { Grid } from '../utils/Grid';
import { getRobotDifficultyConfig } from './RobotDifficulty';
import type { EnemyDifficulty } from '../constants/EnemyDifficulty';

// Robot configuration constants
import { SPRITE_SCALE } from '../constants/GameConstants';

const ROBOT_SCALE = 3 * SPRITE_SCALE;
const ROBOT_SPRITE_FRAME = 0; // South idle
const ROBOT_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 50, width: 32, height: 16 };
const ROBOT_ENTITY_COLLISION_BOX = { offsetX: -22, offsetY: -40, width: 48, height: 85 };
const ROBOT_LINE_OF_SIGHT_RANGE = 500;
const ROBOT_FIELD_OF_VIEW = Math.PI * 0.75;
const ROBOT_KNOCKBACK_FRICTION = 0.85;
const ROBOT_KNOCKBACK_DURATION_MS = 300;
const ROBOT_BULLET_DAMAGE = 10;
const ROBOT_KNOCKBACK_FORCE_PX_PER_SEC = 500;

export type CreateStalkingRobotProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  grid: Grid;
  playerEntity: Entity;
  waypoints: PatrolWaypoint[];
  difficulty: EnemyDifficulty;
}

export function createStalkingRobotEntity(props: CreateStalkingRobotProps): Entity {
  const { scene, x, y, grid, playerEntity, waypoints, difficulty } = props;
  
  // Get all config from difficulty
  const config = getRobotDifficultyConfig(difficulty);
  
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

  entity.add(new HealthComponent({ maxHealth: config.health }));

  entity.add(new PatrolComponent(waypoints, config.speed));

  entity.add(new LineOfSightComponent({
    range: ROBOT_LINE_OF_SIGHT_RANGE,
    grid,
    fieldOfView: ROBOT_FIELD_OF_VIEW
  }));

  entity.add(new KnockbackComponent(ROBOT_KNOCKBACK_FRICTION, ROBOT_KNOCKBACK_DURATION_MS));

  entity.add(new FireballPropertiesComponent(config.fireballSpeed, config.fireballDuration));
  
  entity.add(new DifficultyComponent<EnemyDifficulty>(difficulty));
  
  entity.add(new RobotHitParticlesComponent(scene));
  
  entity.add(new HitFlashComponent());
  
  const stateMachine = new StateMachine(
    {
      patrol: new RobotPatrolState(entity, grid, playerEntity),
      alert: new RobotAlertState(entity, scene, playerEntity),
      stalking: new RobotStalkingState(entity, playerEntity, grid, config.fireballDelayTime),
      retreat: new RobotRetreatState(entity, playerEntity),
      fireball: new RobotFireballState(entity, scene, playerEntity),
      hit: new RobotHitState(entity, config.hitDuration),
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

        const projectile = other.require(ProjectileComponent);
        const dirX = projectile.dirX;
        const dirY = projectile.dirY;

        const healthComp = entity.require(HealthComponent);
        healthComp.takeDamage(ROBOT_BULLET_DAMAGE);

        const hitParticles = entity.get(RobotHitParticlesComponent);
        if (hitParticles) {
          hitParticles.emitHitParticles(dirX, dirY);
        }

        const knockback = entity.get(KnockbackComponent);
        if (knockback) {
          const length = Math.hypot(dirX, dirY);
          const normalizedDirX = dirX / length;
          const normalizedDirY = dirY / length;
          knockback.applyKnockback(normalizedDirX, normalizedDirY, ROBOT_KNOCKBACK_FORCE_PX_PER_SEC);
        }

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
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    KnockbackComponent,
    GridPositionComponent,
    GridCollisionComponent,
    LineOfSightComponent,
    RobotHitParticlesComponent,
    StateMachineComponent,
  ]);

  return entity;
}
