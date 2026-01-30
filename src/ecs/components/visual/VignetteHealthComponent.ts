import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { HealthComponent } from '../core/HealthComponent';

const MAX_HEALTH_ALPHA = 0.3;
const MIN_HEALTH_ALPHA = 0.8;
const LERP_SPEED = 0.1;

export type VignetteHealthComponentProps = {
  vignette: Phaser.GameObjects.Image;
  health: HealthComponent;
}

export class VignetteHealthComponent implements Component {
  entity!: Entity;
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly health: HealthComponent;
  private currentAlpha: number;

  constructor(props: VignetteHealthComponentProps) {
    this.vignette = props.vignette;
    this.health = props.health;
    this.currentAlpha = MAX_HEALTH_ALPHA;
  }

  update(_delta: number): void {
    const healthRatio = this.health.getRatio();
    const targetAlpha = MAX_HEALTH_ALPHA + (MIN_HEALTH_ALPHA - MAX_HEALTH_ALPHA) * (1 - healthRatio);
    
    this.currentAlpha += (targetAlpha - this.currentAlpha) * LERP_SPEED;
    this.vignette.setAlpha(this.currentAlpha);
    
    const redAmount = Math.floor(255 * (1 - healthRatio));
    const tint = (redAmount << 16) | 0x000000;
    this.vignette.setTint(tint);
  }

  onDestroy(): void {
    this.vignette.setAlpha(MAX_HEALTH_ALPHA);
    this.vignette.clearTint();
  }
}
