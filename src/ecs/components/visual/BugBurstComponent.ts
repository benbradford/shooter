import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

export class BugBurstComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update?(_delta: number): void {
    // No update needed - triggered by burst()
  }

  burst(): void {
    const transform = this.entity.require(TransformComponent);

    const emitter = this.scene.add.particles(transform.x, transform.y, 'robot_hit_particle', {
      speed: { min: 50, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      frequency: 10,
      tint: [0x000000, 0xff0000],
      blendMode: 'NORMAL'
    });

    emitter.setDepth(1000);
    
    this.scene.time.delayedCall(250, () => {
      emitter.stop();
    });
    
    this.scene.time.delayedCall(750, () => {
      emitter.destroy();
    });
  }

}
