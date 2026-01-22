import Phaser from 'phaser';
import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';
import { SpriteComponent } from './SpriteComponent';
import { HealthComponent } from './HealthComponent';
import type { Grid } from '../../utils/Grid';

// Fireball configuration constants
const FIREBALL_DAMAGE = 10;
const FIREBALL_ANIMATION_FRAME_RATE = 10; // frames per second
const FIREBALL_SCALE_AMPLITUDE = 0.1; // 10% scale variation
const FIREBALL_SCALE_FREQUENCY = 4; // cycles per second
const FIREBALL_HIT_RADIUS = 32; // collision radius in pixels
const PARTICLE_LIFETIME_MS = 1000; // 1 second
const PARTICLE_SPEED_MIN = 20;
const PARTICLE_SPEED_MAX = 60;
const PARTICLE_EMIT_FREQUENCY = 50; // milliseconds between particle bursts
const PARTICLE_SCALE_START = 0.03;
const PARTICLE_SCALE_END = 0;

export class FireballComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly dirX: number;
  private readonly dirY: number;
  private readonly speed: number;
  private readonly maxDistance: number;
  private readonly playerEntity: Entity;
  private readonly grid: Grid;
  private distanceTraveled: number = 0;
  private baseScale: number = 3;
  private scaleTimer: number = 0;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private readonly animationFrames: number[] = [0, 1, 2];
  private currentFrameIndex: number = 0;
  private animationTimer: number = 0;
  private animationDirection: number = 1; // 1 = forward, -1 = backward
  private particleTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    dirX: number,
    dirY: number,
    speed: number,
    maxDistance: number,
    playerEntity: Entity,
    grid: Grid
  ) {
    this.scene = scene;
    this.dirX = dirX;
    this.dirY = dirY;
    this.speed = speed;
    this.maxDistance = maxDistance;
    this.playerEntity = playerEntity;
    this.grid = grid;
  }

  init(): void {
    const transform = this.entity.get(TransformComponent);
    const sprite = this.entity.get(SpriteComponent);
    if (!transform || !sprite) return;

    this.baseScale = transform.scale;

    // Create particle emitter
    this.particles = this.scene.add.particles(transform.x, transform.y, 'fire', {
      speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_SPEED_MAX },
      angle: { min: 0, max: 360 },
      scale: { start: PARTICLE_SCALE_START, end: PARTICLE_SCALE_END },
      alpha: { start: 1, end: 0 },
      lifespan: PARTICLE_LIFETIME_MS,
      frequency: -1, // Manual emission
      blendMode: 'ADD'
    });
    this.particles.setDepth(sprite.sprite.depth);
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent);
    const sprite = this.entity.get(SpriteComponent);
    if (!transform || !sprite) return;

    // Move fireball
    const deltaSeconds = delta / 1000;
    const moveX = this.dirX * this.speed * deltaSeconds;
    const moveY = this.dirY * this.speed * deltaSeconds;
    transform.x += moveX;
    transform.y += moveY;
    this.distanceTraveled += Math.hypot(moveX, moveY);

    // Update particle position
    if (this.particles) {
      this.particles.setPosition(transform.x, transform.y);

      // Emit particles periodically
      this.particleTimer += delta;
      if (this.particleTimer >= PARTICLE_EMIT_FREQUENCY) {
        this.particles.explode(3);
        this.particleTimer = 0;
      }
    }

    // Animate sprite (pingpong)
    this.animationTimer += delta;
    const frameDuration = 1000 / FIREBALL_ANIMATION_FRAME_RATE;
    if (this.animationTimer >= frameDuration) {
      this.animationTimer = 0;
      this.currentFrameIndex += this.animationDirection;

      // Reverse direction at ends
      if (this.currentFrameIndex >= this.animationFrames.length - 1) {
        this.currentFrameIndex = this.animationFrames.length - 1;
        this.animationDirection = -1;
      } else if (this.currentFrameIndex <= 0) {
        this.currentFrameIndex = 0;
        this.animationDirection = 1;
      }

      sprite.sprite.setFrame(this.animationFrames[this.currentFrameIndex]);
    }

    // Scale pulsing (sine wave)
    this.scaleTimer += delta;
    const scalePhase = (this.scaleTimer / 1000) * FIREBALL_SCALE_FREQUENCY * Math.PI * 2;
    const scaleFactor = 1 + Math.sin(scalePhase) * FIREBALL_SCALE_AMPLITUDE;
    transform.scale = this.baseScale * scaleFactor;

    // Check collision with player
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (playerTransform) {
      const distance = Math.hypot(
        playerTransform.x - transform.x,
        playerTransform.y - transform.y
      );

      if (distance <= FIREBALL_HIT_RADIUS) {
        const playerHealth = this.playerEntity.get(HealthComponent);
        if (playerHealth) {
          playerHealth.takeDamage(FIREBALL_DAMAGE);
        }
        this.entity.destroy();
        return;
      }
    }

    // Check max distance
    if (this.distanceTraveled >= this.maxDistance) {
      this.entity.destroy();
    }
  }

  onDestroy(): void {
    if (this.particles) {
      this.particles.destroy();
      this.particles = null;
    }
  }
}
