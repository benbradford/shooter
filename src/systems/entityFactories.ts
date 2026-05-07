import type { Entity } from '../ecs/Entity';
import type { EnemyDifficulty } from '../constants/EnemyDifficulty';
import type { Rarity } from '../constants/Rarity';
import type { PumaDifficulty } from '../ecs/entities/puma/PumaDifficulty';
import type { SkeletonDifficulty } from '../ecs/entities/skeleton/SkeletonDifficultyConfig';
import type { CellProperty } from './grid/Grid';
import type { EscortState } from '../ecs/components/escort/EscortComponent';
import type GameScene from '../scenes/GameScene';
import { registerEntityFactory, type EntityCreationContext } from './EntityRegistry';
import { Direction } from '../constants/Direction';
import { WorldStateManager } from './WorldStateManager';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { SkeletonRiseComponent } from '../ecs/components/visual/SkeletonRiseComponent';
import { ShadowComponent } from '../ecs/components/visual/ShadowComponent';
import { EscortPersistence } from '../ecs/components/escort/EscortPersistence';
import { createSkeletonEntity } from '../ecs/entities/skeleton/SkeletonEntity';
import { createRedSkeletonEntity } from '../ecs/entities/red_skeleton/RedSkeletonEntity';
import { createPumaEntity } from '../ecs/entities/puma/PumaEntity';
import { createTvMonkEntity } from '../ecs/entities/tvmonk/TvMonkEntity';
import { createThrowerEntity } from '../ecs/entities/thrower/ThrowerEntity';
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
import { createBoneProjectileEntity } from '../ecs/entities/skeleton/BoneProjectileEntity';
import { createGrenadeEntity } from '../ecs/entities/projectile/GrenadeEntity';
import { getBugBaseDifficultyConfig } from '../ecs/entities/bug/BugBaseDifficulty';

registerEntityFactory('skeleton', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => createSkeletonEntity({
    scene: ctx.scene,
    grid: ctx.grid,
    entityId: entityDef.id,
    playerEntity: ctx.player,
    entityManager: ctx.entityManager,
    eventManager: ctx.eventManager,
    col: data.col as number,
    row: data.row as number,
    difficulty: data.difficulty as EnemyDifficulty,
    onThrowBone: (x, y, dirX, dirY) => {
      const bone = createBoneProjectileEntity({
        scene: ctx.scene, x, y, dirX, dirY,
        grid: ctx.grid,
        layer: ctx.player.require(GridPositionComponent).currentLayer,
        blockedAreaManager: ctx.blockedAreaManager,
      });
      ctx.entityManager.add(bone);
    }
  });
});

registerEntityFactory('red_skeleton', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => createRedSkeletonEntity({
    scene: ctx.scene,
    grid: ctx.grid,
    entityId: entityDef.id,
    playerEntity: ctx.player,
    entityManager: ctx.entityManager,
    eventManager: ctx.eventManager,
    col: data.col as number,
    row: data.row as number,
    difficulty: data.difficulty as EnemyDifficulty,
    onThrowBone: (x, y, dirX, dirY) => {
      const bone = createBoneProjectileEntity({
        scene: ctx.scene, x, y, dirX, dirY,
        grid: ctx.grid,
        layer: ctx.player.require(GridPositionComponent).currentLayer,
        blockedAreaManager: ctx.blockedAreaManager,
        tint: 0xff4444,
      });
      ctx.entityManager.add(bone);
    },
    onSpawnMiniSkeletons: (x, y, difficulty, layer) => {
      spawnMiniSkeletons(x, y, difficulty, layer, ctx);
    }
  });
});

registerEntityFactory('puma', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => createPumaEntity({
    scene: ctx.scene,
    col: data.col as number,
    row: data.row as number,
    grid: ctx.grid,
    playerEntity: ctx.player,
    difficulty: (data.difficulty as PumaDifficulty) || 'medium',
    startDirection: (data.startDirection as Direction) || Direction.Down,
    entityId: entityDef.id
  });
});

registerEntityFactory('tv_monk', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => createTvMonkEntity({
    scene: ctx.scene,
    grid: ctx.grid,
    col: data.col as number,
    row: data.row as number,
    entityId: entityDef.id,
    playerEntity: ctx.player,
    eventManager: ctx.eventManager,
  });
});

registerEntityFactory('trigger', (entityDef, ctx) => {
  const data = entityDef.data as { eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean };
  return () => createTriggerEntity({
    entityId: entityDef.id,
    grid: ctx.grid,
    eventManager: ctx.eventManager,
    eventName: data.eventToRaise,
    triggerCells: data.triggerCells,
    oneShot: data.oneShot ?? true
  });
});

registerEntityFactory('exit', (entityDef, ctx) => {
  const data = entityDef.data as { targetLevel: string; targetCol: number; targetRow: number; triggerCells: Array<{ col: number; row: number }>; oneShot?: boolean };
  const eventName = `exit_${entityDef.id}`;
  return () => {
    const trigger = createTriggerEntity({
      entityId: `${entityDef.id}_trigger`,
      grid: ctx.grid,
      eventManager: ctx.eventManager,
      eventName,
      triggerCells: data.triggerCells,
      oneShot: data.oneShot ?? true
    });
    ctx.entityManager.add(trigger);

    return createLevelExitEntity({
      eventManager: ctx.eventManager,
      eventName,
      targetLevel: data.targetLevel,
      targetCol: data.targetCol,
      targetRow: data.targetRow,
      onTransition: (targetLevel, targetCol, targetRow) => {
        ctx.onTransition(targetLevel, targetCol, targetRow);
      }
    });
  };
});

registerEntityFactory('breakable', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; texture: string; health: number; rarity?: string; requiresSuperPunch?: boolean; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
  return () => createBreakableEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    texture: data.texture,
    health: data.health,
    entityId: entityDef.id,
    rarity: (data.rarity as Rarity) ?? 'nothing',
    requiresSuperPunch: data.requiresSuperPunch ?? false,
    transformOverride: data.transformOverride,
    playerEntity: ctx.player,
    onSpawnCoin: (x, y, velocityX, velocityY, targetY) => {
      const coin = createCoinEntity({
        scene: ctx.scene, x, y, velocityX, velocityY, targetY,
        grid: ctx.grid,
        playerEntity: ctx.player,
        scale: COIN_SPRITE_SCALE,
        coinSize: COIN_SIZE_PX
      });
      ctx.entityManager.add(coin);
    },
    onSpawnMedipack: (x, y) => {
      const medipack = createMedipackEntity({ scene: ctx.scene, x, y, playerEntity: ctx.player });
      ctx.entityManager.add(medipack);
    }
  });
});

registerEntityFactory('collectible', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; preset: string };
  return () => createCollectibleEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    entityId: entityDef.id,
    preset: (data.preset ?? 'mist_orb') as 'mist_orb',
    playerEntity: ctx.player,
  });
});

registerEntityFactory('root_chest', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; specialItem: string };
  return () => createRootChestEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    entityId: entityDef.id,
    specialItem: data.specialItem ?? 'mushroom',
    entityManager: ctx.entityManager,
    eventManager: ctx.eventManager,
    playerEntity: ctx.player,
  });
});

registerEntityFactory('lever', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; eventToRaise: string; startState?: string; oneShot?: boolean };
  return () => createLeverEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    entityId: entityDef.id,
    eventToRaise: data.eventToRaise,
    startState: (data.startState as 'on' | 'off') ?? 'off',
    oneShot: data.oneShot ?? false,
    eventManager: ctx.eventManager,
  });
});

registerEntityFactory('stalking_robot', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty; waypoints: Array<{ col: number; row: number }> };
  const x = data.col * ctx.grid.cellSize + ctx.grid.cellSize / 2;
  const y = data.row * ctx.grid.cellSize + ctx.grid.cellSize / 2;
  return () => createStalkingRobotEntity({
    scene: ctx.scene,
    x, y,
    grid: ctx.grid,
    playerEntity: ctx.player,
    waypoints: data.waypoints,
    difficulty: data.difficulty
  });
});

registerEntityFactory('thrower', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty };
  return () => createThrowerEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    playerEntity: ctx.player,
    difficulty: data.difficulty,
    entityId: entityDef.id,
    onThrow: (x, y, dirX, dirY, maxDistancePx, speedPxPerSec) => {
      const grenade = createGrenadeEntity({ scene: ctx.scene, x, y, dirX, dirY, maxDistancePx, speedPxPerSec });
      ctx.entityManager.add(grenade);
    }
  });
});

registerEntityFactory('bullet_dude', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty };
  return () => createBulletDudeEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    playerEntity: ctx.player,
    difficulty: data.difficulty,
    entityManager: ctx.entityManager,
    entityId: entityDef.id
  });
});

registerEntityFactory('bug_base', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty };
  const levelState = WorldStateManager.getInstance().getLevelState(ctx.levelData.name!);

  return () => {
    if (levelState.destroyedEntities.includes(entityDef.id)) {
      return createExhaustedBugBaseEntity({
        scene: ctx.scene,
        col: data.col,
        row: data.row,
        grid: ctx.grid,
        entityId: `${entityDef.id}_exhausted`
      });
    }

    const config = getBugBaseDifficultyConfig(data.difficulty);
    return createBugBaseEntity({
      scene: ctx.scene,
      col: data.col,
      row: data.row,
      grid: ctx.grid,
      playerEntity: ctx.player,
      difficulty: data.difficulty,
      entityId: entityDef.id,
      entityManager: ctx.entityManager,
      onSpawnBug: (spawnCol, spawnRow) => {
        const bug = createBugEntity({
          scene: ctx.scene,
          col: data.col,
          row: data.row,
          spawnCol, spawnRow,
          grid: ctx.grid,
          playerEntity: ctx.player,
          speed: config.bugSpeed,
          health: config.bugHealth
        });
        ctx.entityManager.add(bug);
      }
    });
  };
});

registerEntityFactory('eventchainer', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => createEventChainerEntity({
    eventManager: ctx.eventManager,
    eventsToRaise: data.eventsToRaise as Array<{ event: string; delayMs: number }>,
    startOnEvent: undefined,
    entityId: entityDef.id
  });
});

registerEntityFactory('cellmodifier', (entityDef, ctx) => {
  const data = entityDef.data as { cellsToModify: Array<{ col: number; row: number; properties?: CellProperty[]; backgroundTexture?: string; layer?: number }> };
  return () => createCellModifierEntity({
    grid: ctx.grid,
    scene: ctx.scene,
    entityId: entityDef.id,
    cellsToModify: data.cellsToModify
  });
});

registerEntityFactory('interaction', (entityDef, ctx) => {
  const data = entityDef.data as { filename: string };
  return () => createInteractionEntity({
    scene: ctx.scene as GameScene,
    entityId: entityDef.id,
    filename: data.filename
  });
});

registerEntityFactory('npc', (entityDef, ctx) => {
  const data = entityDef.data as {
    assets: string; col: number; row: number; direction: string;
    interactions: NPCInteraction[]; scale?: number; name?: string;
    transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number };
  };
  return () => createNPCEntity({
    scene: ctx.scene as GameScene,
    grid: ctx.grid,
    entityId: entityDef.id,
    assets: data.assets,
    col: data.col,
    row: data.row,
    direction: Direction[data.direction as keyof typeof Direction] ?? Direction.Down,
    interactions: data.interactions ?? [],
    scale: data.scale,
    name: data.name,
    facePlayer: data.direction === 'facePlayer',
    transformOverride: data.transformOverride,
  });
});

registerEntityFactory('pushable', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; texture: string; pushEnabled?: boolean; doesPersist?: boolean; singlePushOnly?: boolean };
  const levelState = WorldStateManager.getInstance().getLevelState(ctx.levelData.name!);
  const movedEntry = levelState.movedEntities?.find((e: { id: string }) => e.id === entityDef.id);
  const spawnCol = movedEntry?.col ?? data.col;
  const spawnRow = movedEntry?.row ?? data.row;
  const spawnCell = ctx.grid.getCell(spawnCol, spawnRow);
  const isLocked = spawnCell?.properties.has('push_lock') ?? false;
  return () => createPushableEntity({
    scene: ctx.scene,
    col: spawnCol,
    row: spawnRow,
    grid: ctx.grid,
    texture: data.texture,
    pushEnabled: isLocked ? false : (data.pushEnabled ?? true),
    doesPersist: data.doesPersist ?? false,
    singlePushOnly: data.singlePushOnly ?? false,
    entityId: entityDef.id,
    originalCol: data.col,
    originalRow: data.row,
  });
});

registerEntityFactory('hole', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; texture?: string; targetLevel: string; targetCol: number; targetRow: number; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
  return () => createHoleEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    texture: data.texture ?? 'hole_with_roots',
    entityId: entityDef.id,
    targetLevel: data.targetLevel,
    targetCol: data.targetCol,
    targetRow: data.targetRow,
    transformOverride: data.transformOverride,
    onTransition: (targetLevel, targetCol, targetRow) => {
      ctx.onTransition(targetLevel, targetCol, targetRow);
    }
  });
});

registerEntityFactory('laser', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; angle: number; flagName?: string; onDestroyEvent?: string };
  return () => createLaserEntity({
    scene: ctx.scene,
    col: data.col,
    row: data.row,
    grid: ctx.grid,
    entityId: entityDef.id,
    angle: data.angle ?? 0,
    flagName: data.flagName ?? `${entityDef.id}_laser_on`,
    blockedAreaManager: ctx.blockedAreaManager,
    entityManager: ctx.entityManager,
    onDestroyEvent: data.onDestroyEvent,
    eventManager: ctx.eventManager,
  });
});

registerEntityFactory('escort', (entityDef, ctx) => {
  const data = entityDef.data as {
    col: number; row: number; escortType?: string; awakeOnEvent?: string;
    destinationLevel?: string; destinationCol?: number; destinationRow?: number;
    reachDistance?: number; followSpeed?: number; followToLevels?: string[];
    enemyDetectDistancePx?: number; scale?: number;
    shadowScale?: number; shadowOffsetX?: number; shadowOffsetY?: number;
  };
  const ep = new EscortPersistence();
  let initialState: EscortState = 'dormant';
  const levelState = WorldStateManager.getInstance().getLevelState(ctx.levelData.name!);

  if (ep.isCompleted(entityDef.id)) {
    const completedLevel = ep.getCompletedLevel(entityDef.id);
    if (completedLevel && completedLevel !== (ctx.levelData.name ?? '')) {
      return () => null as unknown as Entity;
    }
    initialState = 'completed';
  } else if (ep.getCurrentEscortId() === entityDef.id) {
    initialState = 'following';
    ep.persistDefinition(entityDef.id, {
      escortType: data.escortType ?? 'knight',
      originLevel: ctx.levelData.name ?? '',
      destinationLevel: data.destinationLevel ?? '',
      destinationCol: data.destinationCol ?? 0,
      destinationRow: data.destinationRow ?? 0,
      reachDistance: data.reachDistance ?? 15,
      followSpeed: data.followSpeed ?? 200,
      followToLevels: data.followToLevels ?? [],
      enemyDetectDistancePx: data.enemyDetectDistancePx ?? 128,
      scale: data.scale,
      shadowScale: data.shadowScale,
      shadowOffsetX: data.shadowOffsetX,
      shadowOffsetY: data.shadowOffsetY,
    });
  }

  const movedEntry = levelState.movedEntities?.find((e: { id: string }) => e.id === entityDef.id);
  let spawnCol: number;
  let spawnRow: number;

  if (initialState === 'following' && !movedEntry) {
    const spawnPos = WorldStateManager.getInstance().getPlayerSpawnPosition();
    spawnCol = spawnPos.col ?? data.col;
    spawnRow = spawnPos.row ?? data.row;
    initialState = 'waiting_for_player_move';
  } else {
    spawnCol = movedEntry?.col ?? data.col;
    spawnRow = movedEntry?.row ?? data.row;
  }

  return () => createEscortEntity({
    scene: ctx.scene,
    grid: ctx.grid,
    entityId: entityDef.id,
    col: spawnCol,
    row: spawnRow,
    playerEntity: ctx.player,
    entityManager: ctx.entityManager,
    eventManager: ctx.eventManager,
    escortType: data.escortType ?? 'knight',
    awakeOnEvent: data.awakeOnEvent ?? '',
    destinationLevel: data.destinationLevel ?? '',
    destinationCol: data.destinationCol ?? 0,
    destinationRow: data.destinationRow ?? 0,
    reachDistance: data.reachDistance ?? 15,
    followSpeed: data.followSpeed ?? 200,
    followToLevels: data.followToLevels ?? [],
    enemyDetectDistancePx: data.enemyDetectDistancePx ?? 128,
    initialState,
    currentLevelName: ctx.levelData.name ?? '',
    scale: data.scale,
    shadowScale: data.shadowScale,
    shadowOffsetX: data.shadowOffsetX,
    shadowOffsetY: data.shadowOffsetY,
  });
});

// Helper for mini skeleton spawning (used by red_skeleton)
let miniSkeletonCounter = 0;

function spawnMiniSkeletons(x: number, y: number, difficulty: SkeletonDifficulty, _layer: number, ctx: EntityCreationContext): void {
  const MINI_SCALE = 0.8;
  const OFFSET_PX = 20;
  const MINI_COUNT = 4;
  const sourceCell = ctx.grid.worldToCell(x, y);

  for (let i = 0; i < MINI_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / MINI_COUNT;
    const offsetX = Math.cos(angle) * OFFSET_PX;
    const offsetY = Math.sin(angle) * OFFSET_PX;

    const id = `mini_skeleton${miniSkeletonCounter++}`;
    const mini = createSkeletonEntity({
      scene: ctx.scene,
      grid: ctx.grid,
      entityId: id,
      playerEntity: ctx.player,
      entityManager: ctx.entityManager,
      eventManager: ctx.eventManager,
      col: sourceCell.col,
      row: sourceCell.row,
      difficulty,
      onThrowBone: (bx, by, dirX, dirY) => {
        const bone = createBoneProjectileEntity({
          scene: ctx.scene, x: bx, y: by, dirX, dirY,
          grid: ctx.grid,
          layer: ctx.player.require(GridPositionComponent).currentLayer,
          blockedAreaManager: ctx.blockedAreaManager,
          scaleOverride: 0.08,
        });
        ctx.entityManager.add(bone);
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
      const miniShadow = mini.add(new ShadowComponent(ctx.scene, {
        scale: MINI_SCALE * 0.5,
        offsetX: 3,
        offsetY: 12,
      }));
      miniShadow.init();
    }

    ctx.entityManager.add(mini);
  }
}
