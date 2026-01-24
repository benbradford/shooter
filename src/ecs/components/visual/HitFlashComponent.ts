import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';

const HIT_FLASH_INTERVAL_MS = 100;
const DEFAULT_HIT_TINT_COLOR = 0xff0000; // red

export class HitFlashComponent implements Component {
  entity!: Entity;
  private flashTimerMs: number = 0;
  private isRed: boolean = false;
  private active: boolean = false;
  private durationMs: number = 0;
  private elapsedMs: number = 0;
  private readonly tintColor: number;

  constructor(tintColor: number = DEFAULT_HIT_TINT_COLOR) {
    this.tintColor = tintColor;
  }

  init(): void {
    // Nothing to initialize
  }

  onDestroy(): void {
    this.stop();
  }

  update(delta: number): void {
    if (!this.active) return;

    this.elapsedMs += delta;
    this.flashTimerMs += delta;

    const sprite = this.entity.get(SpriteComponent);
    if (!sprite) return;

    // Stop flashing after duration
    if (this.elapsedMs >= this.durationMs) {
      this.stop();
      return;
    }

    // Flash red
    if (this.flashTimerMs >= HIT_FLASH_INTERVAL_MS) {
      this.flashTimerMs = 0;
      this.isRed = !this.isRed;
      if (this.isRed) {
        sprite.sprite.setTint(this.tintColor);
      } else {
        sprite.sprite.clearTint();
      }
    }
  }

  flash(durationMs: number): void {
    this.active = true;
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.flashTimerMs = 0;
    this.isRed = false;

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.setTint(this.tintColor);
      this.isRed = true;
    }
  }

  stop(): void {
    this.active = false;
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.clearTint();
    }
  }
}
