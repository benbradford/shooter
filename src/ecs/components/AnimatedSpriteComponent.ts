import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { SpriteComponent } from './SpriteComponent';

export interface AnimatedSpriteComponentProps {
  frames: number[];
  frameRate: number;
}

export class AnimatedSpriteComponent implements Component {
  entity!: Entity;
  private readonly frames: number[];
  private readonly frameRate: number;
  private currentFrameIndex: number = 0;
  private animationTimer: number = 0;
  private animationDirection: number = 1;

  constructor(props: AnimatedSpriteComponentProps) {
    this.frames = props.frames;
    this.frameRate = props.frameRate;
  }

  update(delta: number): void {
    const sprite = this.entity.get(SpriteComponent);
    if (!sprite) return;

    this.animationTimer += delta;
    const frameDuration = 1000 / this.frameRate;
    
    if (this.animationTimer >= frameDuration) {
      this.animationTimer = 0;
      this.currentFrameIndex += this.animationDirection;

      if (this.currentFrameIndex >= this.frames.length - 1) {
        this.currentFrameIndex = this.frames.length - 1;
        this.animationDirection = -1;
      } else if (this.currentFrameIndex <= 0) {
        this.currentFrameIndex = 0;
        this.animationDirection = 1;
      }

      sprite.sprite.setFrame(this.frames[this.currentFrameIndex]);
    }
  }

  onDestroy(): void {}
}
