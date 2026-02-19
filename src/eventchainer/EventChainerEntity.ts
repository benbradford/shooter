import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { EventChainerComponent } from '../ecs/components/eventchainer/EventChainerComponent';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import type { Grid } from '../systems/grid/Grid';

export type CreateEventChainerProps = {
  grid: Grid;
  col: number;
  row: number;
  eventManager: EventManagerSystem;
  eventsToRaise: Array<{ event: string; delayMs: number }>;
  startOnEvent?: string;
  entityId: string;
}

export function createEventChainerEntity(props: CreateEventChainerProps): Entity {
  const { grid, col, row, eventManager, eventsToRaise, startOnEvent, entityId } = props;

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const entity = new Entity(entityId);
  entity.tags.add('eventchainer');

  entity.add(new TransformComponent(x, y, 0, 1));
  
  const chainer = entity.add(new EventChainerComponent(eventManager, eventsToRaise, startOnEvent));
  chainer.init();

  entity.setUpdateOrder([
    TransformComponent,
    EventChainerComponent
  ]);

  return entity;
}
