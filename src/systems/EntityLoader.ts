import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import type { Grid } from '../systems/grid/Grid';
import type { LevelData, LevelEntity } from '../systems/level/LevelLoader';
import { EntityCreatorManager } from './EntityCreatorManager';
import { WorldStateManager } from './WorldStateManager';
import { createExhaustedBugBaseEntity } from '../ecs/entities/bug/ExhaustedBugBaseEntity';
import { createOpenedRootChestEntity } from '../ecs/entities/root_chest/OpenedRootChestEntity';
import { createSpecialItemEntity } from '../ecs/entities/root_chest/SpecialItemEntity';
import type { BlockedAreaManager } from './BlockedAreaManager';
import { getEntityFactory, type EntityCreationContext } from './EntityRegistry';
import './entityFactories'; // Side-effect import: registers all factories

export class EntityLoader {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid,
    private readonly entityManager: EntityManager,
    private readonly eventManager: EventManagerSystem,
    private readonly entityCreatorManager: EntityCreatorManager,
    private readonly onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void
  ) {}

  loadEntities(levelData: LevelData, player: Entity, isEditorMode: boolean = false): void {
    const worldState = WorldStateManager.getInstance();
    const levelState = worldState.getLevelState(levelData.name ?? '');

    // Validate unique IDs
    const ids = new Set<string>();
    for (const entityDef of levelData.entities ?? []) {
      if (ids.has(entityDef.id)) {
        throw new Error(`Duplicate entity ID: ${entityDef.id}`);
      }
      ids.add(entityDef.id);

      if (entityDef.createOnAnyEvent && entityDef.createOnAllEvents) {
        throw new Error(`Entity ${entityDef.id} has both createOnAnyEvent and createOnAllEvents - only one is allowed`);
      }
    }

    // Spawn exhausted bug bases from liveEntities
    if (!isEditorMode) {
      for (const liveEntityId of levelState.liveEntities) {
        if (liveEntityId.endsWith('_exhausted')) {
          const baseId = liveEntityId.replace('_exhausted', '');
          const baseEntity = levelData.entities?.find(e => e.id === baseId && e.type === 'bug_base');
          if (baseEntity) {
            const bugBaseData = baseEntity.data as { col: number; row: number };
            const exhaustedEntity = createExhaustedBugBaseEntity({
              scene: this.scene,
              col: bugBaseData.col,
              row: bugBaseData.row,
              grid: this.grid,
              entityId: liveEntityId
            });
            exhaustedEntity.levelName = levelData.name;
            this.entityManager.add(exhaustedEntity);
          }
        }

        // Spawn opened root chests + uncollected pickups
        if (liveEntityId.endsWith('_opened')) {
          const baseId = liveEntityId.replace('_opened', '');
          const baseEntity = levelData.entities?.find(e => e.id === baseId && e.type === 'root_chest');
          if (baseEntity) {
            const chestData = baseEntity.data as { col: number; row: number; specialItem: string };
            const openedEntity = createOpenedRootChestEntity({
              scene: this.scene,
              col: chestData.col,
              row: chestData.row,
              grid: this.grid,
              entityId: liveEntityId,
            });
            openedEntity.levelName = levelData.name;
            this.entityManager.add(openedEntity);

            // Spawn pickup if not yet collected
            const ws = WorldStateManager.getInstance();
            if (ws.getFlag(`${baseId}_collected`) !== 'true') {
              const worldPos = this.grid.cellToWorld(chestData.col, chestData.row);
              const pickup = createSpecialItemEntity({
                scene: this.scene,
                x: worldPos.x + this.grid.cellSize / 2,
                y: worldPos.y + this.grid.cellSize / 2,
                grid: this.grid,
                itemType: chestData.specialItem ?? 'mushroom',
                parentEntityId: baseId,
                playerEntity: player,
                eventManager: this.eventManager,
              });
              this.entityManager.add(pickup);
            }
          }
        }
      }
    }

    const gameScene = this.scene as Phaser.Scene & { blockedAreaManager?: BlockedAreaManager };
    const context: EntityCreationContext = {
      scene: this.scene,
      grid: this.grid,
      entityManager: this.entityManager,
      eventManager: this.eventManager,
      player,
      levelData,
      onTransition: this.onTransition,
      blockedAreaManager: gameScene.blockedAreaManager,
    };

    // Load entities
    for (const entityDef of levelData.entities ?? []) {
      // Check if entity should be suppressed by flags
      if (entityDef.suppressOnAnyFlag) {
        const ws = WorldStateManager.getInstance();
        let shouldSuppress = false;

        for (const flagCondition of entityDef.suppressOnAnyFlag) {
          if (ws.isFlagCondition(flagCondition.name, flagCondition.condition, flagCondition.value)) {
            shouldSuppress = true;
            console.log(`[EntityLoader] Suppressing ${entityDef.id} at load due to flag: ${flagCondition.name} ${flagCondition.condition} ${flagCondition.value}`);
            break;
          }
        }

        if (shouldSuppress) {
          continue;
        }
      }

      // Check if entity requires specific flags to be present
      if (entityDef.requireAnyFlag) {
        const ws = WorldStateManager.getInstance();
        let hasRequiredFlag = false;

        for (const flagCondition of entityDef.requireAnyFlag) {
          if (ws.isFlagCondition(flagCondition.name, flagCondition.condition, flagCondition.value)) {
            hasRequiredFlag = true;
            break;
          }
        }

        if (!hasRequiredFlag) {
          continue;
        }
      }

      // Check if entity should be spawned based on world state
      if (!isEditorMode) {
        // Skip if destroyed (unless respawnable)
        if (!entityDef.respawnable && levelState.destroyedEntities.includes(entityDef.id)) {
          continue;
        }

        // Skip triggers that already fired
        if (entityDef.type === 'trigger') {
          const triggerData = entityDef.data as { eventToRaise: string };
          if (levelState.firedTriggers.includes(triggerData.eventToRaise)) {
            continue;
          }
        }

        // For event-driven entities
        if (entityDef.createOnAnyEvent || entityDef.createOnAllEvents) {
          if (levelState.liveEntities.includes(entityDef.id)) {
            // Spawn it directly (was spawned and still alive)
            const creatorFunc = this.createEntityCreator(entityDef, context);
            if (!creatorFunc) {
              throw new Error(`Unknown entity type: ${entityDef.type} for entity ${entityDef.id}`);
            }
            const entity = creatorFunc();
            entity.levelName = levelData.name;
            this.entityManager.add(entity);
            continue;
          } else {
            // Not spawned yet - register with creator manager
            const creatorFunc = this.createEntityCreator(entityDef, context);
            if (!creatorFunc) {
              throw new Error(`Unknown entity type: ${entityDef.type} for entity ${entityDef.id}`);
            }

            // Auto-add suppressOnAnyFlag for interaction entities
            let suppressFlags = entityDef.suppressOnAnyFlag;
            if (entityDef.type === 'interaction') {
              const interactionData = entityDef.data as { filename: string };
              const autoFlag = {
                name: `${interactionData.filename}_live`,
                condition: 'eq' as const,
                value: 'true'
              };
              suppressFlags = suppressFlags ? [...suppressFlags, autoFlag] : [autoFlag];
            }

            if (entityDef.createOnAnyEvent) {
              for (const event of entityDef.createOnAnyEvent) {
                this.entityCreatorManager.registerAny(event, creatorFunc, entityDef.id, suppressFlags, entityDef.type === 'interaction');
              }
            } else if (entityDef.createOnAllEvents) {
              this.entityCreatorManager.registerAll(entityDef.createOnAllEvents, creatorFunc, entityDef.id, suppressFlags);
            }
            continue;
          }
        }
      }

      const creatorFunc = this.createEntityCreator(entityDef, context);

      if (!creatorFunc) {
        throw new Error(`Unknown entity type: ${entityDef.type} for entity ${entityDef.id}`);
      }

      if ((entityDef.createOnAnyEvent || entityDef.createOnAllEvents) && !isEditorMode) {
        if (entityDef.createOnAnyEvent) {
          for (const event of entityDef.createOnAnyEvent) {
            this.entityCreatorManager.registerAny(event, creatorFunc, entityDef.id);
          }
        } else if (entityDef.createOnAllEvents) {
          this.entityCreatorManager.registerAll(entityDef.createOnAllEvents, creatorFunc, entityDef.id);
        }
      } else {
        const entity = creatorFunc();
        if (!entity) continue;
        entity.levelName = levelData.name;
        this.entityManager.add(entity);
      }
    }
  }

  private createEntityCreator(entityDef: LevelEntity, context: EntityCreationContext): (() => Entity) | null {
    const factory = getEntityFactory(entityDef.type);
    if (!factory) {
      console.warn(`[EntityLoader] Unknown entity type: ${entityDef.type}`);
      return null;
    }
    return factory(entityDef, context);
  }
}
