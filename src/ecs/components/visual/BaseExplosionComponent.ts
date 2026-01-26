import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

export class BaseExplosionComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly cellSize: number;

  constructor(scene: Phaser.Scene, cellSize: number) {
    this.scene = scene;
    this.cellSize = cellSize;
  }

  update(_delta: number): void {}

  explode(): void {
    const transform = this.entity.require(TransformComponent);

    const halfCell = this.cellSize / 2;
    const positions = [
      { x: transform.x - halfCell / 2, y: transform.y - halfCell / 2 },
      { x: transform.x + halfCell / 2, y: transform.y - halfCell / 2 },
      { x: transform.x - halfCell / 2, y: transform.y + halfCell / 2 },
      { x: transform.x + halfCell / 2, y: transform.y + halfCell / 2 },
      { x: transform.x, y: transform.y }
    ];

    positions.forEach(pos => {
      const emitter = this.scene.add.particles(pos.x, pos.y, 'robot_hit_particle', {
        speed: { min: 80, max: 180 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 700,
        frequency: 10,
        tint: [0x000000, 0xff0000, 0xff0000, 0xff0000, 0xffffff],
        blendMode: 'NORMAL'
      });

      emitter.setDepth(1000);

      this.scene.time.delayedCall(300, () => {
        emitter.stop();
      });

      this.scene.time.delayedCall(1000, () => {
        emitter.destroy();
      });
    });
  }

  onDestroy(): void {}
}
