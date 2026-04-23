import { SoundManager } from '../../../systems/SoundManager';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { SkeletonRiseComponent } from '../../components/visual/SkeletonRiseComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { SkeletonRiseState } from '../skeleton/SkeletonRiseState';
import { SkeletonIdleState } from '../skeleton/SkeletonIdleState';
import { SkeletonWalkState } from '../skeleton/SkeletonWalkState';
import { SkeletonAttackState } from '../skeleton/SkeletonAttackState';
import { SkeletonHitState } from '../skeleton/SkeletonHitState';
import { RedSkeletonDeathState } from './RedSkeletonDeathState';
import { EnemyFearState } from '../common/EnemyFearState';
import { getSkeletonDifficultyConfig, type SkeletonDifficulty } from '../skeleton/SkeletonDifficultyConfig';
import { createSkeletonAnimations } from '../skeleton/SkeletonAnimations';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import { Direction } from '../../../constants/Direction';
import { Depth } from '../../../constants/DepthConstants';
import type { CreatorData } from '../../../systems/CreatorData';

const RED_TINT = 0xdd8888;
const SKELETON_SCALE = 1.6;
const SKELETON_GRID_COLLISION_BOX = { offsetX: 6, offsetY: 16, width: 24, height: 14 };
const SKELETON_ENTITY_COLLISION_BOX = { offsetX: -6, offsetY: -17, width: 24, height: 42 };
const SKELETON_SHADOW_PROPS = { scale: 0.9, offsetX: 6, offsetY: 23 };
const SKELETON_KNOCKBACK_FRICTION = 0.88;
const SKELETON_KNOCKBACK_FORCE_PX = 400;
const HIT_DURATION_MS = 300;
const BULLET_DAMAGE = 10;

export type RedSkeletonCreatorData = CreatorData & {
  col: number;
  row: number;
  difficulty: SkeletonDifficulty;
  onThrowBone: (x: number, y: number, dirX: number, dirY: number) => void;
  onSpawnMiniSkeletons: (x: number, y: number, difficulty: SkeletonDifficulty, layer: number) => void;
};

export function createRedSkeletonEntity(data: RedSkeletonCreatorData): Entity {
  const { scene, col, row, grid, playerEntity, difficulty, onThrowBone, onSpawnMiniSkeletons, entityId } = data;
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
  sprite.sprite.setTint(RED_TINT);

  const shadow = entity.add(new ShadowComponent(scene, SKELETON_SHADOW_PROPS));
  shadow.init();

  entity.add(new SkeletonRiseComponent({ scene }));
  entity.add(new GridPositionComponent(col, row, SKELETON_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new DifficultyComponent(difficulty));
  entity.add(new HealthComponent({ maxHealth: config.health }));
  entity.add(new HitFlashComponent(undefined, RED_TINT));
  entity.add(new KnockbackComponent(SKELETON_KNOCKBACK_FRICTION, HIT_DURATION_MS, grid));

  entity.add(new CollisionComponent({
    box: SKELETON_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile', 'player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        const t = entity.require(TransformComponent);
        const ot = other.require(TransformComponent);
        const knockback = entity.require(KnockbackComponent);
        const dx = t.x - ot.x;
        const dy = t.y - ot.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && !knockback.isActive) {
          knockback.applyKnockback(dx / dist, dy / dist, 250);
        }
        return;
      }

      if (other.tags.has('player_projectile')) {
        if (!canPlayerHitEnemy(playerEntity, entity, grid, other)) return;

        const health = entity.require(HealthComponent);
        const dmg = other.get(DamageComponent);
        health.takeDamage(dmg?.damage ?? BULLET_DAMAGE);
        SoundManager.getInstance().play('skeleton_hit');

        const projectile = other.get(ProjectileComponent);
        if (projectile) {
          const len = Math.hypot(projectile.dirX, projectile.dirY);
          const knockback = entity.get(KnockbackComponent);
          if (knockback) knockback.applyKnockback(projectile.dirX / len, projectile.dirY / len, SKELETON_KNOCKBACK_FORCE_PX);
        }

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) hitFlash.flash(HIT_DURATION_MS);

        const sm = entity.require(StateMachineComponent);
        if (health.getHealth() <= 0) {
          sm.stateMachine.enter('death');
        } else {
          sm.stateMachine.enter('hit');
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
    death: new RedSkeletonDeathState(entity, scene, difficulty, onSpawnMiniSkeletons),
    fear: new EnemyFearState(entity, config.speedPxPerSec, (dir) => {
      sprite.sprite.play(`skeleton_walk_${Direction[dir].toLowerCase()}`);
    })
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
