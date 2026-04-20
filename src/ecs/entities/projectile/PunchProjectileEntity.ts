import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { PunchHitboxComponent } from '../../components/combat/PunchHitboxComponent';

export type CreatePunchProjectileProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  playerEntity: Entity;
  damage: number;
  hitboxOverride?: { offsetX: number; offsetY: number; width: number; height: number };
}

export function createPunchProjectileEntity(props: CreatePunchProjectileProps): Entity {
  const { scene, x, y, dirX, dirY, playerEntity, damage, hitboxOverride } = props;
  const entity = new Entity(`punch_${Date.now()}`);

  entity.tags.add('player_projectile');

  entity.add(new TransformComponent(x, y, 0, 1));

  entity.add(new PunchHitboxComponent({
    playerEntity,
    dirX,
    dirY
  }));

  entity.add(new DamageComponent(damage));

  const box = hitboxOverride ?? { offsetX: -22, offsetY: -22, width: 44, height: 44 };
  entity.add(new CollisionComponent({
    box,
    collidesWith: ['enemy'],
    onHit: () => {
      scene.time.delayedCall(0, () => entity.destroy());
    }
  }));

  entity.setUpdateOrder([
    PunchHitboxComponent,
    TransformComponent,
    CollisionComponent,
  ]);

  return entity;
}
