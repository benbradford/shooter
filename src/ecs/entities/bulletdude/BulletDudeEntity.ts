import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { PunchHitboxComponent } from '../../components/combat/PunchHitboxComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { LineOfSightComponent } from '../../components/combat/LineOfSightComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { BulletDudeGuardState } from './BulletDudeGuardState';
import { BulletDudeAlertState } from './BulletDudeAlertState';
import { BulletDudeShootingState } from './BulletDudeShootingState';
import { BulletDudeOverheatedState } from './BulletDudeOverheatedState';
import { BulletDudeStunnedState } from './BulletDudeStunnedState';
import { BulletDudeDyingState } from './BulletDudeDyingState';
import { getBulletDudeDifficultyConfig, type BulletDudeDifficulty } from './BulletDudeDifficulty';
import { createBulletDudeAnimations } from './BulletDudeAnimations';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import type { Grid } from '../../../systems/grid/Grid';

const BULLET_DUDE_SCALE = 1.5;
const BULLET_DUDE_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 26, width: 32, height: 16 };
const BULLET_DUDE_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: -25, width: 32, height: 50 };
const BULLET_DUDE_SHADOW_PROPS = { scale: 1.2, offsetX: -5, offsetY: 33 };
const MELEE_DAMAGE = 10;
const KNOCKBACK_FRICTION = 0.85;
const KNOCKBACK_DURATION_MS = 300;

export type CreateBulletDudeProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  difficulty: BulletDudeDifficulty;
  entityManager: import('../../EntityManager').EntityManager;
  entityId: string;
}

export function createBulletDudeEntity(props: CreateBulletDudeProps): Entity {
  const { scene, col, row, grid, playerEntity, difficulty, entityManager, entityId } = props;
  const config = getBulletDudeDifficultyConfig(difficulty);

  createBulletDudeAnimations(scene);

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const entity = new Entity(entityId);
  entity.tags.add('enemy');

  const transform = entity.add(new TransformComponent(x, y, 0, BULLET_DUDE_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'bullet_dude_sprite', transform));
  sprite.sprite.setDepth(Depth.enemyFlying);

  const shadow = entity.add(new ShadowComponent(scene, BULLET_DUDE_SHADOW_PROPS));
  shadow.init();

  entity.add(new GridPositionComponent(col, row, BULLET_DUDE_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new KnockbackComponent(KNOCKBACK_FRICTION, KNOCKBACK_DURATION_MS, grid));
  entity.add(new DifficultyComponent(difficulty));
  entity.add(new HealthComponent({ maxHealth: config.health }));
  entity.add(new HitFlashComponent());

  let lastHitDirX = 0;
  let lastHitDirY = -1;

  entity.add(new LineOfSightComponent({
    range: config.lookDistance,
    grid,
    fieldOfView: Math.PI / 3
  }));

  entity.add(new CollisionComponent({
    box: BULLET_DUDE_ENTITY_COLLISION_BOX,
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
        health.takeDamage(MELEE_DAMAGE);

        const projectile = other.get(ProjectileComponent);
        const punchHitbox = other.get(PunchHitboxComponent);

        if (projectile) {
          const length = Math.hypot(projectile.dirX, projectile.dirY);
          lastHitDirX = projectile.dirX / length;
          lastHitDirY = projectile.dirY / length;
        } else if (punchHitbox) {
          const length = Math.hypot(punchHitbox.dirX, punchHitbox.dirY);
          lastHitDirX = punchHitbox.dirX / length;
          lastHitDirY = punchHitbox.dirY / length;
        }

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(config.stunTime);
        }

        const stateMachine = entity.require(StateMachineComponent);
        const currentState = (stateMachine.stateMachine as unknown as { currentKey?: string }).currentKey;

        if (health.getHealth() <= 0) {
          if (currentState !== 'dying') {
            (stateMachine.stateMachine as StateMachine<void | { hitDirX: number; hitDirY: number }>).enter('dying', { hitDirX: lastHitDirX, hitDirY: lastHitDirY });
          }
        } else if (currentState === 'stunned') {
          const stunnedState = (stateMachine.stateMachine as unknown as { currentState?: { onEnter?: (props: { data: { hitDirX: number; hitDirY: number } }) => void } }).currentState;
          stunnedState?.onEnter?.({ data: { hitDirX: lastHitDirX, hitDirY: lastHitDirY } });
        } else {
          (stateMachine.stateMachine as StateMachine<void | { hitDirX: number; hitDirY: number }>).enter('stunned', { hitDirX: lastHitDirX, hitDirY: lastHitDirY });
        }
      }
    }
  }));

  const stateMachine = new StateMachine<void | { hitDirX: number; hitDirY: number }>({
    guard: new BulletDudeGuardState(entity, playerEntity, grid),
    alert: new BulletDudeAlertState(entity, playerEntity, scene),
    shooting: new BulletDudeShootingState(entity, playerEntity, scene, entityManager),
    overheated: new BulletDudeOverheatedState(entity, playerEntity, scene, grid),
    stunned: new BulletDudeStunnedState(entity),
    dying: new BulletDudeDyingState(entity, scene)
  }, 'guard');

  entity.add(new StateMachineComponent(stateMachine));

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    KnockbackComponent,
    GridPositionComponent,
    GridCollisionComponent,
    LineOfSightComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
