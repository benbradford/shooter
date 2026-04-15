import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';

const BASE_ALPHA = 0.92;
const FLICKER_ALPHA = 0.7;
const FLICKER_DURATION_MS = 120;
const FLICKER_MIN_INTERVAL_MS = 3000;
const FLICKER_MAX_INTERVAL_MS = 8000;
const GLOW_TINT = 0xeeffff;

export class CompanionGlowComponent implements Component {
  entity!: Entity;

  private readonly scene: Phaser.Scene;
  private glow: Phaser.GameObjects.Image | null = null;
  private flickerTimerMs = 0;
  private nextFlickerMs = 4000;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    const sprite = this.entity.require(SpriteComponent);
    // Create a larger, blurred copy behind the sprite as glow
    this.glow = this.scene.add.image(sprite.sprite.x, sprite.sprite.y, 'narry');
    this.glow.setAlpha(0.25);
    this.glow.setTint(GLOW_TINT);
    this.glow.setScale(sprite.sprite.scaleX * 1.6);
    this.glow.setDepth(sprite.sprite.depth - 1);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
  }

  update(delta: number): void {
    const sprite = this.entity.require(SpriteComponent);

    // Sync glow position
    if (this.glow) {
      this.glow.setPosition(sprite.sprite.x, sprite.sprite.y);
      this.glow.setDepth(sprite.sprite.depth - 1);
    }

    // Flicker: brief alpha dip
    this.flickerTimerMs += delta;
    if (this.flickerTimerMs >= this.nextFlickerMs) {
      this.flickerTimerMs = 0;
      this.nextFlickerMs = FLICKER_MIN_INTERVAL_MS + Math.random() * (FLICKER_MAX_INTERVAL_MS - FLICKER_MIN_INTERVAL_MS);

      sprite.sprite.setAlpha(FLICKER_ALPHA);
      if (this.glow) this.glow.setAlpha(0.12);

      this.scene.time.delayedCall(FLICKER_DURATION_MS, () => {
        sprite.sprite.setAlpha(BASE_ALPHA);
        if (this.glow) this.glow.setAlpha(0.25);
      });
    }
  }

  onDestroy(): void {
    this.glow?.destroy();
    this.glow = null;
  }
}
