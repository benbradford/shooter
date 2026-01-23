import type { Entity } from '../Entity';
import type { Component } from '../Component';
import { TransformComponent } from './TransformComponent';

export class KnockbackComponent implements Component {
  entity!: Entity;
  velocityX: number;
  velocityY: number;
  friction: number;
  duration: number;
  elapsed: number;
  isActive: boolean;

  constructor(friction: number, duration: number) {
    this.velocityX = 0;
    this.velocityY = 0;
    this.friction = friction;
    this.duration = duration;
    this.elapsed = 0;
    this.isActive = false;
  }

  applyKnockback(dirX: number, dirY: number, force: number): void {
    // Ignore new knockback if already being knocked back
    if (this.isActive) {
      return;
    }

    this.velocityX = dirX * force;
    this.velocityY = dirY * force;
    this.elapsed = 0;
    this.isActive = true;
  }

  update(delta: number): void {
    if (!this.isActive || (this.velocityX === 0 && this.velocityY === 0)) {
      this.isActive = false;
      return;
    }

    this.elapsed += delta;

    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    // Apply velocity directly to transform
    transform.x += this.velocityX * (delta / 1000);
    transform.y += this.velocityY * (delta / 1000);

    // Apply friction per second (not per frame) for consistent behavior
    const frictionPerFrame = Math.pow(this.friction, delta / 1000);
    this.velocityX *= frictionPerFrame;
    this.velocityY *= frictionPerFrame;

    // Stop if too slow or duration exceeded
    if (Math.abs(this.velocityX) < 1 && Math.abs(this.velocityY) < 1 || this.elapsed >= this.duration) {
      this.velocityX = 0;
      this.velocityY = 0;
      this.isActive = false;
    }
  }

  onDestroy(): void {
    // Clean up
  }
}
