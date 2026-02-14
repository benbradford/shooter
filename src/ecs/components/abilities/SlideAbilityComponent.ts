import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { CollisionComponent } from '../combat/CollisionComponent';

const SLIDE_DISTANCE_PX = 350;
const SLIDE_SPEED_PX_PER_SEC = 1200;
const SLIDE_FRICTION = 0.05;
const SLIDE_COOLDOWN_MS = 1000;

export class SlideAbilityComponent implements Component {
  entity!: Entity;
  private isSliding = false;
  private velocityX = 0;
  private velocityY = 0;
  private distanceTraveled = 0;
  private cooldownMs = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(delta: number): void {
    this.cooldownMs -= delta;

    if (this.isSliding) {
      const transform = this.entity.require(TransformComponent);

      const moveX = this.velocityX * (delta / 1000);
      const moveY = this.velocityY * (delta / 1000);
      const moveDist = Math.hypot(moveX, moveY);

      transform.x += moveX;
      transform.y += moveY;
      this.distanceTraveled += moveDist;

      const frictionPerFrame = Math.pow(SLIDE_FRICTION, delta / 1000);
      this.velocityX *= frictionPerFrame;
      this.velocityY *= frictionPerFrame;

      if (this.distanceTraveled >= SLIDE_DISTANCE_PX || (Math.abs(this.velocityX) < 10 && Math.abs(this.velocityY) < 10)) {
        this.stopSlide();
      }
    }
  }

  trySlide(): boolean {
    if (this.isSliding || this.cooldownMs > 0) {
      return false;
    }

    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);

    this.velocityX = walk.lastMoveX * SLIDE_SPEED_PX_PER_SEC;
    this.velocityY = walk.lastMoveY * SLIDE_SPEED_PX_PER_SEC;
    this.distanceTraveled = 0;
    this.isSliding = true;

    anim.animationSystem.play(`slide_start_${walk.lastDir}`);

    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      collision.enabled = false;
    }

    this.entity.tags.add('player_sliding');

    return true;
  }

  stopSlide(): void {
    this.isSliding = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.cooldownMs = SLIDE_COOLDOWN_MS;

    this.entity.tags.delete('player_sliding');

    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      collision.enabled = true;
    }

    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);

    anim.animationSystem.play(`slide_end_${walk.lastDir}`);

    this.scene.time.delayedCall(150, () => {
      const animKey = walk.isMoving() ? `walk_${walk.lastDir}` : `idle_${walk.lastDir}`;
      anim.animationSystem.play(animKey);
    });
  }

  isActive(): boolean {
    return this.isSliding;
  }

  canSlide(): boolean {
    return !this.isSliding && this.cooldownMs <= 0;
  }

  onDestroy(): void {
    // Cleanup
  }
}
