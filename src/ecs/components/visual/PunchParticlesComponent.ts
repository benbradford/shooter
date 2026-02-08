import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { Direction } from '../../../constants/Direction';
import { TransformComponent } from '../core/TransformComponent';

const PARTICLE_SPEED_MIN = 100;
const PARTICLE_SPEED_MAX = 220;
const PARTICLE_LIFESPAN_MS = 300;
const PARTICLE_COUNT = 20;
const PARTICLE_START_SIZE = 0.05;

export class PunchParticlesComponent implements Component {
  entity!: Entity;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly playerEntity: Entity;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    direction: Direction,
    playerEntity: Entity
  ) {
    this.playerEntity = playerEntity;
    const angle = Math.atan2(dirY, dirX) * 180 / Math.PI;
    const startX = x - dirX * 30;
    const startY = y - dirY * 30;

    const facingUp = direction === Direction.UpLeft ||
                     direction === Direction.Up ||
                     direction === Direction.UpRight;

    this.emitter = scene.add.particles(startX, startY, 'fire', {
      speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_SPEED_MAX },
      angle: { min: angle - 30, max: angle + 30 },
      scale: { start: PARTICLE_START_SIZE, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffffff,
      lifespan: PARTICLE_LIFESPAN_MS,
      blendMode: 'ADD'
    });

    this.emitter.setDepth(facingUp ? -1 : 2000);
    this.emitter.setScrollFactor(1);
    this.emitter.explode(PARTICLE_COUNT);

    scene.time.delayedCall(PARTICLE_LIFESPAN_MS, () => {
      this.emitter.destroy();
      this.entity.destroy();
    });
  }

  update(_delta: number): void {
    const transform = this.playerEntity.get(TransformComponent);
    if (transform) {
      this.emitter.setPosition(transform.x, transform.y);
    }
  }

  onDestroy(): void {
    if (this.emitter) {
      this.emitter.destroy();
    }
  }
}
