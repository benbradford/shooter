import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { BugSpawnerComponent } from '../ai/BugSpawnerComponent';
import { createSmokeBurst } from './SmokeBurstHelper';

const SPAWN_RANGE_PX = 200;
const SCALE_IN_DURATION_MS = 3000;
const BURST_COUNT = 6;
const BURST_INTERVAL_MS = 500;

export class BaseSpawnComponent implements Component {
  entity!: Entity;
  private hasSpawned = false;
  private isSpawning = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly playerEntity: Entity,
    private readonly cellSize: number,
    private readonly targetScale: number
  ) {}

  update(): void {
    const sprite = this.entity.require(SpriteComponent);
    
    if (!this.hasSpawned && !this.isSpawning) {
      sprite.sprite.setVisible(false);
      
      const transform = this.entity.require(TransformComponent);
      const playerTransform = this.playerEntity.require(TransformComponent);

      const distance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);

      if (distance <= SPAWN_RANGE_PX) {
        this.spawn();
      }
    }
  }

  private spawn(): void {
    this.isSpawning = true;

    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    sprite.sprite.setVisible(true);
    sprite.sprite.setAlpha(1);

    this.scene.tweens.add({
      targets: transform,
      scale: this.targetScale,
      duration: SCALE_IN_DURATION_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.hasSpawned = true;
        const spawner = this.entity.get(BugSpawnerComponent);
        if (spawner) {
          spawner.setFullySpawned();
        }
      }
    });

    createSmokeBurst(this.scene, transform.x, transform.y, this.cellSize, BURST_COUNT, BURST_INTERVAL_MS);
  }

  onDestroy(): void {
    // Cleanup
  }
}
