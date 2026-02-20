import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { MedipackHealerComponent } from '../core/MedipackHealerComponent';

const COLLECTION_DISTANCE_PX = 40;
const COLLECTION_DELAY_MS = 500;
const MEDIPACK_LIFETIME_MS = 8000;
const MEDIPACK_FADE_START_MS = 4000;

export class MedipackComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;
  
  constructor(private readonly playerEntity: Entity) {}

  update(delta: number): void {
    this.elapsedMs += delta;
    
    if (this.elapsedMs >= MEDIPACK_LIFETIME_MS) {
      this.entity.destroy();
      return;
    }

    const sprite = this.entity.get(SpriteComponent);
    if (sprite && this.elapsedMs >= MEDIPACK_FADE_START_MS) {
      const fadeProgress = (this.elapsedMs - MEDIPACK_FADE_START_MS) / (MEDIPACK_LIFETIME_MS - MEDIPACK_FADE_START_MS);
      sprite.sprite.setAlpha(1 - fadeProgress);
    }
    
    if (this.elapsedMs < COLLECTION_DELAY_MS) return;
    
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
    
    if (distance < COLLECTION_DISTANCE_PX) {
      const healer = this.playerEntity.get(MedipackHealerComponent);
      if (healer) {
        healer.addMedipack();
      }
      this.entity.destroy();
    }
  }
}