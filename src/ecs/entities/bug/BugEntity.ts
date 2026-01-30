import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ShadowComponent } from '../../components/core/ShadowComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { BugHopComponent } from '../../components/movement/BugHopComponent';
import { BugBurstComponent } from '../../components/visual/BugBurstComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { StateMachine } from '../../../utils/state/StateMachine';
import { BugChaseState } from './BugChaseState';
import { BugAttackState } from './BugAttackState';
import type { Grid } from '../../../utils/Grid';

const BUG_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 0, width: 16, height: 16 };
const BUG_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 42, height: 42 };
const KNOCKBACK_FRICTION = 0.85;
const KNOCKBACK_DURATION_MS = 300;
const BUG_DAMAGE = 10;

import { SPRITE_SCALE } from '../../../constants/GameConstants';

const BUG_SCALE = 2 * SPRITE_SCALE;

export type CreateBugProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  spawnCol: number;
  spawnRow: number;
  health: number;
  speed: number;
}

export function createBugEntity(props: CreateBugProps): Entity {
  const { scene, col, row, grid, playerEntity, spawnCol, spawnRow, health, speed } = props;
  const entity = new Entity('bug');
  entity.tags.add('enemy');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y, 0, BUG_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'bug', transform));
  sprite.sprite.setScale(BUG_SCALE);
  sprite.sprite.setDepth(10);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1.5, offsetX: 0, offsetY: 10 }));
  shadow.init();

  entity.add(new GridPositionComponent(col, row, BUG_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));

  const bugHealth = entity.add(new HealthComponent({ maxHealth: health }));
  entity.add(new HitFlashComponent(0x00ff00));
  entity.add(new KnockbackComponent(KNOCKBACK_FRICTION, KNOCKBACK_DURATION_MS));
  entity.add(new BugHopComponent());
  entity.add(new BugBurstComponent(scene));
  entity.add(new DamageComponent(10));

  const stateMachine = new StateMachine({
    chase: new BugChaseState(entity, playerEntity, grid, speed),
    attack: new BugAttackState(entity, playerEntity, scene)
  }, 'chase');
  entity.add(new StateMachineComponent(stateMachine));

  entity.add(new CollisionComponent({
    box: BUG_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile', 'player'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        bugHealth.takeDamage(10);

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(300);
        }

        const projectile = other.get(ProjectileComponent);
        if (!projectile) return;

        const dirX = projectile.dirX;
        const dirY = projectile.dirY;

        const knockback = entity.get(KnockbackComponent);
        if (knockback) {
          const length = Math.hypot(dirX, dirY);
          knockback.applyKnockback(dirX / length, dirY / length, 200);
        }

        if (bugHealth.getHealth() <= 0) {
          const burst = entity.get(BugBurstComponent);
          if (burst) {
            burst.burst();
          }
          scene.time.delayedCall(100, () => entity.destroy());
        }

        other.destroy();
      } else if (other.tags.has('player')) {
        entity.remove(CollisionComponent);

        const playerHealth = other.require(HealthComponent);
        playerHealth.takeDamage(BUG_DAMAGE);

        const burst = entity.get(BugBurstComponent);
        if (burst) {
          burst.burst();
        }
        entity.isDestroyed = true;
        scene.time.delayedCall(100, () => entity.destroy());
      }
    }
  }));

  const hop = entity.get(BugHopComponent);
  if (hop) {
    const spawnWorld = grid.cellToWorld(spawnCol, spawnRow);
    const targetX = spawnWorld.x + grid.cellSize / 2;
    const targetY = spawnWorld.y + grid.cellSize / 2;
    hop.hop(targetX, targetY, spawnCol, spawnRow);
  }

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    GridPositionComponent,
    BugHopComponent,
    GridCollisionComponent,
    KnockbackComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
