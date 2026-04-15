import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { Depth } from '../../../constants/DepthConstants';

const TRAIL_FREQUENCY_MS = 40;
const TRAIL_LIFESPAN_MS = 600;
const CYAN_ALPHA = 0.3;
const CYAN_TINT = 0x66ffff;
const CYAN_SIZE_PX = 5;
const WHITE_ALPHA = 0.4;
const WHITE_TINT = 0xffffff;
const WHITE_SIZE_PX = 4;

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

    const moved = Math.hypot(t.x - this.lastX, t.y - this.lastY) > 2;
    if (this.timerMs >= TRAIL_FREQUENCY_MS && moved) {
      this.timerMs = 0;
      this.lastX = t.x;
      this.lastY = t.y;

      this.spawnDot(t.x, t.y, CYAN_SIZE_PX, CYAN_TINT, CYAN_ALPHA);
      this.spawnDot(t.x, t.y, WHITE_SIZE_PX, WHITE_TINT, WHITE_ALPHA);
    }
  }

  private spawnDot(x: number, y: number, sizePx: number, tint: number, alpha: number): void {
    const dot = this.scene.add.circle(x, y, sizePx, tint, alpha);
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
