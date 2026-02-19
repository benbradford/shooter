import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import type { Grid } from '../systems/grid/Grid';

export type CreatorData = {
  scene: Phaser.Scene;
  grid: Grid;
  entityId: string;
  playerEntity: Entity;
  entityManager: EntityManager;
  eventManager: EventManagerSystem;
}
