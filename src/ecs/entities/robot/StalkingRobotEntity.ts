import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { PatrolComponent, type PatrolWaypoint } from '../../components/ai/PatrolComponent';
import { LineOfSightComponent } from '../../components/combat/LineOfSightComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { FireballPropertiesComponent } from '../../components/ai/FireballPropertiesComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { ShadowComponent } from '../../components/core/ShadowComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { RobotHitParticlesComponent } from '../../components/visual/RobotHitParticlesComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { RobotPatrolState } from './RobotPatrolState';
import { RobotAlertState } from './RobotAlertState';
import { RobotStalkingState } from './RobotStalkingState';
import { RobotRetreatState } from './RobotRetreatState';
import { RobotFireballState } from './RobotFireballState';
import { RobotHitState } from './RobotHitState';
import { RobotDeathState } from './RobotDeathState';
import type { Grid } from '../../../systems/grid/Grid';
import { getRobotDifficultyConfig } from './RobotDifficulty';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import type { EnemyDifficulty } from '../../../constants/EnemyDifficulty';

// Robot configuration constants
import { SPRITE_SCALE } from '../../../constants/GameConstants';

const ROBOT_SCALE = 2 * SPRITE_SCALE;
const ROBOT_SPRITE_FRAME = 0; // South idle
const ROBOT_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 24, width: 32, height: 32 };
const ROBOT_ENTITY_COLLISION_BOX = { offsetX: -19, offsetY: -20, width: 38, height: 40 };
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

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1.3, offsetX: 0, offsetY: 30 }));
  shadow.init();

  const startCell = grid.worldToCell(x, y);
  const gridPos = entity.add(new GridPositionComponent(startCell.col, startCell.row, ROBOT_GRID_COLLISION_BOX));

  // Set initial layer based on spawn cell
  const spawnCell = grid.getCell(startCell.col, startCell.row);
  if (spawnCell) {
    gridPos.currentLayer = grid.getLayer(spawnCell);
  }

  entity.add(new GridCollisionComponent(grid));

  entity.add(new HealthComponent({ maxHealth: config.health }));

  entity.add(new PatrolComponent(waypoints, config.speed));

  entity.add(new LineOfSightComponent({
    range: ROBOT_LINE_OF_SIGHT_RANGE,
    grid,
    fieldOfView: ROBOT_FIELD_OF_VIEW
  }));

  entity.add(new KnockbackComponent(ROBOT_KNOCKBACK_FRICTION, ROBOT_KNOCKBACK_DURATION_MS, grid));

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
        if (!canPlayerHitEnemy(playerEntity, entity, grid)) {
          return;
        }

        const projectile = other.get(ProjectileComponent);
        let dirX = 0;
        let dirY = 1;

        if (projectile) {
          dirX = projectile.dirX;
          dirY = projectile.dirY;
        } else {
          const otherTransform = other.get(TransformComponent);
          const robotTransform = entity.get(TransformComponent);
          if (otherTransform && robotTransform) {
            const dx = robotTransform.x - otherTransform.x;
            const dy = robotTransform.y - otherTransform.y;
            const length = Math.hypot(dx, dy);
            if (length > 0) {
              dirX = dx / length;
              dirY = dy / length;
            }
          }
        }

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
