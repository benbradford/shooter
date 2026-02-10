import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

export class BugBurstComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  burst(): void {
    const transform = this.entity.require(TransformComponent);

    const emitter = this.scene.add.particles(transform.x, transform.y, 'robot_hit_particle', {
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      frequency: 2.5,
      tint: [0x00bb00, 0x009900, 0x007700, 0x005500, 0x003300, 0x001100, 0x000000, 0xff6666],
      blendMode: 'NORMAL',
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 16) }
    });

    emitter.setDepth(1000);

    this.scene.time.delayedCall(200, () => {
      emitter.stop();
    });

    this.scene.time.delayedCall(600, () => {
      emitter.destroy();
    });
  }

}
