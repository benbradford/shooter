import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import type { Grid } from '../../../systems/grid/Grid';
import { DEPTH_ENEMY_FLYING, DEPTH_PARTICLE } from '../../../constants/DepthConstants';

const BULLET_MAX_DISTANCE_PX = 800;
const BULLET_DAMAGE = 10;
const BULLET_SCALE = 1.125;
const BULLET_COLLISION_BOX = { offsetX: -2, offsetY: -2, width: 4, height: 4 };

export type CreateBulletDudeBulletProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  grid: Grid;
  layer?: number;
}

export function createBulletDudeBulletEntity(props: CreateBulletDudeBulletProps): Entity {
  const { scene, x, y, dirX, dirY, speed, grid, layer = 0 } = props;
  const entity = new Entity('bulletdude_bullet');
  entity.tags.add('enemy_projectile');

  const rotation = Math.atan2(dirY, dirX) + Math.PI / 2;

  const transform = entity.add(new TransformComponent(x, y, rotation, BULLET_SCALE));
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default', transform));
  sprite.sprite.setDepth(DEPTH_ENEMY_FLYING);

  entity.add(new ProjectileComponent({
    dirX,
    dirY,
    speed,
    maxDistance: BULLET_MAX_DISTANCE_PX,
    grid,
    startLayer: layer,
    fromTransition: false,
    scene,
    onWallHit: (x, y) => {
      const emitter = scene.add.particles(x, y, 'smoke', {
        speed: { min: 300, max: 500 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 100,
        quantity: 10,
        tint: [0xffff00, 0xff5500],
        blendMode: 'ADD'
      });
      emitter.setDepth(DEPTH_PARTICLE);
      scene.time.delayedCall(300, () => emitter.destroy());
    }
  }));

  entity.add(new DamageComponent(BULLET_DAMAGE));

  entity.add(new CollisionComponent({
    box: BULLET_COLLISION_BOX,
    collidesWith: ['player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        scene.time.delayedCall(0, () => entity.destroy());
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
