import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TransformComponent } from './TransformComponent';
import { TextureReferenceTracker } from '../../../systems/TextureReferenceTracker';

export type SpriteComponentProps = {
  offsetXPx?: number;
  offsetYPx?: number;
  scaleXOverride?: number;
  scaleYOverride?: number;
}

export class SpriteComponent implements Component {
  entity!: Entity;
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly offsetXPx: number;
  private readonly offsetYPx: number;
  private readonly scaleXOverride?: number;
  private readonly scaleYOverride?: number;
  private trackedTextureKey: string;
  visualOffsetYPx: number = 0;
  visualScaleX: number = 1;

  constructor(
    scene: Phaser.Scene,
    texture: string,
    private readonly transformComp: TransformComponent,
    props: SpriteComponentProps = {}
  ) {
    this.offsetXPx = props.offsetXPx ?? 0;
    this.offsetYPx = props.offsetYPx ?? 0;
    this.scaleXOverride = props.scaleXOverride;
    this.scaleYOverride = props.scaleYOverride;
    this.trackedTextureKey = texture;
    this.sprite = scene.add.sprite(
      transformComp.x + this.offsetXPx,
      transformComp.y + this.offsetYPx,
      texture
    );
    const initialScaleX = this.scaleXOverride ?? transformComp.scale;
    const initialScaleY = this.scaleYOverride ?? transformComp.scale;
    this.sprite.setScale(initialScaleX, initialScaleY);
    TextureReferenceTracker.getInstance().addReference(texture);
  }

  update(_delta: number): void {
    this.sprite.setPosition(
      this.transformComp.x + this.offsetXPx,
      this.transformComp.y + this.offsetYPx + this.visualOffsetYPx
    );
    this.sprite.setRotation(this.transformComp.rotation);
    const scaleX = (this.scaleXOverride ?? this.transformComp.scale) * this.visualScaleX;
    const scaleY = this.scaleYOverride ?? this.transformComp.scale;
    this.sprite.setScale(scaleX, scaleY);
  }

  onDestroy(): void {
    TextureReferenceTracker.getInstance().removeReference(this.trackedTextureKey);
    this.sprite.destroy();
  }

  setTexture(textureOrFrame: string | number): void {
    if (typeof textureOrFrame === 'number') {
      this.sprite.setFrame(textureOrFrame);
    } else {
      TextureReferenceTracker.getInstance().removeReference(this.trackedTextureKey);
      this.trackedTextureKey = textureOrFrame;
      TextureReferenceTracker.getInstance().addReference(textureOrFrame);
      this.sprite.setTexture(textureOrFrame);
    }
  }
}
