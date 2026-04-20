import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { Direction } from '../../../constants/Direction';
import { TransformComponent } from '../core/TransformComponent';

const PARTICLE_COUNT = 35;
const PARTICLE_SPEED_MIN = 150;
const PARTICLE_SPEED_MAX = 350;
const PARTICLE_LIFESPAN_MS = 500;
const PARTICLE_START_SIZE = 0.04;
const PARTICLE_OFFSET_X = 20;
const PARTICLE_OFFSET_Y = 14;

export class SuperPunchParticlesComponent implements Component {
  entity!: Entity;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly burstEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly playerEntity: Entity;
  private readonly offsetX: number;
  private readonly offsetY: number;

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
    this.offsetX = dirX * PARTICLE_OFFSET_X;
    this.offsetY = dirY * PARTICLE_OFFSET_Y;

    const angle = Math.atan2(dirY, dirX) * 180 / Math.PI;
    const startX = x + this.offsetX;
    const startY = y + this.offsetY;

    const facingUp = direction === Direction.UpLeft ||
                     direction === Direction.Up ||
                     direction === Direction.UpRight;
    const depth = facingUp ? -1 : 2000;

    // Main directional burst — larger, faster, more particles
    this.emitter = scene.add.particles(startX, startY, 'fire', {
      speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_SPEED_MAX },
      angle: { min: angle - 40, max: angle + 40 },
      scale: { start: PARTICLE_START_SIZE, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xffff88, 0xffaa44],
      lifespan: PARTICLE_LIFESPAN_MS,
      blendMode: 'ADD'
    });
    this.emitter.setDepth(depth);
    this.emitter.setScrollFactor(1);
    this.emitter.explode(PARTICLE_COUNT);

    // Secondary radial burst — ring of particles expanding outward
    this.burstEmitter = scene.add.particles(startX, startY, 'fire', {
      speed: { min: 80, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.03, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: [0xffdd66, 0xffffff],
      lifespan: 400,
      blendMode: 'ADD'
    });
    this.burstEmitter.setDepth(depth);
    this.burstEmitter.setScrollFactor(1);
    this.burstEmitter.explode(12);

    scene.time.delayedCall(PARTICLE_LIFESPAN_MS, () => {
      this.emitter.destroy();
      this.burstEmitter.destroy();
      this.entity.destroy();
    });
  }

  update(_delta: number): void {
    const transform = this.playerEntity.get(TransformComponent);
    if (transform) {
      this.emitter.setPosition(transform.x + this.offsetX, transform.y + this.offsetY);
      this.burstEmitter.setPosition(transform.x + this.offsetX, transform.y + this.offsetY);
    }
  }

  onDestroy(): void {
    if (this.emitter) this.emitter.destroy();
    if (this.burstEmitter) this.burstEmitter.destroy();
  }
}
