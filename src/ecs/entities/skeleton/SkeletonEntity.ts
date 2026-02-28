import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { SkeletonRiseComponent } from '../../components/visual/SkeletonRiseComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { SkeletonRiseState } from './SkeletonRiseState';
import { SkeletonIdleState } from './SkeletonIdleState';
import { SkeletonWalkState } from './SkeletonWalkState';
import { SkeletonAttackState } from './SkeletonAttackState';
import { SkeletonHitState } from './SkeletonHitState';
import { SkeletonDeathState } from './SkeletonDeathState';
import { getSkeletonDifficultyConfig, type SkeletonDifficulty } from './SkeletonDifficultyConfig';
import { createSkeletonAnimations } from './SkeletonAnimations';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import type { CreatorData } from '../../../systems/CreatorData';

const SKELETON_SCALE = 1.6;
const SKELETON_GRID_COLLISION_BOX = { offsetX: 6, offsetY: 16, width: 24, height: 14 };
const SKELETON_ENTITY_COLLISION_BOX = { offsetX: -6, offsetY: -17, width: 24, height: 42 };
const SKELETON_SHADOW_PROPS = { scale: 0.9, offsetX: 6, offsetY: 23 };
const SKELETON_KNOCKBACK_FRICTION = 0.88;
const SKELETON_KNOCKBACK_FORCE_PX = 400;
const HIT_DURATION_MS = 300;
const BULLET_DAMAGE = 10;

export type SkeletonCreatorData = CreatorData & {
  col: number;
  row: number;
  difficulty: SkeletonDifficulty;
  onThrowBone: (x: number, y: number, dirX: number, dirY: number) => void;
}

export function createSkeletonEntity(data: SkeletonCreatorData): Entity {
  const { scene, col, row, grid, playerEntity, difficulty, onThrowBone, entityId } = data;
  const config = getSkeletonDifficultyConfig(difficulty);

  createSkeletonAnimations(scene);

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const entity = new Entity(entityId);
  entity.tags.add('enemy');

  const transform = entity.add(new TransformComponent(x, y, 0, SKELETON_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'skeleton', transform));
  sprite.sprite.setDepth(Depth.enemyFlying);
  sprite.sprite.setFrame(0);

  const shadow = entity.add(new ShadowComponent(scene, SKELETON_SHADOW_PROPS));
  shadow.init();

  entity.add(new SkeletonRiseComponent({ scene }));

  entity.add(new GridPositionComponent(col, row, SKELETON_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new DifficultyComponent(difficulty));
  entity.add(new HealthComponent({ maxHealth: config.health }));
  entity.add(new HitFlashComponent());
  entity.add(new KnockbackComponent(SKELETON_KNOCKBACK_FRICTION, HIT_DURATION_MS, grid));

  let lastHitDirX = 0;
  let lastHitDirY = -1;

  entity.add(new CollisionComponent({
    box: SKELETON_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile', 'player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        const transform = entity.require(TransformComponent);
        const otherTransform = other.require(TransformComponent);
        const knockback = entity.require(KnockbackComponent);

        const dx = transform.x - otherTransform.x;
        const dy = transform.y - otherTransform.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0 && !knockback.isActive) {
          const dirX = dx / distance;
          const dirY = dy / distance;
          knockback.applyKnockback(dirX, dirY, 250);
        }
        return;
      }

      if (other.tags.has('player_projectile')) {
        if (!canPlayerHitEnemy(playerEntity, entity, grid)) {
          return;
        }

        const health = entity.require(HealthComponent);
        health.takeDamage(BULLET_DAMAGE);

        const projectile = other.get(ProjectileComponent);
        if (projectile) {
          const length = Math.hypot(projectile.dirX, projectile.dirY);
          lastHitDirX = projectile.dirX / length;
          lastHitDirY = projectile.dirY / length;

          const knockback = entity.get(KnockbackComponent);
          if (knockback) {
            knockback.applyKnockback(lastHitDirX, lastHitDirY, SKELETON_KNOCKBACK_FORCE_PX);
          }
        }

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(HIT_DURATION_MS);
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
    rise: new SkeletonRiseState(),
    idle: new SkeletonIdleState(entity, playerEntity, grid),
    walk: new SkeletonWalkState(entity, playerEntity, grid),
    attack: new SkeletonAttackState(entity, playerEntity, onThrowBone),
    hit: new SkeletonHitState(entity),
    death: new SkeletonDeathState(entity, scene)
  }, 'rise');

  entity.add(new StateMachineComponent(stateMachine));

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    SkeletonRiseComponent,
    KnockbackComponent,
    GridPositionComponent,
    GridCollisionComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
