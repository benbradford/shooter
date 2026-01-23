import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { ProjectileComponent } from '../ecs/components/ProjectileComponent';
import { CollisionComponent } from '../ecs/components/CollisionComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import type { Grid } from '../utils/Grid';

const BULLET_DAMAGE = 10;
const BULLET_COLLISION_BOX = { offsetX: -2, offsetY: -2, width: 4, height: 4 };

export function createBulletEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  grid: Grid,
  layer: number = 0,
  fromTransition: boolean = false
): Entity {
  const entity = new Entity('bullet');
  entity.tags.add('player_projectile');
  
  // Calculate rotation from direction (add 90 degrees since bullet texture is vertical)
  const rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
  
  const transform = entity.add(new TransformComponent(x, y, rotation, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default', transform));
  sprite.sprite.setDisplaySize(16, 16);
  
  entity.add(new ProjectileComponent({
    dirX,
    dirY,
    speed: 800,
    maxDistance: 700,
    grid,
    blockedByWalls: true,
    startLayer: layer,
    fromTransition
  }));

  entity.add(new CollisionComponent({
    box: BULLET_COLLISION_BOX,
    collidesWith: ['enemy'],
    onHit: (other) => {
      if (other.tags.has('enemy')) {
        const health = other.get(HealthComponent);
        if (health) {
          health.takeDamage(BULLET_DAMAGE);
        }
        const stateMachine = other.get(StateMachineComponent);
        if (stateMachine) {
          stateMachine.stateMachine.enter('hit');
        }
        entity.destroy();
      }
    }
  }));
  
  entity.setUpdateOrder([
    TransformComponent,
    ProjectileComponent,
    CollisionComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
