import Phaser from 'phaser';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { ProjectileComponent } from '../ecs/components/ProjectileComponent';
import { AnimatedSpriteComponent } from '../ecs/components/AnimatedSpriteComponent';
import { PulsingScaleComponent } from '../ecs/components/PulsingScaleComponent';
import { ParticleTrailComponent } from '../ecs/components/ParticleTrailComponent';
import { ShadowComponent } from '../ecs/components/ShadowComponent';
import { CollisionComponent } from '../ecs/components/CollisionComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { DamageComponent } from '../ecs/components/DamageComponent';
import type { Grid } from '../utils/Grid';

const FIREBALL_SCALE = 1;
const FIREBALL_DAMAGE = 10;
const FIREBALL_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 32, height: 32 };
const FIREBALL_ANIMATION_FRAMES = [0, 1, 2];
const FIREBALL_ANIMATION_FPS = 10;
const FIREBALL_SCALE_AMPLITUDE = 0.1;
const FIREBALL_SCALE_FREQUENCY = 4;

export function createFireballEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  speed: number,
  maxDistance: number,
  grid: Grid,
  startLayer: number
): Entity {
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
    blockedByWalls: true,
    startLayer,
    fromTransition: false
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
        const health = other.get(HealthComponent);
        const damage = entity.get(DamageComponent);
        if (health && damage) {
          health.takeDamage(damage.damage);
        }
        entity.destroy();
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
