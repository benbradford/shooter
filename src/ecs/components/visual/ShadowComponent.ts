import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
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
  private readonly offsetStack: Array<{ x: number; y: number }> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    public readonly props: ShadowProps
  ) {
    this.offsetStack.push({ x: props.offsetX, y: props.offsetY });
  }

  init(): void {
    this.shadow = this.scene.add.image(0, 0, 'shadow');
    this.shadow.setScale(this.props.scale);
    this.shadow.setDepth(Depth.shadow);
  }

  pushOffset(x: number, y: number): void {
    const current = this.offsetStack[this.offsetStack.length - 1];
    this.offsetStack.push({ x: current.x + x, y: current.y + y });
  }

  popOffset(): void {
    if (this.offsetStack.length > 1) {
      this.offsetStack.pop();
    }
  }

  update(): void {
    const transform = this.entity.require(TransformComponent);
    const offset = this.offsetStack[this.offsetStack.length - 1];
    this.shadow.setPosition(
      transform.x + offset.x,
      transform.y + offset.y
    );
  }

  onDestroy(): void {
    this.shadow.destroy();
  }
}
