import { Entity } from '../ecs/Entity';
import { LevelExitComponent } from '../ecs/components/level/LevelExitComponent';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';

export type CreateLevelExitEntityProps = {
  eventManager: EventManagerSystem;
  eventName: string;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;
}

export function createLevelExitEntity(props: CreateLevelExitEntityProps): Entity {
  const entity = new Entity('level_exit');

  entity.add(new LevelExitComponent(props.eventManager, {
    eventName: props.eventName,
    targetLevel: props.targetLevel,
    targetCol: props.targetCol,
    targetRow: props.targetRow,
    onTransition: props.onTransition
  }));

  entity.setUpdateOrder([
    LevelExitComponent
  ]);

  return entity;
}
