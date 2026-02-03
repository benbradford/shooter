import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { TriggerComponent } from '../ecs/components/core/TriggerComponent';
import type { Grid } from '../systems/grid/Grid';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';

export type CreateTriggerEntityProps = {
  eventName: string;
  triggerCells: Array<{ col: number; row: number }>;
  grid: Grid;
  eventManager: EventManagerSystem;
  oneShot: boolean;
}

export function createTriggerEntity(props: CreateTriggerEntityProps): Entity {
  const entity = new Entity('trigger');
  
  // Position at first trigger cell (for editor visualization)
  const firstCell = props.triggerCells[0];
  const worldPos = props.grid.cellToWorld(firstCell.col, firstCell.row);
  const centerX = worldPos.x + props.grid.cellSize / 2;
  const centerY = worldPos.y + props.grid.cellSize / 2;
  
  entity.add(new TransformComponent(centerX, centerY, 0, 1));
  entity.add(new TriggerComponent(props));
  
  entity.setUpdateOrder([
    TransformComponent,
    TriggerComponent
  ]);
  
  return entity;
}
