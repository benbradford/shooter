import { Entity } from '../../Entity';
import { DEPTH_PARTICLE } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import type { Grid } from '../../../systems/grid/Grid';
import { BULLET_DISPLAY_SIZE } from './ProjectileConfig';

const BULLET_DAMAGE = 10;
const BULLET_COLLISION_BOX = { offsetX: -2, offsetY: -2, width: 4, height: 4 };
export type CreateBulletProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  grid: Grid;
  layer?: number;
  fromTransition?: boolean;
}

export function createBulletEntity(props: CreateBulletProps): Entity {
  const { scene, x, y, dirX, dirY, grid, layer = 0, fromTransition = false } = props;
  const entity = new Entity('bullet');
  entity.tags.add('player_projectile');

  // Calculate rotation from direction (add 90 degrees since bullet texture is vertical)
  const rotation = Math.atan2(dirY, dirX) + Math.PI / 2;

  const transform = entity.add(new TransformComponent(x, y, rotation, BULLET_DISPLAY_SIZE / 16));
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default', transform));
  sprite.sprite.setDisplaySize(16, 16); // Base size, scaled by transform

  entity.add(new ProjectileComponent({
    dirX,
    dirY,
    speed: 800,
    maxDistance: 500,
    grid,
    startLayer: layer,
    fromTransition,
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

  entity.add(new CollisionComponent({
    box: BULLET_COLLISION_BOX,
    collidesWith: ['enemy'],
    onHit: (other) => {
      if (other.tags.has('enemy')) {
        const health = other.require(HealthComponent);
        health.takeDamage(BULLET_DAMAGE);

        const stateMachine = other.get(StateMachineComponent);
        if (stateMachine?.stateMachine.hasState('hit')) {
          stateMachine.stateMachine.enter('hit');
        }

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
