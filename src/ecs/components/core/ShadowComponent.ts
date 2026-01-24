import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from './TransformComponent';

export interface ShadowComponentProps {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export class ShadowComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly scale: number;
  private readonly offsetX: number;
  private readonly offsetY: number;
  private shadow: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: Phaser.Scene, props: ShadowComponentProps) {
    this.scene = scene;
    this.scale = props.scale;
    this.offsetX = props.offsetX;
    this.offsetY = props.offsetY;
  }

  init(): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    this.shadow = this.scene.add.sprite(transform.x + this.offsetX, transform.y + this.offsetY, 'shadow');
    this.shadow.setScale(this.scale);
    this.shadow.setDepth(-1);
  }

  update(_delta: number): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform || !this.shadow) return;

    this.shadow.setPosition(transform.x + this.offsetX, transform.y + this.offsetY);
  }

  onDestroy(): void {
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }
  }
}
