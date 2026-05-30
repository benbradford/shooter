import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
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
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { WormWanderState } from './WormWanderState';
import { WormSpitState } from './WormSpitState';
import { WormHitState } from './WormHitState';
import { WormDeathState } from './WormDeathState';
import { EnemyFearState } from '../common/EnemyFearState';
import { createWormAnimations, getWormAnimKey } from './WormAnimations';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import type { EnemyDifficulty } from '../../../constants/EnemyDifficulty';
import type { Grid } from '../../../systems/grid/Grid';
import type { EntityManager } from '../../EntityManager';

const WORM_SCALE = 1.4;
const WORM_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 10, width: 24, height: 14 };
const WORM_ENTITY_COLLISION_BOX = { offsetX: -12, offsetY: -12, width: 24, height: 24 };
const WORM_SHADOW_PROPS = { scale: 0.7, offsetX: 0, offsetY: 16 };
const KNOCKBACK_FRICTION = 0.85;
const KNOCKBACK_FORCE_PX = 300;
const HIT_DURATION_MS = 300;
const PUNCH_DAMAGE = 20;

const HEALTH_BY_DIFFICULTY: Record<string, number> = {
  easy: 20,
  medium: 40,
  hard: 60,
};

export type CreateWormProps = {
  scene: Phaser.Scene;
  grid: Grid;
  entityId: string;
  playerEntity: Entity;
  entityManager: EntityManager;
  col: number;
  row: number;
  difficulty: EnemyDifficulty;
  onSpit: (x: number, y: number, dirX: number, dirY: number) => void;
}

export function createWormEntity(props: CreateWormProps): Entity {
  const { scene, grid, entityId, playerEntity, col, row, difficulty, onSpit } = props;

  createWormAnimations(scene);

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;
  const health = HEALTH_BY_DIFFICULTY[difficulty] ?? 40;

  const entity = new Entity(entityId);
  entity.tags.add('enemy');

  const transform = entity.add(new TransformComponent(x, y, 0, WORM_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'worm', transform));
  sprite.sprite.setDepth(Depth.enemy);
  sprite.sprite.setFrame(2); // south idle

  const shadow = entity.add(new ShadowComponent(scene, WORM_SHADOW_PROPS));
  shadow.init();

  entity.add(new GridPositionComponent(col, row, WORM_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new DifficultyComponent(difficulty));
  entity.add(new HealthComponent({ maxHealth: health }));
  entity.add(new HitFlashComponent());
  entity.add(new KnockbackComponent(KNOCKBACK_FRICTION, HIT_DURATION_MS, grid));

  entity.add(new CollisionComponent({
    box: WORM_ENTITY_COLLISION_BOX,
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
          knockback.applyKnockback(dx / dist, dy / dist, 200);
        }
        return;
      }

      if (!other.tags.has('player_projectile')) return;
      if (!canPlayerHitEnemy(playerEntity, entity, grid, other)) return;

      const hp = entity.require(HealthComponent);
      const dmg = other.get(DamageComponent);
      hp.takeDamage(dmg?.damage ?? PUNCH_DAMAGE);

      const projectile = other.get(ProjectileComponent);
      if (projectile) {
        const len = Math.hypot(projectile.dirX, projectile.dirY);
        const dirX = projectile.dirX / len;
        const dirY = projectile.dirY / len;
        entity.require(KnockbackComponent).applyKnockback(dirX, dirY, KNOCKBACK_FORCE_PX);
      }

      entity.require(HitFlashComponent).flash(HIT_DURATION_MS);

      const sm = entity.require(StateMachineComponent).stateMachine;
      if (hp.getHealth() <= 0) {
        sm.enter('death');
      } else {
        sm.enter('hit');
      }
    }
  }));

  const stateMachine = new StateMachine({
    wander: new WormWanderState(entity, playerEntity, grid),
    spit: new WormSpitState(entity, playerEntity, onSpit),
    hit: new WormHitState(entity),
    death: new WormDeathState(entity, scene),
    fear: new EnemyFearState(entity, 40, (dir) => {
      sprite.sprite.play(getWormAnimKey('walk', dir));
    })
  }, 'wander');

  entity.add(new StateMachineComponent(stateMachine));

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    KnockbackComponent,
    GridPositionComponent,
    GridCollisionComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
