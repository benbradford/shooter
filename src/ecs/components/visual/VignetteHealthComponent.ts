import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { HealthComponent } from '../core/HealthComponent';

export type VignetteHealthComponentProps = {
  readonly healthComponent: HealthComponent;
  readonly vignetteSprite: Phaser.GameObjects.Image;
};

export class VignetteHealthComponent implements Component {
  entity!: Entity;
  private readonly healthComponent: HealthComponent;
  private readonly vignetteSprite: Phaser.GameObjects.Image;
  private currentAlpha: number = 0;
  private currentTint: number = 0xffffff;

  constructor(props: VignetteHealthComponentProps) {
    this.healthComponent = props.healthComponent;
    this.vignetteSprite = props.vignetteSprite;
  }

  update(delta: number): void {
    const healthRatio = this.healthComponent.getRatio();
    const targetAlpha = 1 - healthRatio;
    const redAmount = Math.floor((1 - healthRatio) * 255);
    const targetTint = (255 << 16) | (redAmount << 8) | redAmount;

    const lerpFactor = 1 - Math.pow(0.001, delta / 1000);
    this.currentAlpha += (targetAlpha - this.currentAlpha) * lerpFactor;
    
    const currentR = (this.currentTint >> 16) & 0xff;
    const currentG = (this.currentTint >> 8) & 0xff;
    const currentB = this.currentTint & 0xff;
    const targetR = (targetTint >> 16) & 0xff;
    const targetG = (targetTint >> 8) & 0xff;
    const targetB = targetTint & 0xff;
    
    const newR = Math.floor(currentR + (targetR - currentR) * lerpFactor);
    const newG = Math.floor(currentG + (targetG - currentG) * lerpFactor);
    const newB = Math.floor(currentB + (targetB - currentB) * lerpFactor);
    this.currentTint = (newR << 16) | (newG << 8) | newB;

    this.vignetteSprite.setAlpha(this.currentAlpha);
    this.vignetteSprite.setTint(this.currentTint);
  }

  onDestroy(): void {
    this.vignetteSprite.destroy();
  }
}
