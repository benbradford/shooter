import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { ShadowComponent } from '../ecs/components/core/ShadowComponent';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { CollisionComponent } from '../ecs/components/combat/CollisionComponent';
import { DamageComponent } from '../ecs/components/core/DamageComponent';
import { HitFlashComponent } from '../ecs/components/visual/HitFlashComponent';
import { KnockbackComponent } from '../ecs/components/movement/KnockbackComponent';
import { BugHopComponent } from '../ecs/components/movement/BugHopComponent';
import { BugBurstComponent } from '../ecs/components/visual/BugBurstComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { ProjectileComponent } from '../ecs/components/combat/ProjectileComponent';
import { StateMachine } from '../utils/state/StateMachine';
import { BugChaseState } from './BugChaseState';
import { BugAttackState } from './BugAttackState';
import type { Grid } from '../utils/Grid';

const BUG_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 32, height: 32 };
const KNOCKBACK_FRICTION = 0.85;
const KNOCKBACK_DURATION_MS = 300;
const BUG_DAMAGE = 10;

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

  const transform = entity.add(new TransformComponent(x, y, 0, 2));

  const sprite = entity.add(new SpriteComponent(scene, 'bug', transform));
  sprite.sprite.setScale(2);
  sprite.sprite.setDepth(10);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1.5, offsetX: 0, offsetY: 10 }));
  shadow.init();

  entity.add(new GridPositionComponent(col, row, BUG_COLLISION_BOX));

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
    box: BUG_COLLISION_BOX,
    collidesWith: ['player_projectile', 'player'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        bugHealth.takeDamage(10);

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(300);
        }

        const projectile = other.require(ProjectileComponent);
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
    KnockbackComponent,
    BugHopComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
