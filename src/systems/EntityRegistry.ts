import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import type { Grid } from '../systems/grid/Grid';
import type { LevelData, LevelEntity, EntityType } from '../systems/level/LevelLoader';
import type { BlockedAreaManager } from './BlockedAreaManager';

export type EntityCreationContext = {
  scene: Phaser.Scene;
  grid: Grid;
  entityManager: EntityManager;
  eventManager: EventManagerSystem;
  player: Entity;
  levelData: LevelData;
  onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;
  blockedAreaManager?: BlockedAreaManager;
};

export type EntityFactory = (entityDef: LevelEntity, context: EntityCreationContext) => (() => Entity) | null;

const registry = new Map<EntityType, EntityFactory>();

export function registerEntityFactory(type: EntityType, factory: EntityFactory): void {
  registry.set(type, factory);
}

export function getEntityFactory(type: EntityType): EntityFactory | undefined {
  return registry.get(type);
}
