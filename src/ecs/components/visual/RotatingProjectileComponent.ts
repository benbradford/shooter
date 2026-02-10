import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

const ROTATION_SPEED_DEG_PER_SEC = 720;

export class RotatingProjectileComponent implements Component {
  entity!: Entity;
  private readonly rotationDirection: number;

  constructor(dirX: number) {
    this.rotationDirection = dirX > 0 ? 1 : -1;
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    const rotationDelta = (ROTATION_SPEED_DEG_PER_SEC * (delta / 1000) * Math.PI / 180) * this.rotationDirection;
    transform.rotation += rotationDelta;
  }
}
