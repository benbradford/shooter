import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { Depth } from '../../../constants/DepthConstants';

const DEATH_SHRINK_DURATION_MS = 300;

export class WormDeathState implements IState {
  private elapsedMs = 0;

  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    const collision = this.entity.get(CollisionComponent);
    if (collision) this.entity.remove(CollisionComponent);

    // Simple death particles
    const transform = this.entity.require(TransformComponent);
    const emitter = this.scene.add.particles(transform.x, transform.y, 'worm', {
      frame: [0, 1, 2, 3],
      speed: { min: 50, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 350,
      quantity: 3,
      tint: 0x88cc44,
    });
    emitter.setDepth(Depth.player);
    this.scene.time.delayedCall(200, () => emitter.stop());
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;
    const sprite = this.entity.require(SpriteComponent);
    const progress = Math.min(this.elapsedMs / DEATH_SHRINK_DURATION_MS, 1);
    sprite.sprite.setAlpha(1 - progress);
    sprite.sprite.setScale((1 - progress) * this.entity.require(TransformComponent).scale);

    if (progress >= 1) {
      this.scene.time.delayedCall(0, () => this.entity.destroy());
    }
  }
}
