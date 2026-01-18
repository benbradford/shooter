import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { AnimationSystem } from '../../animation/AnimationSystem';
import type { SpriteComponent } from './SpriteComponent';

export class AnimationComponent implements Component {
  entity!: Entity;

  constructor(
    public readonly animationSystem: AnimationSystem,
    private readonly spriteComp: SpriteComponent
  ) {}

  update(delta: number): void {
    this.animationSystem.update(delta);
    const frame = this.animationSystem.getFrame();
    if (frame) {
      this.spriteComp.setTexture(frame);
    }
  }

  onDestroy(): void {}
}
