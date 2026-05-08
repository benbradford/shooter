/**
 * Gameplay entity factory registrations (breakable, collectible, lever, pushable, hole, laser, escort, npc, root_chest).
 * Side-effect import — registers factories with EntityRegistry.
 */
import type { Entity } from '../../ecs/Entity';
import type { Rarity } from '../../constants/Rarity';
import type { EscortState } from '../../ecs/components/escort/EscortComponent';
import type GameScene from '../../scenes/GameScene';
import { registerEntityFactory } from '../EntityRegistry';
import { Direction } from '../../constants/Direction';
import { WorldStateManager } from '../WorldStateManager';
import { EscortPersistence } from '../../ecs/components/escort/EscortPersistence';
import { createBreakableEntity } from '../../ecs/entities/breakable/BreakableEntity';
import { createCollectibleEntity } from '../../ecs/entities/collectible/CollectibleEntity';
import { createLeverEntity } from '../../ecs/entities/lever/LeverEntity';
import { createCoinEntity, COIN_SPRITE_SCALE, COIN_SIZE_PX } from '../../ecs/entities/pickup/CoinEntity';
import { createMedipackEntity } from '../../ecs/entities/pickup/MedipackEntity';
import { createNPCEntity, type NPCInteraction } from '../../ecs/entities/npc/NPCEntity';
import { createPushableEntity } from '../../ecs/entities/pushable/PushableEntity';
import { createHoleEntity } from '../../ecs/entities/hole/HoleEntity';
import { createLaserEntity } from '../../ecs/entities/laser/LaserEntity';
import { createEscortEntity } from '../../ecs/entities/escort/EscortEntity';
import { createRootChestEntity } from '../../ecs/entities/root_chest/RootChestEntity';

registerEntityFactory('breakable', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; texture: string; health: number; rarity?: string; requiresSuperPunch?: boolean; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
  return () => createBreakableEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    texture: data.texture, health: data.health, entityId: entityDef.id,
    rarity: (data.rarity as Rarity) ?? 'nothing', requiresSuperPunch: data.requiresSuperPunch ?? false,
    transformOverride: data.transformOverride, playerEntity: ctx.player,
    onSpawnCoin: (x, y, velocityX, velocityY, targetY) => {
      ctx.entityManager.add(createCoinEntity({
        scene: ctx.scene, x, y, velocityX, velocityY, targetY,
        grid: ctx.grid, playerEntity: ctx.player, scale: COIN_SPRITE_SCALE, coinSize: COIN_SIZE_PX
      }));
    },
    onSpawnMedipack: (x, y) => {
      ctx.entityManager.add(createMedipackEntity({ scene: ctx.scene, x, y, playerEntity: ctx.player }));
    }
  });
});

registerEntityFactory('collectible', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; preset: string };
  return () => createCollectibleEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    entityId: entityDef.id, preset: (data.preset ?? 'mist_orb') as 'mist_orb', playerEntity: ctx.player,
  });
});

registerEntityFactory('root_chest', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; specialItem: string };
  return () => createRootChestEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    entityId: entityDef.id, specialItem: data.specialItem ?? 'mushroom',
    entityManager: ctx.entityManager, eventManager: ctx.eventManager, playerEntity: ctx.player,
  });
});

registerEntityFactory('lever', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; eventToRaise: string; startState?: string; oneShot?: boolean };
  return () => createLeverEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    entityId: entityDef.id, eventToRaise: data.eventToRaise,
    startState: (data.startState as 'on' | 'off') ?? 'off', oneShot: data.oneShot ?? false,
    eventManager: ctx.eventManager,
  });
});

registerEntityFactory('npc', (entityDef, ctx) => {
  const data = entityDef.data as {
    assets: string; col: number; row: number; direction: string;
    interactions: NPCInteraction[]; scale?: number; name?: string;
    transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number };
  };
  return () => createNPCEntity({
    scene: ctx.scene as GameScene, grid: ctx.grid, entityId: entityDef.id,
    assets: data.assets, col: data.col, row: data.row,
    direction: Direction[data.direction as keyof typeof Direction] ?? Direction.Down,
    interactions: data.interactions ?? [], scale: data.scale, name: data.name,
    facePlayer: data.direction === 'facePlayer', transformOverride: data.transformOverride,
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
    scene: ctx.scene, col: spawnCol, row: spawnRow, grid: ctx.grid,
    texture: data.texture, pushEnabled: isLocked ? false : (data.pushEnabled ?? true),
    doesPersist: data.doesPersist ?? false, singlePushOnly: data.singlePushOnly ?? false,
    entityId: entityDef.id, originalCol: data.col, originalRow: data.row,
  });
});

registerEntityFactory('hole', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; texture?: string; targetLevel: string; targetCol: number; targetRow: number; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
  return () => createHoleEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    texture: data.texture ?? 'hole_with_roots', entityId: entityDef.id,
    targetLevel: data.targetLevel, targetCol: data.targetCol, targetRow: data.targetRow,
    transformOverride: data.transformOverride,
    onTransition: (targetLevel, targetCol, targetRow) => { ctx.onTransition(targetLevel, targetCol, targetRow); }
  });
});

registerEntityFactory('laser', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; angle: number; flagName?: string; onDestroyEvent?: string };
  return () => createLaserEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    entityId: entityDef.id, angle: data.angle ?? 0, flagName: data.flagName ?? `${entityDef.id}_laser_on`,
    blockedAreaManager: ctx.blockedAreaManager, entityManager: ctx.entityManager,
    onDestroyEvent: data.onDestroyEvent, eventManager: ctx.eventManager,
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
      escortType: data.escortType ?? 'knight', originLevel: ctx.levelData.name ?? '',
      destinationLevel: data.destinationLevel ?? '', destinationCol: data.destinationCol ?? 0,
      destinationRow: data.destinationRow ?? 0, reachDistance: data.reachDistance ?? 15,
      followSpeed: data.followSpeed ?? 200, followToLevels: data.followToLevels ?? [],
      enemyDetectDistancePx: data.enemyDetectDistancePx ?? 128, scale: data.scale,
      shadowScale: data.shadowScale, shadowOffsetX: data.shadowOffsetX, shadowOffsetY: data.shadowOffsetY,
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
    scene: ctx.scene, grid: ctx.grid, entityId: entityDef.id, col: spawnCol, row: spawnRow,
    playerEntity: ctx.player, entityManager: ctx.entityManager, eventManager: ctx.eventManager,
    escortType: data.escortType ?? 'knight', awakeOnEvent: data.awakeOnEvent ?? '',
    destinationLevel: data.destinationLevel ?? '', destinationCol: data.destinationCol ?? 0,
    destinationRow: data.destinationRow ?? 0, reachDistance: data.reachDistance ?? 15,
    followSpeed: data.followSpeed ?? 200, followToLevels: data.followToLevels ?? [],
    enemyDetectDistancePx: data.enemyDetectDistancePx ?? 128, initialState,
    currentLevelName: ctx.levelData.name ?? '', scale: data.scale,
    shadowScale: data.shadowScale, shadowOffsetX: data.shadowOffsetX, shadowOffsetY: data.shadowOffsetY,
  });
});
