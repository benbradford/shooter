import type { Entity } from '../Entity';
import type { Component } from '../Component';
import { TransformComponent } from './TransformComponent';
import { SpriteComponent } from './SpriteComponent';
import { GridCollisionComponent } from './GridCollisionComponent';

export class KnockbackComponent implements Component {
  entity!: Entity;
  velocityX: number;
  velocityY: number;
  friction: number;
  duration: number;
  elapsed: number;

  constructor(friction: number, duration: number) {
    this.velocityX = 0;
    this.velocityY = 0;
    this.friction = friction;
    this.duration = duration;
    this.elapsed = 0;
  }

  applyKnockback(dirX: number, dirY: number, force: number): void {
    this.velocityX = dirX * force;
    this.velocityY = dirY * force;
    this.elapsed = 0;
  }

  update(delta: number): void {
    if (this.velocityX === 0 && this.velocityY === 0) return;

    this.elapsed += delta;

    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    // Apply velocity
    const newX = transform.x + this.velocityX * (delta / 1000);
    const newY = transform.y + this.velocityY * (delta / 1000);

    // Check collision
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) {
      const sprite = this.entity.get(SpriteComponent);
      if (sprite) {
        // Simple bounds check - just apply velocity without wall collision for now
        transform.x = newX;
        transform.y = newY;
      }
    } else {
      transform.x = newX;
      transform.y = newY;
    }

    // Apply friction
    this.velocityX *= (1 - this.friction * (delta / 1000));
    this.velocityY *= (1 - this.friction * (delta / 1000));

    // Stop if too slow or duration exceeded
    if (Math.abs(this.velocityX) < 1 && Math.abs(this.velocityY) < 1 || this.elapsed >= this.duration) {
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  onDestroy(): void {
    // Clean up
  }
}
