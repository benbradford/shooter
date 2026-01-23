import Phaser from 'phaser';
import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';

const SHADOW_OFFSET_Y_PX = 50;
const SHADOW_SCALE = 2;

export class ShadowComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private shadow: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    this.shadow = this.scene.add.sprite(transform.x, transform.y + SHADOW_OFFSET_Y_PX, 'shadow');
    this.shadow.setScale(SHADOW_SCALE);
    this.shadow.setDepth(-1);
  }

  update(_delta: number): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform || !this.shadow) return;

    this.shadow.setPosition(transform.x, transform.y + SHADOW_OFFSET_Y_PX);
  }

  onDestroy(): void {
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }
  }
}
