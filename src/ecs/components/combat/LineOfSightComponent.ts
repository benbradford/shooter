import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import type { Grid } from '../../../utils/Grid';

type LineOfSightProps = {
  range: number;
  grid: Grid;
  fieldOfView: number; // In radians
}

export class LineOfSightComponent implements Component {
  entity!: Entity;
  range: number;
  targetEntity: Entity | null;
  grid: Grid;
  fieldOfView: number;
  facingAngle: number;

  constructor(props: LineOfSightProps) {
    this.range = props.range;
    this.grid = props.grid;
    this.fieldOfView = props.fieldOfView;
    this.targetEntity = null;
    this.facingAngle = 0;
  }

  canSeeTarget(entity: Entity, target: Entity): boolean {
    const transform = entity.get(TransformComponent);
    const targetTransform = target.get(TransformComponent);
    
    if (!transform || !targetTransform) return false;

    const dx = targetTransform.x - transform.x;
    const dy = targetTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    if (distance > this.range) return false;

    // Check if target is within field of view
    const angleToTarget = Math.atan2(dy, dx);
    let angleDiff = angleToTarget - this.facingAngle;
    
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    if (Math.abs(angleDiff) > this.fieldOfView / 2) return false;

    // Raycast from entity to target
    return this.raycast(transform.x, transform.y, targetTransform.x, targetTransform.y);
  }

  private raycast(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.ceil(distance / (this.grid.cellSize / 2));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;

      const col = Math.floor(x / this.grid.cellSize);
      const row = Math.floor(y / this.grid.cellSize);
      const cell = this.grid.getCell(col, row);

      if (cell && cell.layer > 0) {
        return false; // Wall blocks line of sight
      }
    }

    return true;
  }

  update(_delta: number): void {
    // Handled by state machine
  }

  onDestroy(): void {
    // Clean up
  }
}
