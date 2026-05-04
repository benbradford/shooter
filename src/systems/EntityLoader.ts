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
import { createPumaEntity } from '../ecs/entities/puma/PumaEntity';
import { createTvMonkEntity } from '../ecs/entities/tvmonk/TvMonkEntity';
import type { PumaDifficulty } from '../ecs/entities/puma/PumaDifficulty';
import { createThrowerEntity } from '../ecs/entities/thrower/ThrowerEntity';
import { Direction } from '../constants/Direction';
import { createStalkingRobotEntity } from '../ecs/entities/robot/StalkingRobotEntity';
import { createBulletDudeEntity } from '../ecs/entities/bulletdude/BulletDudeEntity';
import { createBugBaseEntity } from '../ecs/entities/bug/BugBaseEntity';
import { createBugEntity } from '../ecs/entities/bug/BugEntity';
import { createExhaustedBugBaseEntity } from '../ecs/entities/bug/ExhaustedBugBaseEntity';
import { createTriggerEntity } from '../trigger/TriggerEntity';
import { createLevelExitEntity } from '../exit/LevelExitEntity';
import { createBreakableEntity } from '../ecs/entities/breakable/BreakableEntity';
import { createCollectibleEntity } from '../ecs/entities/collectible/CollectibleEntity';
import { createLeverEntity } from '../ecs/entities/lever/LeverEntity';
import { createCoinEntity, COIN_SPRITE_SCALE, COIN_SIZE_PX } from '../ecs/entities/pickup/CoinEntity';
import { createMedipackEntity } from '../ecs/entities/pickup/MedipackEntity';
import { createEventChainerEntity } from '../eventchainer/EventChainerEntity';
import { createCellModifierEntity } from '../cellmodifier/CellModifierEntity';
import { createInteractionEntity } from '../interaction/InteractionEntity';
import { createNPCEntity, type NPCInteraction } from '../ecs/entities/npc/NPCEntity';
import { createPushableEntity } from '../ecs/entities/pushable/PushableEntity';
import { createHoleEntity } from '../ecs/entities/hole/HoleEntity';
import { createLaserEntity } from '../ecs/entities/laser/LaserEntity';
import { createEscortEntity } from '../ecs/entities/escort/EscortEntity';
import { createRootChestEntity } from '../ecs/entities/root_chest/RootChestEntity';
import { createOpenedRootChestEntity } from '../ecs/entities/root_chest/OpenedRootChestEntity';
import { createSpecialItemEntity } from '../ecs/entities/root_chest/SpecialItemEntity';
import type { EscortState } from '../ecs/components/escort/EscortComponent';
import { EscortPersistence } from '../ecs/components/escort/EscortPersistence';
import type GameScene from '../scenes/GameScene';
import { createBoneProjectileEntity } from '../ecs/entities/skeleton/BoneProjectileEntity';
import { createRedSkeletonEntity } from '../ecs/entities/red_skeleton/RedSkeletonEntity';
import type { SkeletonDifficulty } from '../ecs/entities/skeleton/SkeletonDifficultyConfig';
import { createGrenadeEntity } from '../ecs/entities/projectile/GrenadeEntity';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { SkeletonRiseComponent } from '../ecs/components/visual/SkeletonRiseComponent';
import { ShadowComponent } from '../ecs/components/visual/ShadowComponent';
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
            const worldState = WorldStateManager.getInstance();
            if (worldState.getFlag(`${baseId}_collected`) !== 'true') {
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

    // Load entities
    for (const entityDef of levelData.entities ?? []) {
      // Check if entity should be suppressed by flags
      if (entityDef.suppressOnAnyFlag) {
        const worldState = WorldStateManager.getInstance();
        let shouldSuppress = false;

        for (const flagCondition of entityDef.suppressOnAnyFlag) {
          if (worldState.isFlagCondition(flagCondition.name, flagCondition.condition, flagCondition.value)) {
            shouldSuppress = true;
            console.log(`[EntityLoader] Suppressing ${entityDef.id} at load due to flag: ${flagCondition.name} ${flagCondition.condition} ${flagCondition.value}`);
            break;
          }
        }

        if (shouldSuppress) {
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
        if (!entity) continue;
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
            const gameScene = this.scene as Phaser.Scene & { blockedAreaManager?: import('./BlockedAreaManager').BlockedAreaManager };
            const bone = createBoneProjectileEntity({
              scene: this.scene,
              x, y, dirX, dirY,
              grid: this.grid,
              layer: player.require(GridPositionComponent).currentLayer,
              blockedAreaManager: gameScene.blockedAreaManager,
            });
            this.entityManager.add(bone);
          }
        });

      case 'red_skeleton':
        return () => createRedSkeletonEntity({
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
            const gameScene = this.scene as Phaser.Scene & { blockedAreaManager?: import('./BlockedAreaManager').BlockedAreaManager };
            const bone = createBoneProjectileEntity({
              scene: this.scene, x, y, dirX, dirY,
              grid: this.grid,
              layer: player.require(GridPositionComponent).currentLayer,
              blockedAreaManager: gameScene.blockedAreaManager,
              tint: 0xff4444,
            });
            this.entityManager.add(bone);
          },
          onSpawnMiniSkeletons: (x, y, difficulty, layer) => {
            this.spawnMiniSkeletons(x, y, difficulty as SkeletonDifficulty, layer, player);
          }
        });

      case 'puma':
        return () => createPumaEntity({
          scene: this.scene,
          col: data.col as number,
          row: data.row as number,
          grid: this.grid,
          playerEntity: player,
          difficulty: (data.difficulty as PumaDifficulty) || 'medium',
          startDirection: (data.startDirection as Direction) || Direction.Down,
          entityId: entityDef.id
        });

      case 'tv_monk':
        return () => createTvMonkEntity({
          scene: this.scene,
          grid: this.grid,
          col: data.col as number,
          row: data.row as number,
          entityId: entityDef.id,
          playerEntity: player,
          eventManager: this.eventManager,
        });

      case 'trigger':
        return () => {
          const triggerData = data as { eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean };
          return createTriggerEntity({
            entityId: entityDef.id,
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
            entityId: `${entityDef.id}_trigger`,
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
          const breakableData = data as { col: number; row: number; texture: string; health: number; rarity?: string; requiresSuperPunch?: boolean; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
          return createBreakableEntity({
            scene: this.scene,
            col: breakableData.col,
            row: breakableData.row,
            grid: this.grid,
            texture: breakableData.texture,
            health: breakableData.health,
            entityId: entityDef.id,
            rarity: (breakableData.rarity as Rarity) ?? 'nothing',
            requiresSuperPunch: breakableData.requiresSuperPunch ?? false,
            transformOverride: breakableData.transformOverride,
            playerEntity: player,
            onSpawnCoin: (x, y, velocityX, velocityY, targetY) => {
              const coin = createCoinEntity({
                scene: this.scene,
                x, y, velocityX, velocityY, targetY,
                grid: this.grid,
                playerEntity: player,
                scale: COIN_SPRITE_SCALE,
                coinSize: COIN_SIZE_PX
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

      case 'collectible':
        return () => {
          const collectibleData = data as { col: number; row: number; preset: string };
          return createCollectibleEntity({
            scene: this.scene,
            col: collectibleData.col,
            row: collectibleData.row,
            grid: this.grid,
            entityId: entityDef.id,
            preset: (collectibleData.preset ?? 'mist_orb') as 'mist_orb',
            playerEntity: player,
          });
        };

      case 'root_chest':
        return () => {
          const chestData = data as { col: number; row: number; specialItem: string };
          return createRootChestEntity({
            scene: this.scene,
            col: chestData.col,
            row: chestData.row,
            grid: this.grid,
            entityId: entityDef.id,
            specialItem: chestData.specialItem ?? 'mushroom',
            entityManager: this.entityManager,
            eventManager: this.eventManager,
            playerEntity: player,
          });
        };

      case 'lever':
        return () => {
          const leverData = data as { col: number; row: number; eventToRaise: string; startState?: string; oneShot?: boolean };
          return createLeverEntity({
            scene: this.scene,
            col: leverData.col,
            row: leverData.row,
            grid: this.grid,
            entityId: entityDef.id,
            eventToRaise: leverData.eventToRaise,
            startState: (leverData.startState as 'on' | 'off') ?? 'off',
            oneShot: leverData.oneShot ?? false,
            eventManager: this.eventManager,
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
            entityId: entityDef.id
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

      case 'interaction':
        return () => {
          const interactionData = data as { filename: string };
          return createInteractionEntity({
            scene: this.scene as GameScene,
            entityId: entityDef.id,
            filename: interactionData.filename
          });
        };

      case 'npc':
        return () => {
          const npcData = data as {
            assets: string;
            col: number;
            row: number;
            direction: string;
            interactions: NPCInteraction[];
            scale?: number;
            name?: string;
            transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number };
          };
          return createNPCEntity({
            scene: this.scene as GameScene,
            grid: this.grid,
            entityId: entityDef.id,
            assets: npcData.assets,
            col: npcData.col,
            row: npcData.row,
            direction: Direction[npcData.direction as keyof typeof Direction] ?? Direction.Down,
            interactions: npcData.interactions ?? [],
            scale: npcData.scale,
            name: npcData.name,
            facePlayer: npcData.direction === 'facePlayer',
            transformOverride: npcData.transformOverride,
          });
        };

      case 'pushable':
        return () => {
          const pushableData = data as { col: number; row: number; texture: string; pushEnabled?: boolean; doesPersist?: boolean; singlePushOnly?: boolean };
          const movedEntry = levelState.movedEntities?.find((e: { id: string }) => e.id === entityDef.id);
          const spawnCol = movedEntry?.col ?? pushableData.col;
          const spawnRow = movedEntry?.row ?? pushableData.row;
          const spawnCell = this.grid.getCell(spawnCol, spawnRow);
          const isLocked = spawnCell?.properties.has('push_lock') ?? false;
          return createPushableEntity({
            scene: this.scene,
            col: spawnCol,
            row: spawnRow,
            grid: this.grid,
            texture: pushableData.texture,
            pushEnabled: isLocked ? false : (pushableData.pushEnabled ?? true),
            doesPersist: pushableData.doesPersist ?? false,
            singlePushOnly: pushableData.singlePushOnly ?? false,
            entityId: entityDef.id,
            originalCol: pushableData.col,
            originalRow: pushableData.row,
          });
        };

      case 'hole':
        return () => {
          const holeData = data as { col: number; row: number; texture?: string; targetLevel: string; targetCol: number; targetRow: number; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
          return createHoleEntity({
            scene: this.scene,
            col: holeData.col,
            row: holeData.row,
            grid: this.grid,
            texture: holeData.texture ?? 'hole_with_roots',
            entityId: entityDef.id,
            targetLevel: holeData.targetLevel,
            targetCol: holeData.targetCol,
            targetRow: holeData.targetRow,
            transformOverride: holeData.transformOverride,
            onTransition: (targetLevel, targetCol, targetRow) => {
              this.onTransition(targetLevel, targetCol, targetRow);
            }
          });
        };

      case 'laser':
        return () => {
          const laserData = data as { col: number; row: number; angle: number; flagName?: string; onDestroyEvent?: string };
          const gameScene = this.scene as Phaser.Scene & { blockedAreaManager?: import('./BlockedAreaManager').BlockedAreaManager };
          return createLaserEntity({
            scene: this.scene,
            col: laserData.col,
            row: laserData.row,
            grid: this.grid,
            entityId: entityDef.id,
            angle: laserData.angle ?? 0,
            flagName: laserData.flagName ?? `${entityDef.id}_laser_on`,
            blockedAreaManager: gameScene.blockedAreaManager,
            entityManager: this.entityManager,
            onDestroyEvent: laserData.onDestroyEvent,
            eventManager: this.eventManager,
          });
        };

      case 'escort': {
        const ep = new EscortPersistence();
        let initialState: EscortState = 'dormant';
        if (ep.isCompleted(entityDef.id)) {
          const completedLevel = ep.getCompletedLevel(entityDef.id);
          if (completedLevel && completedLevel !== (levelData.name ?? '')) {
            // Completed on a different level — don't spawn on origin level
            return () => null as unknown as Entity;
          }
          initialState = 'completed';
        } else if (ep.getCurrentEscortId() === entityDef.id) {
          initialState = 'following';
          // Re-persist definition flags in case they were lost (e.g., after death reset)
          const ed = data as { escortType?: string; destinationLevel?: string; destinationCol?: number; destinationRow?: number; reachDistance?: number; followSpeed?: number; followToLevels?: string[]; enemyDetectDistancePx?: number; scale?: number; shadowScale?: number; shadowOffsetX?: number; shadowOffsetY?: number };
          ep.persistDefinition(entityDef.id, {
            escortType: ed.escortType ?? 'knight',
            originLevel: levelData.name ?? '',
            destinationLevel: ed.destinationLevel ?? '',
            destinationCol: ed.destinationCol ?? 0,
            destinationRow: ed.destinationRow ?? 0,
            reachDistance: ed.reachDistance ?? 15,
            followSpeed: ed.followSpeed ?? 200,
            followToLevels: ed.followToLevels ?? [],
            enemyDetectDistancePx: ed.enemyDetectDistancePx ?? 128,
            scale: ed.scale,
            shadowScale: ed.shadowScale,
            shadowOffsetX: ed.shadowOffsetX,
            shadowOffsetY: ed.shadowOffsetY,
          });
        }
        const escortData = data as {
          col: number; row: number; escortType?: string; awakeOnEvent?: string;
          destinationLevel?: string; destinationCol?: number; destinationRow?: number;
          reachDistance?: number; followSpeed?: number; followToLevels?: string[];
          enemyDetectDistancePx?: number; scale?: number;
          shadowScale?: number; shadowOffsetX?: number; shadowOffsetY?: number;
        };
        const movedEntry = levelState.movedEntities?.find((e: { id: string }) => e.id === entityDef.id);
        let spawnCol: number;
        let spawnRow: number;

        if (initialState === 'following' && !movedEntry) {
          // Escort is actively following player back to origin level — spawn at player spawn
          const spawnPos = WorldStateManager.getInstance().getPlayerSpawnPosition();
          spawnCol = spawnPos.col ?? escortData.col;
          spawnRow = spawnPos.row ?? escortData.row;
          initialState = 'waiting_for_player_move';
        } else {
          spawnCol = movedEntry?.col ?? escortData.col;
          spawnRow = movedEntry?.row ?? escortData.row;
        }
        return () => createEscortEntity({
          scene: this.scene,
          grid: this.grid,
          entityId: entityDef.id,
          col: spawnCol,
          row: spawnRow,
          playerEntity: player,
          entityManager: this.entityManager,
          eventManager: this.eventManager,
          escortType: escortData.escortType ?? 'knight',
          awakeOnEvent: escortData.awakeOnEvent ?? '',
          destinationLevel: escortData.destinationLevel ?? '',
          destinationCol: escortData.destinationCol ?? 0,
          destinationRow: escortData.destinationRow ?? 0,
          reachDistance: escortData.reachDistance ?? 15,
          followSpeed: escortData.followSpeed ?? 200,
          followToLevels: escortData.followToLevels ?? [],
          enemyDetectDistancePx: escortData.enemyDetectDistancePx ?? 128,
          initialState,
          currentLevelName: levelData.name ?? '',
          scale: escortData.scale,
          shadowScale: escortData.shadowScale,
          shadowOffsetX: escortData.shadowOffsetX,
          shadowOffsetY: escortData.shadowOffsetY,
        });
      }

      default:
        console.warn(`[EntityLoader] Unknown entity type: ${entityDef.type}`);
        return null;
    }
  }

  private static miniSkeletonCounter = 0;

  private spawnMiniSkeletons(x: number, y: number, difficulty: SkeletonDifficulty, _layer: number, player: Entity): void {
    const MINI_SCALE = 0.8;
    const OFFSET_PX = 20;
    const MINI_COUNT = 4;
    const sourceCell = this.grid.worldToCell(x, y);

    for (let i = 0; i < MINI_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / MINI_COUNT;
      const offsetX = Math.cos(angle) * OFFSET_PX;
      const offsetY = Math.sin(angle) * OFFSET_PX;

      const id = `mini_skeleton${EntityLoader.miniSkeletonCounter++}`;
      const mini = createSkeletonEntity({
        scene: this.scene,
        grid: this.grid,
        entityId: id,
        playerEntity: player,
        entityManager: this.entityManager,
        eventManager: this.eventManager,
        col: sourceCell.col,
        row: sourceCell.row,
        difficulty,
        onThrowBone: (bx, by, dirX, dirY) => {
          const gameScene = this.scene as Phaser.Scene & { blockedAreaManager?: import('./BlockedAreaManager').BlockedAreaManager };
          const bone = createBoneProjectileEntity({
            scene: this.scene, x: bx, y: by, dirX, dirY,
            grid: this.grid,
            layer: player.require(GridPositionComponent).currentLayer,
            blockedAreaManager: gameScene.blockedAreaManager,
            scaleOverride: 0.08,
          });
          this.entityManager.add(bone);
        }
      });

      mini.remove(SkeletonRiseComponent);
      const sm = mini.require(StateMachineComponent);
      sm.stateMachine.enter('idle');

      const miniTransform = mini.require(TransformComponent);
      miniTransform.scale = MINI_SCALE;
      miniTransform.x = x + offsetX;
      miniTransform.y = y + offsetY;

      const shadow = mini.get(ShadowComponent);
      if (shadow?.shadow) {
        mini.remove(ShadowComponent);
        const miniShadow = mini.add(new ShadowComponent(this.scene, {
          scale: MINI_SCALE * 0.5,
          offsetX: 3,
          offsetY: 12,
        }));
        miniShadow.init();
      }

      this.entityManager.add(mini);
    }
  }
}
