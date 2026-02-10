import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

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

    // Scale down over 3 seconds
    this.scene.tweens.add({
      targets: transform,
      scale: 0,
      duration: 3000,
      ease: 'Power2'
    });

    // Add shake effect by tweening offset values
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

    // Create bursts every 0.5 seconds for 3 seconds (6 bursts total)
    const burstCount = 6;
    const burstInterval = 500;

    for (let i = 0; i < burstCount; i++) {
      this.scene.time.delayedCall(i * burstInterval, () => {
        // Random position within the cell
        const offsetX = (Math.random() - 0.5) * this.cellSize * 0.8;
        const offsetY = (Math.random() - 0.5) * this.cellSize * 0.8;

        const emitter = this.scene.add.particles(transform.x + offsetX, transform.y + offsetY, 'smoke', {
          speed: { min: 40, max: 80 },
          angle: { min: 0, max: 360 },
          scale: { start: 3, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 600,
          frequency: 10,
          tint: [0x000000, 0xf5f5dc],
          blendMode: 'NORMAL'
        });

        emitter.setDepth(1000);

        this.scene.time.delayedCall(150, () => {
          emitter.stop();
        });

        this.scene.time.delayedCall(550, () => {
          emitter.destroy();
        });
      });
    }
  }

}
