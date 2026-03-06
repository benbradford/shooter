import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { InteractionTriggerComponent } from '../ecs/components/interaction/InteractionTriggerComponent';
import type GameScene from '../scenes/GameScene';

export type CreateInteractionEntityProps = {
  scene: GameScene;
  entityId: string;
  filename: string;
};

export function createInteractionEntity(props: CreateInteractionEntityProps): Entity {
  const { scene, entityId, filename } = props;
  
  const entity = new Entity(entityId);
  entity.tags.add('interaction');
  
  entity.add(new TransformComponent(0, 0, 0, 1));
  entity.add(new InteractionTriggerComponent(scene, filename));
  
  entity.setUpdateOrder([
    TransformComponent,
    InteractionTriggerComponent
  ]);
  
  return entity;
}
