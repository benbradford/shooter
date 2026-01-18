import Phaser from 'phaser';
import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';
import type { TransformComponent } from './TransformComponent';

export class SpriteComponent implements Component {
  entity!: Entity;
  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, texture: string, private transformComp: TransformComponent) {
    this.sprite = scene.add.sprite(transformComp.x, transformComp.y, texture);
    this.sprite.setScale(transformComp.scale);
  }

  update(delta: number): void {
    this.sprite.setPosition(this.transformComp.x, this.transformComp.y);
    this.sprite.setRotation(this.transformComp.rotation);
    this.sprite.setScale(this.transformComp.scale);
  }

  onDestroy(): void {
    this.sprite.destroy();
  }

  setTexture(texture: string): void {
    this.sprite.setTexture(texture);
  }
}
