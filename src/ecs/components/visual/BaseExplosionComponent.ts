import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';

export class BaseExplosionComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, _cellSize: number) {
    this.scene = scene;
  }

  update(): void {
    // No update needed
  }

  explode(): void {
    const sprite = this.entity.require(SpriteComponent);
    const collision = this.entity.require(CollisionComponent);

    collision.enabled = false;
    this.entity.remove(GridCellBlocker);

    sprite.sprite.clearTint();
    this.scene.time.delayedCall(150, () => {
        sprite.sprite.setTexture('base_destroyed');

    });
    // Change to destroyed texture, clear tint, and use current scale


    // Stop all updates
    this.entity.setUpdateOrder([]);

    // Create particle burst
    const emitter = this.scene.add.particles(sprite.sprite.x, sprite.sprite.y, 'base_particle', {
      speed: { min: 40, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      frequency: 5,
      quantity: 70,
      tint: [0xc8a078, 0x966e4b, 0xdcbe8c, 0xaf825f, 0x888888],
      blendMode: 'NORMAL',
      emitZone: {
        type: 'random' as const,
        source: new Phaser.Geom.Circle(0, 0, 55) as Phaser.Types.GameObjects.Particles.RandomZoneSource
      }
    });

    emitter.setDepth(1000);
    this.scene.time.delayedCall(200, () => emitter.stop());
    this.scene.time.delayedCall(800, () => emitter.destroy());
  }

}
