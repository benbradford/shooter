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
  private readonly baseTint: number | null;
  private readonly useFill: boolean;

  constructor(tintColor: number = DEFAULT_HIT_TINT_COLOR, baseTint: number | null = null, useFill: boolean = false) {
    this.tintColor = tintColor;
    this.baseTint = baseTint;
    this.useFill = useFill;
  }

  onDestroy(): void {
    this.stop();
  }

  update(delta: number): void {
    if (!this.active) return;

    this.elapsedMs += delta;
    this.flashTimerMs += delta;

    const sprite = this.entity.require(SpriteComponent);

    if (this.elapsedMs >= this.durationMs) {
      this.stop();
      return;
    }

    if (this.flashTimerMs >= HIT_FLASH_INTERVAL_MS) {
      this.flashTimerMs = 0;
      this.isRed = !this.isRed;
      if (this.isRed) {
        if (this.useFill) { sprite.sprite.setTintFill(this.tintColor); } else { sprite.sprite.setTint(this.tintColor); }
      } else if (this.baseTint === null) {
        sprite.sprite.clearTint();
      } else {
        sprite.sprite.setTint(this.baseTint);
      }
    }
  }

  flash(durationMs: number): void {
    this.active = true;
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.flashTimerMs = 0;
    this.isRed = false;

    const sprite = this.entity.require(SpriteComponent);
    if (this.useFill) { sprite.sprite.setTintFill(this.tintColor); } else { sprite.sprite.setTint(this.tintColor); }
    this.isRed = true;
  }

  stop(): void {
    this.active = false;
    const sprite = this.entity.require(SpriteComponent);
    if (this.baseTint === null) {
      sprite.sprite.clearTint();
    } else {
      sprite.sprite.setTint(this.baseTint);
    }
  }
}
