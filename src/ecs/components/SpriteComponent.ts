import Phaser from 'phaser';
import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { TransformComponent } from './TransformComponent';

export class SpriteComponent implements Component {
  entity!: Entity;
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, texture: string, private readonly transformComp: TransformComponent) {
    this.sprite = scene.add.sprite(transformComp.x, transformComp.y, texture);
    this.sprite.setScale(transformComp.scale);
  }

  update(_delta: number): void {
    this.sprite.setPosition(this.transformComp.x, this.transformComp.y);
    this.sprite.setRotation(this.transformComp.rotation);
    this.sprite.setScale(this.transformComp.scale);
  }

  onDestroy(): void {
    this.sprite.destroy();
  }

  setTexture(textureOrFrame: string | number): void {
    if (typeof textureOrFrame === 'number') {
      this.sprite.setFrame(textureOrFrame);
    } else {
      this.sprite.setTexture(textureOrFrame);
    }
  }
}
