import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { ProjectileComponent } from '../ecs/components/ProjectileComponent';
import type { Grid } from '../utils/Grid';

export function createBulletEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  grid: Grid
): Entity {
  const entity = new Entity('bullet');
  
  // Calculate rotation from direction (add 90 degrees since bullet texture is vertical)
  const rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
  
  const transform = entity.add(new TransformComponent(x, y, rotation, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default', transform));
  sprite.sprite.setDisplaySize(16, 16);
  
  const projectile = entity.add(new ProjectileComponent(dirX, dirY, 800, 700, grid, true));
  
  entity.setUpdateOrder([
    transform,
    projectile,
    sprite,
  ]);
  
  return entity;
}
