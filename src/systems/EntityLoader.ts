import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import type { Grid, CellProperty } from '../systems/grid/Grid';
import type { LevelData, LevelEntity } from '../systems/level/LevelLoader';
import type { EnemyDifficulty } from '../constants/EnemyDifficulty';
import type { Rarity } from '../constants/Rarity';
import { EntityCreatorManager } from './EntityCreatorManager';
import { WorldStateManager } from './WorldStateManager';
import { createSkeletonEntity } from '../ecs/entities/skeleton/SkeletonEntity';
import { createThrowerEntity } from '../ecs/entities/thrower/ThrowerEntity';
import { createStalkingRobotEntity } from '../ecs/entities/robot/StalkingRobotEntity';
import { createBulletDudeEntity } from '../ecs/entities/bulletdude/BulletDudeEntity';
import { createBugBaseEntity } from '../ecs/entities/bug/BugBaseEntity';
import { createBugEntity } from '../ecs/entities/bug/BugEntity';
import { createExhaustedBugBaseEntity } from '../ecs/entities/bug/ExhaustedBugBaseEntity';
import { createTriggerEntity } from '../trigger/TriggerEntity';
import { createLevelExitEntity } from '../exit/LevelExitEntity';
import { createBreakableEntity } from '../ecs/entities/breakable/BreakableEntity';
import { createCoinEntity } from '../ecs/entities/pickup/CoinEntity';
import { createMedipackEntity } from '../ecs/entities/pickup/MedipackEntity';
import { createEventChainerEntity } from '../eventchainer/EventChainerEntity';
import { createCellModifierEntity } from '../cellmodifier/CellModifierEntity';
import { createBoneProjectileEntity } from '../ecs/entities/skeleton/BoneProjectileEntity';
import { createGrenadeEntity } from '../ecs/entities/projectile/GrenadeEntity';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { getBugBaseDifficultyConfig } from '../ecs/entities/bug/BugBaseDifficulty';

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
    const levelState = worldState.getLevelState(levelData.name!);
    
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
      }
    }

    // Load entities
    for (const entityDef of levelData.entities ?? []) {
      // Check if entity should be spawned based on world state
      if (!isEditorMode) {
        // Skip if destroyed
        if (levelState.destroyedEntities.includes(entityDef.id)) {
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
            const creatorFunc = this.createEntityCreator(entityDef, player, levelData);
            if (!creatorFunc) {
              throw new Error(`Unknown entity type: ${entityDef.type} for entity ${entityDef.id}`);
            }
            const entity = creatorFunc();
            entity.levelName = levelData.name;
            this.entityManager.add(entity);
            continue;
          } else {
            // Not spawned yet - register with creator manager
            const creatorFunc = this.createEntityCreator(entityDef, player, levelData);
            if (!creatorFunc) {
              throw new Error(`Unknown entity type: ${entityDef.type} for entity ${entityDef.id}`);
            }
            
            if (entityDef.createOnAnyEvent) {
              for (const event of entityDef.createOnAnyEvent) {
                this.entityCreatorManager.registerAny(event, creatorFunc, entityDef.id);
              }
            } else if (entityDef.createOnAllEvents) {
              this.entityCreatorManager.registerAll(entityDef.createOnAllEvents, creatorFunc, entityDef.id);
            }
            continue;
          }
        }
      }
      
      const creatorFunc = this.createEntityCreator(entityDef, player, levelData);
      
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
        entity.levelName = levelData.name;
        this.entityManager.add(entity);
      }
    }
  }

  private createEntityCreator(entityDef: LevelEntity, player: Entity, levelData: LevelData): (() => Entity) | null {
    const data = entityDef.data;
    const worldState = WorldStateManager.getInstance();
    const levelState = worldState.getLevelState(levelData.name!);
    
    switch (entityDef.type) {
      case 'skeleton':
        return () => createSkeletonEntity({
          scene: this.scene,
          grid: this.grid,
          entityId: entityDef.id,
          playerEntity: player,
          entityManager: this.entityManager,
          eventManager: this.eventManager,
          col: data.col as number,
          row: data.row as number,
          difficulty: data.difficulty as EnemyDifficulty,
          onThrowBone: (x, y, dirX, dirY) => {
            const bone = createBoneProjectileEntity({
              scene: this.scene,
              x, y, dirX, dirY,
              grid: this.grid,
              layer: player.require(GridPositionComponent).currentLayer
            });
            this.entityManager.add(bone);
          }
        });
      
      case 'trigger':
        return () => {
          const triggerData = data as { eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean };
          return createTriggerEntity({
            grid: this.grid,
            eventManager: this.eventManager,
            eventName: triggerData.eventToRaise,
            triggerCells: triggerData.triggerCells,
            oneShot: triggerData.oneShot ?? true
          });
        };
      
      case 'exit':
        return () => {
          const exitData = data as { targetLevel: string; targetCol: number; targetRow: number; triggerCells: Array<{ col: number; row: number }>; oneShot?: boolean };
          const eventName = `exit_${entityDef.id}`;
          
          const trigger = createTriggerEntity({
            grid: this.grid,
            eventManager: this.eventManager,
            eventName,
            triggerCells: exitData.triggerCells,
            oneShot: exitData.oneShot ?? true
          });
          this.entityManager.add(trigger);
          
          return createLevelExitEntity({
            eventManager: this.eventManager,
            eventName,
            targetLevel: exitData.targetLevel,
            targetCol: exitData.targetCol,
            targetRow: exitData.targetRow,
            onTransition: (targetLevel, targetCol, targetRow) => {
              this.onTransition(targetLevel, targetCol, targetRow);
            }
          });
        };
      
      case 'breakable':
        return () => {
          const breakableData = data as { col: number; row: number; texture: string; health: number; rarity?: string };
          return createBreakableEntity({
            scene: this.scene,
            col: breakableData.col,
            row: breakableData.row,
            grid: this.grid,
            texture: breakableData.texture,
            health: breakableData.health,
            entityId: entityDef.id,
            rarity: (breakableData.rarity as Rarity) ?? 'epic',
            playerEntity: player,
            onSpawnCoin: (x, y, velocityX, velocityY, targetY) => {
              const coin = createCoinEntity({
                scene: this.scene,
                x, y, velocityX, velocityY, targetY,
                grid: this.grid,
                playerEntity: player,
                scale: 0.2,
                coinSize: 32
              });
              this.entityManager.add(coin);
            },
            onSpawnMedipack: (x, y) => {
              const medipack = createMedipackEntity({
                scene: this.scene,
                x, y,
                playerEntity: player
              });
              this.entityManager.add(medipack);
            }
          });
        };
      
      case 'stalking_robot':
        return () => {
          const robotData = data as { col: number; row: number; difficulty: EnemyDifficulty; waypoints: Array<{ col: number; row: number }> };
          const x = robotData.col * this.grid.cellSize + this.grid.cellSize / 2;
          const y = robotData.row * this.grid.cellSize + this.grid.cellSize / 2;
          return createStalkingRobotEntity({
            scene: this.scene,
            x, y,
            grid: this.grid,
            playerEntity: player,
            waypoints: robotData.waypoints,
            difficulty: robotData.difficulty
          });
        };
      
      case 'thrower':
        return () => {
          const throwerData = data as { col: number; row: number; difficulty: EnemyDifficulty };
          return createThrowerEntity({
            scene: this.scene,
            col: throwerData.col,
            row: throwerData.row,
            grid: this.grid,
            playerEntity: player,
            difficulty: throwerData.difficulty,
            entityId: entityDef.id,
            onThrow: (x, y, dirX, dirY, maxDistancePx, speedPxPerSec) => {
              const grenade = createGrenadeEntity({
                scene: this.scene,
                x, y, dirX, dirY, maxDistancePx, speedPxPerSec
              });
              this.entityManager.add(grenade);
            }
          });
        };
      
      case 'bullet_dude':
        return () => {
          const bulletDudeData = data as { col: number; row: number; difficulty: EnemyDifficulty };
          return createBulletDudeEntity({
            scene: this.scene,
            col: bulletDudeData.col,
            row: bulletDudeData.row,
            grid: this.grid,
            playerEntity: player,
            difficulty: bulletDudeData.difficulty,
            entityManager: this.entityManager,
            id: entityDef.id
          });
        };
      
      case 'bug_base':
        return () => {
          const bugBaseData = data as { col: number; row: number; difficulty: EnemyDifficulty };
          
          if (levelState.destroyedEntities.includes(entityDef.id)) {
            const exhaustedId = `${entityDef.id}_exhausted`;
            return createExhaustedBugBaseEntity({
              scene: this.scene,
              col: bugBaseData.col,
              row: bugBaseData.row,
              grid: this.grid,
              entityId: exhaustedId
            });
          }
          
          const config = getBugBaseDifficultyConfig(bugBaseData.difficulty);
          return createBugBaseEntity({
            scene: this.scene,
            col: bugBaseData.col,
            row: bugBaseData.row,
            grid: this.grid,
            playerEntity: player,
            difficulty: bugBaseData.difficulty,
            entityId: entityDef.id,
            entityManager: this.entityManager,
            onSpawnBug: (spawnCol, spawnRow) => {
              const bug = createBugEntity({
                scene: this.scene,
                col: bugBaseData.col,
                row: bugBaseData.row,
                spawnCol,
                spawnRow,
                grid: this.grid,
                playerEntity: player,
                speed: config.bugSpeed,
                health: config.bugHealth
              });
              this.entityManager.add(bug);
            }
          });
        };
      
      case 'eventchainer':
        return () => createEventChainerEntity({
          eventManager: this.eventManager,
          eventsToRaise: data.eventsToRaise as Array<{ event: string; delayMs: number }>,
          startOnEvent: undefined,
          entityId: entityDef.id
        });
      
      case 'cellmodifier':
        return () => {
          const cellModifierData = data as { cellsToModify: Array<{ col: number; row: number; properties?: CellProperty[]; backgroundTexture?: string; layer?: number }> };
          return createCellModifierEntity({
            grid: this.grid,
            scene: this.scene,
            entityId: entityDef.id,
            cellsToModify: cellModifierData.cellsToModify
          });
        };
      
      default:
        console.warn(`[EntityLoader] Unknown entity type: ${entityDef.type}`);
        return null;
    }
  }
}
