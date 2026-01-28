import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';

export type ParticleTrailComponentProps = {
  scene: Phaser.Scene;
  texture: string;
  speedMin: number;
  speedMax: number;
  lifetime: number;
  emitFrequency: number;
  burstCount: number;
  scaleStart: number;
  scaleEnd: number;
}

export class ParticleTrailComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly emitFrequency: number;
  private readonly burstCount: number;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private particleTimer: number = 0;

  constructor(props: ParticleTrailComponentProps) {
    this.scene = props.scene;
    this.emitFrequency = props.emitFrequency;
    this.burstCount = props.burstCount;

    const transform = this.entity?.get(TransformComponent);
    if (transform) {
      this.particles = this.scene.add.particles(transform.x, transform.y, props.texture, {
        speed: { min: props.speedMin, max: props.speedMax },
        angle: { min: 0, max: 360 },
        scale: { start: props.scaleStart, end: props.scaleEnd },
        alpha: { start: 1, end: 0 },
        lifespan: props.lifetime,
        frequency: -1,
        blendMode: 'ADD'
      });
    }
  }

  init(): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.get(SpriteComponent);

    this.particles ??= this.scene.add.particles(transform.x, transform.y, 'fire', {
      speed: { min: 20, max: 60 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.03, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      frequency: -1,
      blendMode: 'ADD'
    });

    if (sprite) {
      this.particles.setDepth(sprite.sprite.depth);
    }
  }

  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    if (!this.particles) return;

    this.particles.setPosition(transform.x, transform.y);

    this.particleTimer += delta;
    if (this.particleTimer >= this.emitFrequency) {
      this.particles.explode(this.burstCount);
      this.particleTimer = 0;
    }
  }

  onDestroy(): void {
    if (this.particles) {
      this.particles.destroy();
      this.particles = null;
    }
  }
}
