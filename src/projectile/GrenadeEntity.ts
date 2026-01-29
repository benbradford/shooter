import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { CollisionComponent } from '../ecs/components/combat/CollisionComponent';
import { DamageComponent } from '../ecs/components/combat/DamageComponent';
import { ShadowComponent } from '../ecs/components/visual/ShadowComponent';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import type { Component } from '../ecs/Component';

const GRENADE_DAMAGE = 25;
const GRENADE_SPEED_PX_PER_SEC = 300;
const GRENADE_ARC_HEIGHT_PX = 80;
const GRENADE_SCALE_MIN = 0.5;
const GRENADE_SCALE_MAX = 1.5;

class GrenadeArcComponent implements Component {
  entity!: Entity;
  private distanceTraveledPx: number = 0;
  private readonly totalDistancePx: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly dirX: number,
    private readonly dirY: number,
    maxDistancePx: number
  ) {
    this.totalDistancePx = maxDistancePx;
  }

  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);
    const shadow = this.entity.get(ShadowComponent);

    const moveDistancePx = GRENADE_SPEED_PX_PER_SEC * (delta / 1000);
    transform.x += this.dirX * moveDistancePx;
    transform.y += this.dirY * moveDistancePx;
    this.distanceTraveledPx += moveDistancePx;

    const progress = this.distanceTraveledPx / this.totalDistancePx;
    const arcHeight = Math.sin(progress * Math.PI) * GRENADE_ARC_HEIGHT_PX;
    const scale = GRENADE_SCALE_MIN + (GRENADE_SCALE_MAX - GRENADE_SCALE_MIN) * Math.sin(progress * Math.PI);

    sprite.sprite.setScale(scale);
    sprite.sprite.y = transform.y - arcHeight;

    if (shadow) {
      shadow.shadow.setScale(scale * 0.8);
    }

    if (this.distanceTraveledPx >= this.totalDistancePx) {
      this.explode();
    }
  }

  private explode(): void {
    const transform = this.entity.require(TransformComponent);
    
    const emitter = this.scene.add.particles(transform.x, transform.y, 'fire', {
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xff8800, 0xff0000],
      lifespan: 400,
      frequency: 5,
      blendMode: 'ADD'
    });

    emitter.setDepth(1000);
    this.scene.time.delayedCall(80, () => emitter.stop());
    this.scene.time.delayedCall(480, () => emitter.destroy());

    this.scene.time.delayedCall(0, () => this.entity.destroy());
  }
}

export type CreateGrenadeProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  maxDistancePx: number;
}

export function createGrenadeEntity(props: CreateGrenadeProps): Entity {
  const { scene, x, y, dirX, dirY, maxDistancePx } = props;
  
  const entity = new Entity('grenade');
  entity.tags.add('enemy_projectile');

  const transform = entity.add(new TransformComponent(x, y, 0, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'grenade', transform));
  sprite.sprite.setDepth(100);

  const shadow = entity.add(new ShadowComponent(scene, {
    scale: 0.8,
    offsetX: 0,
    offsetY: 30
  }));
  shadow.init();

  entity.add(new DamageComponent(GRENADE_DAMAGE));
  entity.add(new GrenadeArcComponent(scene, dirX, dirY, maxDistancePx));

  entity.add(new CollisionComponent({
    box: { offsetX: -8, offsetY: -8, width: 16, height: 16 },
    collidesWith: ['player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        const health = other.get(HealthComponent);
        const damage = entity.require(DamageComponent);
        if (health) {
          health.takeDamage(damage.damage);
        }

        const transform = entity.require(TransformComponent);
        const emitter = scene.add.particles(transform.x, transform.y, 'fire', {
          speed: { min: 50, max: 100 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.4, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: [0xffffff, 0xff8800, 0xff0000],
          lifespan: 400,
          frequency: 5,
          blendMode: 'ADD'
        });

        emitter.setDepth(1000);
        scene.time.delayedCall(80, () => emitter.stop());
        scene.time.delayedCall(480, () => emitter.destroy());

        scene.time.delayedCall(0, () => entity.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    GrenadeArcComponent,
    CollisionComponent
  ]);

  return entity;
}
