import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { EventChainerComponent } from '../ecs/components/eventchainer/EventChainerComponent';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';

export type CreateEventChainerProps = {
  eventManager: EventManagerSystem;
  eventsToRaise: Array<{ event: string; delayMs: number }>;
  startOnEvent?: string;
  entityId: string;
}

export function createEventChainerEntity(props: CreateEventChainerProps): Entity {
  const { eventManager, eventsToRaise, startOnEvent, entityId } = props;

  const entity = new Entity(entityId);
  entity.tags.add('eventchainer');

  entity.add(new TransformComponent(0, 0, 0, 1));
  
  const chainer = entity.add(new EventChainerComponent(eventManager, eventsToRaise, startOnEvent));
  chainer.init();

  entity.setUpdateOrder([
    TransformComponent,
    EventChainerComponent
  ]);

  return entity;
}
