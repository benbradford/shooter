import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { WalkComponent } from '../movement/WalkComponent';
import type { AmmoComponent } from '../combat/AmmoComponent';
import type { EmitterOffset } from '../combat/ProjectileEmitterComponent';
import { Direction } from '../../../constants/Direction';

export class OverheatSmokeComponent implements Component {
  entity!: Entity;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ammoComponent: AmmoComponent,
    private readonly offsets: Record<Direction, EmitterOffset>
  ) {}

  init(): void {

    // Create particle emitter with more visible settings
    this.particles = this.scene.add.particles(0, 0, 'smoke', {
      speed: { min: 50, max: 100 },
      angle: { min: 250, max: 290 },
      scale: { start: 6, end: 0 }, // Much larger (50% bigger than before)
      alpha: { start: 1, end: 0 }, // Fully opaque at start
      lifespan: 1000,
      frequency: 50, // More frequent
      quantity: 2, // More particles per emission
      emitting: false,
      tint: 0xffffff,
    });
    this.particles.setDepth(1000); // Very high depth
  }

  update(_delta: number): void {
    const transform = this.entity.get(TransformComponent);
    const walk = this.entity.get(WalkComponent);
    if (!transform || !walk) return;

    const direction = walk.lastDir;

    // Get gun barrel position
    const offset = this.offsets[direction];
    const emitX = transform.x + offset.x;
    const emitY = transform.y + offset.y;

    // Update particle system position
    this.particles.setPosition(emitX, emitY);

    // Sync particle emitting with overheat state
    this.particles.emitting = this.ammoComponent.isGunOverheated();
  }

  onDestroy(): void {
    this.particles.destroy();
  }
}
