import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { WalkComponent } from '../movement/WalkComponent';
import type { AmmoComponent } from '../combat/AmmoComponent';
import type { EmitterOffset } from '../combat/ProjectileEmitterComponent';
import { Direction } from '../../../constants/Direction';

export class OverheatSmokeComponent implements Component {
  entity!: Entity;
  private smokeParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ammoComponent: AmmoComponent,
    private readonly offsets: Record<Direction, EmitterOffset>
  ) {}

  init(): void {
    this.smokeParticles = this.scene.add.particles(0, 0, 'smoke', {
      speed: { min: 50, max: 100 },
      angle: { min: 250, max: 290 },
      scale: { start: 6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      frequency: 50,
      quantity: 2,
      emitting: false,
      tint: 0xffffff,
    });
    this.smokeParticles.setDepth(1000);

    this.fireParticles = this.scene.add.particles(0, 0, 'fire', {
      speed: { min: 80, max: 150 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      frequency: 20,
      quantity: 3,
      emitting: false,
      tint: [0xffffff, 0xff8800, 0xff0000],
      blendMode: 'ADD' as unknown as number,
    });
    this.fireParticles.setDepth(1001);
  }

  update(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const walk = this.entity.require(WalkComponent);
    const direction = walk.lastDir;
    const offset = this.offsets[direction];
    const emitX = transform.x + offset.x;
    const emitY = transform.y + offset.y;

    this.smokeParticles.setPosition(emitX, emitY);
    this.fireParticles.setPosition(emitX, emitY);

    const facingUp = direction === Direction.UpLeft || direction === Direction.Up || direction === Direction.UpRight;
    const depth = facingUp ? -1 : 1000;
    this.smokeParticles.setDepth(depth);
    this.fireParticles.setDepth(depth + 1);

    const ammoRatio = this.ammoComponent.getRatio();
    
    if (ammoRatio >= 0.75) {
      this.smokeParticles.emitting = false;
      this.fireParticles.emitting = false;
    } else if (ammoRatio > 0) {
      const intensity = 1 - (ammoRatio / 0.75);
      this.smokeParticles.frequency = 50 / (1 + intensity * 3);
      this.smokeParticles.emitting = true;
      this.fireParticles.emitting = false;
    } else {
      this.smokeParticles.frequency = 10;
      this.smokeParticles.emitting = true;
      this.fireParticles.emitting = true;
    }
  }

  onDestroy(): void {
    this.smokeParticles.destroy();
    this.fireParticles.destroy();
  }
}
