import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';

const ROTATION_SPEED_DEG_PER_SEC = 360;

export class RotatingProjectileComponent implements Component {
  entity!: Entity;
  private readonly rotationDirection: number;

  constructor(dirX: number) {
    this.rotationDirection = dirX > 0 ? 1 : -1;
  }

  update(delta: number): void {
    const sprite = this.entity.get(SpriteComponent);
    if (!sprite) return;

    const rotationDelta = (ROTATION_SPEED_DEG_PER_SEC * (delta / 1000)) * this.rotationDirection;
    sprite.sprite.angle += rotationDelta;
  }
}
