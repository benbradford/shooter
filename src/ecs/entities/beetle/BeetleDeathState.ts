import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { createToxicPuddleEntity } from './ToxicPuddleEntity';

const DEATH_KNOCKBACK_FORCE_PX = 150;
const SHRINK_DURATION_MS = 400;

export class BeetleDeathState implements IState {
  private elapsedMs = 0;
  private knockbackDone = false;
  private puddleSpawned = false;
  private lastHitDirX = 0;
  private lastHitDirY = -1;

  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene,
    private readonly entityManager: EntityManager
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    this.knockbackDone = false;
    this.puddleSpawned = false;

    // Apply death knockback away from last hit direction
    const knockback = this.entity.get(KnockbackComponent);
    if (knockback) {
      // Use the knockback that was already applied from the hit
      // If not active, apply a small one
      if (!knockback.isActive) {
        knockback.applyKnockback(this.lastHitDirX, this.lastHitDirY, DEATH_KNOCKBACK_FORCE_PX);
      }
    }
  }

  onExit(): void {
    // no-op
  }

  update(delta: number): string | void {
    this.elapsedMs += delta;

    // Wait for knockback to finish before spawning puddle
    const knockback = this.entity.get(KnockbackComponent);
    if (!this.knockbackDone) {
      if (!knockback?.isActive) {
        this.knockbackDone = true;
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
      sprite.sprite.setScale(1 - progress);
      sprite.sprite.setAlpha(1 - progress);
    }

    if (progress >= 1) {
      this.entity.destroy();
    }
  }
}
