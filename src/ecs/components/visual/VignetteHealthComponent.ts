import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { HealthComponent } from '../core/HealthComponent';

export type VignetteHealthComponentProps = {
  readonly healthComponent: HealthComponent;
  readonly scene: Phaser.Scene;
  readonly cameraWidth: number;
  readonly cameraHeight: number;
};

export class VignetteHealthComponent implements Component {
  entity!: Entity;
  private readonly healthComponent: HealthComponent;
  private readonly redOverlay: Phaser.GameObjects.Rectangle;
  private currentAlpha: number = 0;

  constructor(props: VignetteHealthComponentProps) {
    this.healthComponent = props.healthComponent;
    
    this.redOverlay = props.scene.add.rectangle(
      props.cameraWidth / 2,
      props.cameraHeight / 2,
      props.cameraWidth,
      props.cameraHeight,
      0xff0000
    );
    this.redOverlay.setDepth(10001);
    this.redOverlay.setScrollFactor(0);
    this.redOverlay.setAlpha(0);
  }

  update(delta: number): void {
    const healthRatio = this.healthComponent.getRatio();
    const targetAlpha = (1 - healthRatio) * 0.2;

    const lerpFactor = 1 - Math.pow(0.001, delta / 1000);
    this.currentAlpha += (targetAlpha - this.currentAlpha) * lerpFactor;

    this.redOverlay.setAlpha(this.currentAlpha);
  }

  onDestroy(): void {
    this.redOverlay.destroy();
  }
}
