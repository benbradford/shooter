import type { Component } from '../../Component';
import { DEPTH_SHADOW } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

export type ShadowProps = {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export class ShadowComponent implements Component {
  entity!: Entity;
  public shadow!: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly props: ShadowProps
  ) {}

  init(): void {
    this.shadow = this.scene.add.image(0, 0, 'shadow');
    this.shadow.setScale(this.props.scale);
    this.shadow.setDepth(DEPTH_SHADOW);
  }

  update(): void {
    const transform = this.entity.require(TransformComponent);
    this.shadow.setPosition(
      transform.x + this.props.offsetX,
      transform.y + this.props.offsetY
    );
  }

  onDestroy(): void {
    this.shadow.destroy();
  }
}
