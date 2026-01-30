import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import type { Grid } from '../../../ecs/systems/Grid';

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
    const entityGridPos = entity.get(GridPositionComponent);
    const targetGridPos = target.get(GridPositionComponent);
    
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

    // Get entity layers (default to 0 if no GridPositionComponent)
    const entityLayer = entityGridPos?.currentLayer ?? 0;
    const targetLayer = targetGridPos?.currentLayer ?? 0;

    // Raycast from entity to target
    return this.raycast(transform.x, transform.y, targetTransform.x, targetTransform.y, entityLayer, targetLayer);
  }

  private raycast(x1: number, y1: number, x2: number, y2: number, entityLayer: number, targetLayer: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.ceil(distance / (this.grid.cellSize / 2));

    // Get the lower of the two entity layers
    const minLayer = Math.min(entityLayer, targetLayer);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;

      const col = Math.floor(x / this.grid.cellSize);
      const row = Math.floor(y / this.grid.cellSize);
      const cell = this.grid.getCell(col, row);

      // Block line of sight only if cell layer is higher than both entities
      if (cell && cell.layer > minLayer) {
        return false;
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
