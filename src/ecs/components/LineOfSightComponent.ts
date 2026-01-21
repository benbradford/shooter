import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';

export class LineOfSightComponent implements Component {
  entity!: Entity;
  range: number;
  targetEntity: Entity | null;

  constructor(range: number) {
    this.range = range;
    this.targetEntity = null;
  }

  canSeeTarget(entity: Entity, target: Entity): boolean {
    const transform = entity.get(TransformComponent);
    const targetTransform = target.get(TransformComponent);
    
    if (!transform || !targetTransform) return false;

    const dx = targetTransform.x - transform.x;
    const dy = targetTransform.y - transform.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.range;
  }

  update(_delta: number): void {
    // Handled by state machine
  }

  onDestroy(): void {
    // Clean up
  }
}
