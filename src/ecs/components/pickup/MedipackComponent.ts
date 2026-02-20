import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { MedipackHealerComponent } from '../core/MedipackHealerComponent';

const COLLECTION_DISTANCE_PX = 40;
const COLLECTION_DELAY_MS = 500;

export class MedipackComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;
  
  constructor(private readonly playerEntity: Entity) {}

  update(delta: number): void {
    this.elapsedMs += delta;
    
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