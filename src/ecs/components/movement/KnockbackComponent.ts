import type { Entity } from '../../Entity';
import type { Component } from '../../Component';
import { TransformComponent } from '../core/TransformComponent';

export class KnockbackComponent implements Component {
  entity!: Entity;
  velocityX: number = 0;
  velocityY: number = 0;
  friction: number;
  duration: number;
  elapsed: number = 0;
  isActive: boolean = false;

  constructor(friction: number, duration: number) {
    this.friction = friction;
    this.duration = duration;
  }

  applyKnockback(dirX: number, dirY: number, force: number): void {
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

    const transform = this.entity.require(TransformComponent);

    transform.x += this.velocityX * (delta / 1000);
    transform.y += this.velocityY * (delta / 1000);

    const frictionPerFrame = Math.pow(this.friction, delta / 1000);
    this.velocityX *= frictionPerFrame;
    this.velocityY *= frictionPerFrame;

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
