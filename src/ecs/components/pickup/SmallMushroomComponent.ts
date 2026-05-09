import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { HealthComponent } from '../core/HealthComponent';

const COLLECTION_DISTANCE_PX = 40;
const COLLECTION_DELAY_MS = 300;
const LIFETIME_MS = 15000;
const FADE_START_MS = 10000;
const HEAL_AMOUNT = 20;

export class SmallMushroomComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;

  constructor(private readonly playerEntity: Entity) {}

  update(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= LIFETIME_MS) {
      this.entity.destroy();
      return;
    }

    const sprite = this.entity.get(SpriteComponent);
    if (sprite && this.elapsedMs >= FADE_START_MS) {
      const fadeProgress = (this.elapsedMs - FADE_START_MS) / (LIFETIME_MS - FADE_START_MS);
      sprite.sprite.setAlpha(1 - fadeProgress);
    }

    if (this.elapsedMs < COLLECTION_DELAY_MS) return;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);

    if (distance < COLLECTION_DISTANCE_PX) {
      const health = this.playerEntity.get(HealthComponent);
      if (health) {
        health.heal(HEAL_AMOUNT);
      }
      this.entity.destroy();
    }
  }
}
