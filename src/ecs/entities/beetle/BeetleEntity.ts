import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import type { Grid } from '../../../systems/grid/Grid';
import type { EnemyDifficulty } from '../../../constants/EnemyDifficulty';
import type { EntityManager } from '../../EntityManager';
import { createBeetleAnimations, getBeetleAnimKey } from './BeetleAnimations';
import { BeetleWanderState } from './BeetleWanderState';
import { BeetleChargeState } from './BeetleChargeState';
import { BeetleHitState } from './BeetleHitState';
import { BeetleDeathState } from './BeetleDeathState';
import { EnemyFearState } from '../common/EnemyFearState';

export type CreateBeetleProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  difficulty: EnemyDifficulty;
  entityId: string;
  entityManager: EntityManager;
};

const BEETLE_SCALE = 1;
const BEETLE_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 8, width: 28, height: 16 };
const BEETLE_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 32, height: 32 };
const KNOCKBACK_FRICTION = 0.01;
const KNOCKBACK_DURATION_MS = 300;
const KNOCKBACK_FORCE_PX = 200;
const HIT_FLASH_DURATION_MS = 300;

const HEALTH_BY_DIFFICULTY: Record<EnemyDifficulty, number> = {
  easy: 20,
  medium: 40,
  hard: 60,
};

export function createBeetleEntity(props: CreateBeetleProps): Entity {
  const { scene, col, row, grid, playerEntity, difficulty, entityId, entityManager } = props;

  createBeetleAnimations(scene);

  const entity = new Entity(entityId);
  entity.tags.add('enemy');
  entity.tags.add('beetle');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y, 0, BEETLE_SCALE));
  const sprite = entity.add(new SpriteComponent(scene, 'beetle', transform));
  sprite.sprite.setDepth(-1);

  entity.add(new GridPositionComponent(col, row, BEETLE_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new HealthComponent({ maxHealth: HEALTH_BY_DIFFICULTY[difficulty] }));
  entity.add(new HitFlashComponent());
  entity.add(new DifficultyComponent(difficulty));
  entity.add(new KnockbackComponent(KNOCKBACK_FRICTION, KNOCKBACK_DURATION_MS, grid));

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1, offsetX: 0, offsetY: 8 }));
  shadow.init();

  let lastHitDirX = 0;
  let lastHitDirY = -1;

  const stateMachine = new StateMachine<void>({
    wander: new BeetleWanderState(entity, playerEntity, grid),
    charge: new BeetleChargeState(entity, playerEntity, grid, scene),
    hit: new BeetleHitState(entity),
    death: new BeetleDeathState(entity, scene, entityManager),
    fear: new EnemyFearState(entity, 100, (dir) => {
      sprite.sprite.play(getBeetleAnimKey('sneak', dir));
    })
  }, 'wander');

  entity.add(new StateMachineComponent(stateMachine));

  entity.add(new CollisionComponent({
    box: BEETLE_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile', 'player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        // Beetle hitting player is handled in BeetleChargeState
        return;
      }

      if (other.tags.has('player_projectile')) {
        if (!canPlayerHitEnemy(playerEntity, entity, grid, other)) return;

        const health = entity.require(HealthComponent);
        const dmg = other.get(DamageComponent);
        health.takeDamage(dmg?.damage ?? 20);

        const projectile = other.get(ProjectileComponent);
        if (projectile) {
          const length = Math.hypot(projectile.dirX, projectile.dirY);
          lastHitDirX = projectile.dirX / length;
          lastHitDirY = projectile.dirY / length;

          const knockback = entity.get(KnockbackComponent);
          if (knockback) {
            knockback.applyKnockback(lastHitDirX, lastHitDirY, KNOCKBACK_FORCE_PX);
          }
        }

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) hitFlash.flash(HIT_FLASH_DURATION_MS);

        if (health.getHealth() <= 0) {
          stateMachine.enter('death');
        } else {
          stateMachine.enter('hit');
        }
      }
    }
  }));

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
