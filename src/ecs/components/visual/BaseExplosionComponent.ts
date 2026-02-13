import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { createSmokeBurst } from './SmokeBurstHelper';

export class BaseExplosionComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly cellSize: number;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private originalX = 0;
  private originalY = 0;

  constructor(scene: Phaser.Scene, cellSize: number) {
    this.scene = scene;
    this.cellSize = cellSize;
  }

  update(): void {
    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      const transform = this.entity.get(TransformComponent);
      if (transform) {
        transform.x = this.originalX + this.shakeOffsetX;
        transform.y = this.originalY + this.shakeOffsetY;
      }
    }
  }

  explode(): void {
    const transform = this.entity.require(TransformComponent);

    this.originalX = transform.x;
    this.originalY = transform.y;

    this.scene.tweens.add({
      targets: transform,
      scale: 0,
      duration: 3000,
      ease: 'Power2'
    });

    this.scene.tweens.add({
      targets: this,
      shakeOffsetX: 3,
      shakeOffsetY: 3,
      duration: 100,
      yoyo: true,
      repeat: 30,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    });

    createSmokeBurst(this.scene, transform.x, transform.y, this.cellSize, 6, 500);
  }

}
