import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { Depth } from '../../../constants/DepthConstants';

const TRAIL_FREQUENCY_MS = 40;
const TRAIL_LIFESPAN_MS = 400;
const TRAIL_START_ALPHA = 0.4;
const TRAIL_TINT = 0x66ffff;
const TRAIL_SIZE_PX = 6;

export class CompanionTrailComponent implements Component {
  entity!: Entity;

  private readonly scene: Phaser.Scene;
  private timerMs = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(delta: number): void {
    const t = this.entity.require(TransformComponent);
    this.timerMs += delta;

    // Only emit if moved and enough time passed
    const moved = Math.hypot(t.x - this.lastX, t.y - this.lastY) > 2;
    if (this.timerMs >= TRAIL_FREQUENCY_MS && moved) {
      this.timerMs = 0;
      this.lastX = t.x;
      this.lastY = t.y;

      const dot = this.scene.add.circle(t.x, t.y, TRAIL_SIZE_PX, TRAIL_TINT, TRAIL_START_ALPHA);
      dot.setDepth(Depth.particleBehind);
      this.scene.tweens.add({
        targets: dot,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: TRAIL_LIFESPAN_MS,
        onComplete: () => dot.destroy(),
      });
    }
  }
}
