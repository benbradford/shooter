import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';
import { AnimationSystem } from '../../animation/AnimationSystem';
import type { SpriteComponent } from './SpriteComponent';

export class AnimationComponent implements Component {
  entity!: Entity;

  constructor(
    public animationSystem: AnimationSystem,
    private spriteComp: SpriteComponent
  ) {}

  update(delta: number): void {
    this.animationSystem.update(delta);
    const frame = this.animationSystem.getFrame();
    if (frame) {
      console.log('Setting texture:', frame);
      this.spriteComp.setTexture(frame);
    }
  }

  onDestroy(): void {}
}
