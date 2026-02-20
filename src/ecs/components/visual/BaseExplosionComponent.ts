import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';

export class BaseExplosionComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private changeSpriteTime = 0;
  private hasExploded = false;

  constructor(scene: Phaser.Scene, _cellSize: number) {
    this.scene = scene;
  }

  update(delta: number): void {
    const sprite = this.entity.require(SpriteComponent);
    if (this.hasExploded) {
      this.changeSpriteTime += delta;
      if (this.changeSpriteTime > 300) {
        this.entity.setUpdateOrder([]);
        sprite.sprite.setTexture('base_destroyed');
      }
    }
  }

  explode(): void {
    this.hasExploded = true;
    const sprite = this.entity.require(SpriteComponent);
    const collision = this.entity.require(CollisionComponent);

    collision.enabled = false;
    this.entity.remove(GridCellBlocker);

    sprite.sprite.clearTint();
    this.entity.setUpdateOrder([BaseExplosionComponent]);

    const emitter = this.scene.add.particles(sprite.sprite.x, sprite.sprite.y, 'base_particle', {
      speed: { min: 20, max: 70 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: 1200,
      frequency: 25,
      quantity: 10,
      blendMode: 'NORMAL',
      emitZone: {
        type: 'random' as const,
        source: new Phaser.Geom.Circle(0, 0, 40) as Phaser.Types.GameObjects.Particles.RandomZoneSource
      }
    });

    emitter.setDepth(1000);
    this.scene.time.delayedCall(300, () => emitter.stop());
    this.scene.time.delayedCall(3000, () => emitter.destroy());
  }

}
