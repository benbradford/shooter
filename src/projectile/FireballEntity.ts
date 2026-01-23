import Phaser from 'phaser';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { FireballComponent, FIREBALL_DAMAGE, FIREBALL_COLLISION_BOX } from '../ecs/components/FireballComponent';
import { CollisionComponent } from '../ecs/components/CollisionComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { DamageComponent } from '../ecs/components/DamageComponent';

const FIREBALL_SCALE = 1;

export function createFireballEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  speed: number,
  maxDistance: number
): Entity {
  const entity = new Entity('fireball');
  entity.tags.add('enemy_projectile');

  const transform = entity.add(new TransformComponent(x, y, 0, FIREBALL_SCALE));

  entity.add(new SpriteComponent(scene, 'fireball', transform));

  const fireballComp = entity.add(new FireballComponent(scene, dirX, dirY, speed, maxDistance));
  fireballComp.init();

  entity.add(new DamageComponent(FIREBALL_DAMAGE));

  entity.add(new CollisionComponent({
    box: FIREBALL_COLLISION_BOX,
    collidesWith: ['player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        const health = other.get(HealthComponent);
        const damage = entity.get(DamageComponent);
        if (health && damage) {
          health.takeDamage(damage.damage);
        }
        entity.destroy();
      }
    }
  }));

  return entity;
}
