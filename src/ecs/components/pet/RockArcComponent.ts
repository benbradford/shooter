import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';

export type RockArcProps = {
  speed: number;
  maxDistance: number;
  arcHeight: number;
};

export class RockArcComponent implements Component {
  entity!: Entity;
  private distanceTraveled = 0;
  private readonly speed: number;
  private readonly maxDistance: number;
  private readonly arcHeight: number;

  constructor(props: RockArcProps) {
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.arcHeight = props.arcHeight;
  }

  update(delta: number): void {
    this.distanceTraveled += this.speed * (delta / 1000);
    const progress = Math.min(this.distanceTraveled / this.maxDistance, 1);
    const arcOffset = Math.sin(progress * Math.PI) * this.arcHeight;
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = -arcOffset;
    }
  }
}
