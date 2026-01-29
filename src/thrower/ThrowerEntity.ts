import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../ecs/components/movement/GridCollisionComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { CollisionComponent } from '../ecs/components/combat/CollisionComponent';
import { KnockbackComponent } from '../ecs/components/movement/KnockbackComponent';
import { HitFlashComponent } from '../ecs/components/visual/HitFlashComponent';
import { ShadowComponent } from '../ecs/components/visual/ShadowComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import { ProjectileComponent } from '../ecs/components/combat/ProjectileComponent';
import { StateMachine } from '../utils/state/StateMachine';
import { ThrowerIdleState } from './ThrowerIdleState';
import { ThrowerRunningState } from './ThrowerRunningState';
import { ThrowerThrowingState } from './ThrowerThrowingState';
import { ThrowerHitState } from './ThrowerHitState';
import { ThrowerDeathState } from './ThrowerDeathState';
import { getThrowerDifficultyConfig, type ThrowerDifficulty } from './ThrowerDifficultyConfig';
import type { Grid } from '../utils/Grid';

const THROWER_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 16, width: 32, height: 16 };
const THROWER_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: 0, width: 32, height: 32 };
const THROWER_SCALE = 2;
const KNOCKBACK_FRICTION = 0.92;
const KNOCKBACK_DURATION_MS = 500;
const KNOCKBACK_FORCE = 200;
const BULLET_DAMAGE = 10;

export type CreateThrowerProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  difficulty: ThrowerDifficulty;
  onThrow: (x: number, y: number, dirX: number, dirY: number, throwDistancePx: number) => void;
}

export function createThrowerEntity(props: CreateThrowerProps): Entity {
  const { scene, col, row, grid, playerEntity, difficulty, onThrow } = props;
  const config = getThrowerDifficultyConfig(difficulty);

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const entity = new Entity('thrower');
  entity.tags.add('enemy');

  const transform = entity.add(new TransformComponent(x, y, 0, THROWER_SCALE));
  
  const sprite = entity.add(new SpriteComponent(scene, 'thrower', transform));
  sprite.sprite.setDepth(10);

  const shadow = entity.add(new ShadowComponent(scene, {
    scale: THROWER_SCALE,
    offsetX: 0,
    offsetY: 50
  }));
  shadow.init();

  entity.add(new GridPositionComponent(col, row, THROWER_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new DifficultyComponent(difficulty));
  entity.add(new HealthComponent({ maxHealth: config.health }));
  entity.add(new HitFlashComponent());
  entity.add(new KnockbackComponent(KNOCKBACK_FRICTION, KNOCKBACK_DURATION_MS));

  let lastHitDirX = 0;
  let lastHitDirY = -1;

  entity.add(new CollisionComponent({
    box: THROWER_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        const health = entity.require(HealthComponent);
        health.takeDamage(BULLET_DAMAGE);

        const projectile = other.get(ProjectileComponent);
        if (projectile) {
          const length = Math.hypot(projectile.dirX, projectile.dirY);
          lastHitDirX = projectile.dirX / length;
          lastHitDirY = projectile.dirY / length;

          const knockback = entity.get(KnockbackComponent);
          if (knockback) {
            knockback.applyKnockback(lastHitDirX, lastHitDirY, KNOCKBACK_FORCE);
          }
        }

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(300);
        }

        if (health.getHealth() <= 0) {
          const stateMachine = entity.require(StateMachineComponent);
          stateMachine.stateMachine.enter('death');
        } else {
          const stateMachine = entity.require(StateMachineComponent);
          stateMachine.stateMachine.enter('hit');
        }
      }
    }
  }));

  const stateMachine = new StateMachine({
    idle: new ThrowerIdleState(entity, playerEntity),
    running: new ThrowerRunningState(entity, playerEntity, grid),
    throwing: new ThrowerThrowingState(entity, playerEntity, onThrow),
    hit: new ThrowerHitState(entity),
    death: new ThrowerDeathState(entity, lastHitDirX, lastHitDirY)
  }, 'idle');

  entity.add(new StateMachineComponent(stateMachine));

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    GridPositionComponent,
    GridCollisionComponent,
    KnockbackComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
