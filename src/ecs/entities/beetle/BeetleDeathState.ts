import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { SoundManager } from '../../../systems/SoundManager';
import { createToxicPuddleEntity } from './ToxicPuddleEntity';

const SHRINK_DURATION_MS = 400;
const BEETLE_SCALE = 0.5;

export class BeetleDeathState implements IState {
  private elapsedMs = 0;
  private knockbackDone = false;
  private puddleSpawned = false;

  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene,
    private readonly entityManager: EntityManager
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    this.knockbackDone = false;
    this.puddleSpawned = false;
    SoundManager.getInstance().play('beetle_splat');

    // Knockback was already applied from the hit collision handler
    const knockback = this.entity.get(KnockbackComponent);
    if (!knockback?.isActive) {
      // If no knockback active, skip waiting
      this.knockbackDone = true;
    }
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    // Wait for knockback to finish before spawning puddle
    if (!this.knockbackDone) {
      const knockback = this.entity.get(KnockbackComponent);
      if (!knockback?.isActive) {
        this.knockbackDone = true;
        this.elapsedMs = 0; // Reset timer for shrink phase
      }
      return;
    }

    // Spawn toxic puddle at final position
    if (!this.puddleSpawned) {
      this.puddleSpawned = true;
      const transform = this.entity.require(TransformComponent);
      const puddle = createToxicPuddleEntity({
        scene: this.scene,
        x: transform.x,
        y: transform.y,
        entityManager: this.entityManager,
      });
      this.entityManager.add(puddle);
    }

    // Shrink and destroy
    const sprite = this.entity.get(SpriteComponent);
    const progress = Math.min(this.elapsedMs / SHRINK_DURATION_MS, 1);
    if (sprite) {
      sprite.sprite.setScale(BEETLE_SCALE * (1 - progress));
      sprite.sprite.setAlpha(1 - progress);
    }

    if (progress >= 1) {
      this.entity.destroy();
    }
  }
}
