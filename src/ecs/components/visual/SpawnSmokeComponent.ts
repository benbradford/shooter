import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';

const SMOKE_DURATION_MS = 500;

export class SpawnSmokeComponent implements Component {
  entity!: Entity;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private elapsedMs: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    this.emitter = scene.add.particles(x, y, 'smoke', {
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 4.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xbbbbbb, 0x999999],
      lifespan: 1000,
      quantity: 60,
      blendMode: 'ADD'
    });
    this.emitter.setDepth(Depth.spawnSmoke);
    this.emitter.explode();
  }

  update(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= SMOKE_DURATION_MS) {
      this.emitter.stop();
    }
  }

  onDestroy(): void {
    this.emitter.destroy();
  }
}
