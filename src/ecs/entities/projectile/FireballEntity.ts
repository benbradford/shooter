import { Entity } from '../../Entity';
import { DEPTH_PARTICLE } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { AnimatedSpriteComponent } from '../../components/core/AnimatedSpriteComponent';
import { PulsingScaleComponent } from '../../components/visual/PulsingScaleComponent';
import { ParticleTrailComponent } from '../../components/visual/ParticleTrailComponent';
import { ShadowComponent } from '../../components/core/ShadowComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import type { Grid } from '../../../systems/grid/Grid';

import { SPRITE_SCALE } from '../../../constants/GameConstants';

const FIREBALL_SCALE = 1 * SPRITE_SCALE;
const FIREBALL_DAMAGE = 10;
const FIREBALL_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 32, height: 32 };
const FIREBALL_ANIMATION_FRAMES = [0, 1, 2];
const FIREBALL_ANIMATION_FPS = 10;
const FIREBALL_SCALE_AMPLITUDE = 0.1;
const FIREBALL_SCALE_FREQUENCY = 4;

function createFireballBurst(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add.particles(x, y, 'fire', {
    speed: { min: 80, max: 150 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.05, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xffffff, 0xff8800, 0xff0000],
    lifespan: 400,
    frequency: 3,
    blendMode: 'ADD'
  });

  emitter.setDepth(DEPTH_PARTICLE);
  scene.time.delayedCall(100, () => emitter.stop());
  scene.time.delayedCall(500, () => emitter.destroy());
}

export type CreateFireballProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  grid: Grid;
  startLayer: number;
}

export function createFireballEntity(props: CreateFireballProps): Entity {
  const { scene, x, y, dirX, dirY, speed, maxDistance, grid, startLayer } = props;
  const entity = new Entity('fireball');
  entity.tags.add('enemy_projectile');

  const transform = entity.add(new TransformComponent(x, y, 0, FIREBALL_SCALE));

  entity.add(new SpriteComponent(scene, 'fireball', transform));

  entity.add(new ProjectileComponent({
    dirX,
    dirY,
    speed,
    maxDistance,
    grid,
    startLayer,
    fromTransition: false,
    scene,
    onWallHit: (x, y) => createFireballBurst(scene, x, y),
    onMaxDistance: (x, y) => createFireballBurst(scene, x, y)
  }));

  entity.add(new AnimatedSpriteComponent({
    frames: FIREBALL_ANIMATION_FRAMES,
    frameRate: FIREBALL_ANIMATION_FPS
  }));

  entity.add(new PulsingScaleComponent({
    baseScale: FIREBALL_SCALE,
    amplitude: FIREBALL_SCALE_AMPLITUDE,
    frequency: FIREBALL_SCALE_FREQUENCY
  }));

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1.4, offsetX: 0, offsetY: 50 }));
  shadow.init();

  const particles = entity.add(new ParticleTrailComponent({
    scene,
    texture: 'fire',
    speedMin: 20,
    speedMax: 60,
    lifetime: 1000,
    emitFrequency: 50,
    burstCount: 3,
    scaleStart: 0.03,
    scaleEnd: 0
  }));
  particles.init();

  entity.add(new DamageComponent(FIREBALL_DAMAGE));

  entity.add(new CollisionComponent({
    box: FIREBALL_COLLISION_BOX,
    collidesWith: ['player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        const health = other.require(HealthComponent);
        const damage = entity.require(DamageComponent);
        health.takeDamage(damage.damage);

        const transform = entity.require(TransformComponent);
        createFireballBurst(scene, transform.x, transform.y);

        scene.time.delayedCall(0, () => entity.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    ProjectileComponent,
    AnimatedSpriteComponent,
    PulsingScaleComponent,
    ShadowComponent,
    ParticleTrailComponent,
    CollisionComponent,
    SpriteComponent
  ]);

  return entity;
}
