import Phaser from 'phaser';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { FireballComponent } from '../ecs/components/FireballComponent';
import type { Grid } from '../utils/Grid';

// Fireball configuration
const FIREBALL_SCALE = 1;

export function createFireballEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  speed: number,
  maxDistance: number,
  playerEntity: Entity,
  grid: Grid
): Entity {
  const entity = new Entity('fireball');

  // Transform
  const transform = entity.add(new TransformComponent(x, y, 0, FIREBALL_SCALE));

  // Sprite
  entity.add(new SpriteComponent(scene, 'fireball', transform));

  // Fireball behavior
  const fireballComp = entity.add(new FireballComponent(scene, dirX, dirY, speed, maxDistance, playerEntity, grid));
  fireballComp.init();

  return entity;
}
