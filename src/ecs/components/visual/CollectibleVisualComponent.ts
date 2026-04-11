import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';

const BOB_AMPLITUDE_PX = 4;
const BOB_FREQUENCY_HZ = 0.8;
const GLOW_ALPHA_BASE = 0.35;
const GLOW_ALPHA_VARIATION = 0.1;
const GLOW_SCALE_MULTIPLIER = 2.5;

export type CollectibleVisualProps = {
  scene: Phaser.Scene;
  texture: string;
  tint: number;
  baseScale: number;
  x: number;
  y: number;
  depth: number;
};

export class CollectibleVisualComponent implements Component {
  entity!: Entity;
  private timer: number = Math.random() * 1000;
  private readonly glow: Phaser.GameObjects.Image;

  constructor(props: CollectibleVisualProps) {
    this.glow = props.scene.add.image(props.x, props.y, props.texture);
    this.glow.setScale(props.baseScale * GLOW_SCALE_MULTIPLIER);
    this.glow.setAlpha(GLOW_ALPHA_BASE);
    this.glow.setTint(props.tint);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.glow.setDepth(props.depth - 1);
  }

  update(delta: number): void {
    this.timer += delta;
    const phase = (this.timer / 1000) * BOB_FREQUENCY_HZ * Math.PI * 2;
    const offsetY = Math.sin(phase) * BOB_AMPLITUDE_PX;

    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.y = transform.y + offsetY;
    }

    this.glow.setPosition(transform.x, transform.y + offsetY);
    this.glow.setScale(transform.scale * GLOW_SCALE_MULTIPLIER);
    this.glow.setAlpha(GLOW_ALPHA_BASE + Math.sin(phase * 1.3) * GLOW_ALPHA_VARIATION);
  }

  onDestroy(): void {
    this.glow.destroy();
  }
}
