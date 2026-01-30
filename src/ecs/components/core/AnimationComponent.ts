import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
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
    if (frame === undefined) {
      console.warn("frame is undefined for " + this.entity.id)
    } else {
      // Try to parse as number (sprite sheet frame), fallback to string (texture name)
      const frameNum = Number.parseInt(frame);
      if (Number.isNaN(frameNum)) {
        console.warn("frame is empty string for " + this.entity.id)
        return;
      }
      this.spriteComp.setTexture(Number.isNaN(frameNum) ? frame : frameNum);
    }
  }

}
