import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TransformComponent } from './TransformComponent';

export type SpriteComponentProps = {
  offsetXPx?: number;
  offsetYPx?: number;
}

export class SpriteComponent implements Component {
  entity!: Entity;
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly offsetXPx: number;
  private readonly offsetYPx: number;

  constructor(
    scene: Phaser.Scene,
    texture: string,
    private readonly transformComp: TransformComponent,
    props: SpriteComponentProps = {}
  ) {
    this.offsetXPx = props.offsetXPx ?? 0;
    this.offsetYPx = props.offsetYPx ?? 0;
    this.sprite = scene.add.sprite(
      transformComp.x + this.offsetXPx,
      transformComp.y + this.offsetYPx,
      texture
    );
    this.sprite.setScale(transformComp.scale);
  }

  update(_delta: number): void {
    this.sprite.setPosition(
      this.transformComp.x + this.offsetXPx,
      this.transformComp.y + this.offsetYPx
    );
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
