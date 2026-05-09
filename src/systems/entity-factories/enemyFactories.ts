/**
 * Enemy entity factory registrations.
 * Side-effect import — registers factories with EntityRegistry.
 */
import type { EnemyDifficulty } from '../../constants/EnemyDifficulty';
import type { PumaDifficulty } from '../../ecs/entities/puma/PumaDifficulty';
import type { SkeletonDifficulty } from '../../ecs/entities/skeleton/SkeletonDifficultyConfig';
import { registerEntityFactory, type EntityCreationContext } from '../EntityRegistry';
import { Direction } from '../../constants/Direction';
import { WorldStateManager } from '../WorldStateManager';
import { GridPositionComponent } from '../../ecs/components/movement/GridPositionComponent';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { StateMachineComponent } from '../../ecs/components/core/StateMachineComponent';
import { SkeletonRiseComponent } from '../../ecs/components/visual/SkeletonRiseComponent';
import { ShadowComponent } from '../../ecs/components/visual/ShadowComponent';
import { createSkeletonEntity } from '../../ecs/entities/skeleton/SkeletonEntity';
import { createRedSkeletonEntity } from '../../ecs/entities/red_skeleton/RedSkeletonEntity';
import { createPumaEntity } from '../../ecs/entities/puma/PumaEntity';
import { createTvMonkEntity } from '../../ecs/entities/tvmonk/TvMonkEntity';
import { createThrowerEntity } from '../../ecs/entities/thrower/ThrowerEntity';
import { createStalkingRobotEntity } from '../../ecs/entities/robot/StalkingRobotEntity';
import { createBulletDudeEntity } from '../../ecs/entities/bulletdude/BulletDudeEntity';
import { createBugBaseEntity } from '../../ecs/entities/bug/BugBaseEntity';
import { createBugEntity } from '../../ecs/entities/bug/BugEntity';
import { createExhaustedBugBaseEntity } from '../../ecs/entities/bug/ExhaustedBugBaseEntity';
import { createBoneProjectileEntity } from '../../ecs/entities/skeleton/BoneProjectileEntity';
import { createGrenadeEntity } from '../../ecs/entities/projectile/GrenadeEntity';
import { getBugBaseDifficultyConfig } from '../../ecs/entities/bug/BugBaseDifficulty';
import { HealthDropOnDeathComponent } from '../../ecs/components/pickup/HealthDropOnDeathComponent';

const ENEMY_DROP_CHANCES: Record<string, number> = {
  skeleton: 0.2,
  red_skeleton: 0.2,
  mini_skeleton: 0.1,
  bug: 0.1,
  thrower: 0.05,
  puma: 0.25,
};

function addHealthDrop(entity: import('../../ecs/Entity').Entity, enemyType: string, ctx: EntityCreationContext): void {
  const chance = ENEMY_DROP_CHANCES[enemyType];
  if (chance) {
    entity.add(new HealthDropOnDeathComponent({
      dropChance: chance, scene: ctx.scene, playerEntity: ctx.player, entityManager: ctx.entityManager
    }));
  }
}

registerEntityFactory('skeleton', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => {
    const entity = createSkeletonEntity({
      scene: ctx.scene, grid: ctx.grid, entityId: entityDef.id,
      playerEntity: ctx.player, entityManager: ctx.entityManager, eventManager: ctx.eventManager,
      col: data.col as number, row: data.row as number, difficulty: data.difficulty as EnemyDifficulty,
      onThrowBone: (x, y, dirX, dirY) => {
        ctx.entityManager.add(createBoneProjectileEntity({
          scene: ctx.scene, x, y, dirX, dirY, grid: ctx.grid,
          layer: ctx.player.require(GridPositionComponent).currentLayer,
          blockedAreaManager: ctx.blockedAreaManager,
        }));
      }
    });
    addHealthDrop(entity, 'skeleton', ctx);
    return entity;
  };
});

registerEntityFactory('red_skeleton', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => {
    const entity = createRedSkeletonEntity({
      scene: ctx.scene, grid: ctx.grid, entityId: entityDef.id,
      playerEntity: ctx.player, entityManager: ctx.entityManager, eventManager: ctx.eventManager,
      col: data.col as number, row: data.row as number, difficulty: data.difficulty as EnemyDifficulty,
      onThrowBone: (x, y, dirX, dirY) => {
        ctx.entityManager.add(createBoneProjectileEntity({
          scene: ctx.scene, x, y, dirX, dirY, grid: ctx.grid,
          layer: ctx.player.require(GridPositionComponent).currentLayer,
          blockedAreaManager: ctx.blockedAreaManager, tint: 0xff4444,
        }));
      },
      onSpawnMiniSkeletons: (x, y, difficulty, _layer) => {
        spawnMiniSkeletons(x, y, difficulty, ctx);
      }
    });
    addHealthDrop(entity, 'red_skeleton', ctx);
    return entity;
  };
});

registerEntityFactory('puma', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => {
    const entity = createPumaEntity({
      scene: ctx.scene, col: data.col as number, row: data.row as number,
      grid: ctx.grid, playerEntity: ctx.player,
      difficulty: (data.difficulty as PumaDifficulty) || 'medium',
      startDirection: (data.startDirection as Direction) || Direction.Down,
      entityId: entityDef.id
    });
    addHealthDrop(entity, 'puma', ctx);
    return entity;
  };
});

registerEntityFactory('tv_monk', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => createTvMonkEntity({
    scene: ctx.scene, grid: ctx.grid, col: data.col as number, row: data.row as number,
    entityId: entityDef.id, playerEntity: ctx.player, eventManager: ctx.eventManager,
  });
});

registerEntityFactory('stalking_robot', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty; waypoints: Array<{ col: number; row: number }> };
  const x = data.col * ctx.grid.cellSize + ctx.grid.cellSize / 2;
  const y = data.row * ctx.grid.cellSize + ctx.grid.cellSize / 2;
  return () => createStalkingRobotEntity({
    scene: ctx.scene, x, y, grid: ctx.grid, playerEntity: ctx.player,
    waypoints: data.waypoints, difficulty: data.difficulty
  });
});

registerEntityFactory('thrower', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty };
  return () => createThrowerEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    playerEntity: ctx.player, difficulty: data.difficulty, entityId: entityDef.id,
    onThrow: (x, y, dirX, dirY, maxDistancePx, speedPxPerSec) => {
      ctx.entityManager.add(createGrenadeEntity({ scene: ctx.scene, x, y, dirX, dirY, maxDistancePx, speedPxPerSec }));
    }
  });
});

registerEntityFactory('bullet_dude', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty };
  return () => createBulletDudeEntity({
    scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
    playerEntity: ctx.player, difficulty: data.difficulty,
    entityManager: ctx.entityManager, entityId: entityDef.id
  });
});

registerEntityFactory('bug_base', (entityDef, ctx) => {
  const data = entityDef.data as { col: number; row: number; difficulty: EnemyDifficulty };
  const levelState = WorldStateManager.getInstance().getLevelState(ctx.levelData.name!);
  return () => {
    if (levelState.destroyedEntities.includes(entityDef.id)) {
      return createExhaustedBugBaseEntity({ scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid, entityId: `${entityDef.id}_exhausted` });
    }
    const config = getBugBaseDifficultyConfig(data.difficulty);
    return createBugBaseEntity({
      scene: ctx.scene, col: data.col, row: data.row, grid: ctx.grid,
      playerEntity: ctx.player, difficulty: data.difficulty, entityId: entityDef.id,
      entityManager: ctx.entityManager,
      onSpawnBug: (spawnCol, spawnRow) => {
        ctx.entityManager.add(createBugEntity({
          scene: ctx.scene, col: data.col, row: data.row, spawnCol, spawnRow,
          grid: ctx.grid, playerEntity: ctx.player, speed: config.bugSpeed, health: config.bugHealth
        }));
      }
    });
  };
});

let miniSkeletonCounter = 0;

function spawnMiniSkeletons(x: number, y: number, difficulty: SkeletonDifficulty, ctx: EntityCreationContext): void {
  const MINI_SCALE = 0.8;
  const OFFSET_PX = 20;
  const MINI_COUNT = 4;
  const sourceCell = ctx.grid.worldToCell(x, y);

  for (let i = 0; i < MINI_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / MINI_COUNT;
    const id = `mini_skeleton${miniSkeletonCounter++}`;
    const mini = createSkeletonEntity({
      scene: ctx.scene, grid: ctx.grid, entityId: id,
      playerEntity: ctx.player, entityManager: ctx.entityManager, eventManager: ctx.eventManager,
      col: sourceCell.col, row: sourceCell.row, difficulty,
      onThrowBone: (bx, by, dirX, dirY) => {
        ctx.entityManager.add(createBoneProjectileEntity({
          scene: ctx.scene, x: bx, y: by, dirX, dirY, grid: ctx.grid,
          layer: ctx.player.require(GridPositionComponent).currentLayer,
          blockedAreaManager: ctx.blockedAreaManager, scaleOverride: 0.08,
        }));
      }
    });
    mini.remove(SkeletonRiseComponent);
    mini.require(StateMachineComponent).stateMachine.enter('idle');
    const miniTransform = mini.require(TransformComponent);
    miniTransform.scale = MINI_SCALE;
    miniTransform.x = x + Math.cos(angle) * OFFSET_PX;
    miniTransform.y = y + Math.sin(angle) * OFFSET_PX;
    const shadow = mini.get(ShadowComponent);
    if (shadow?.shadow) {
      mini.remove(ShadowComponent);
      mini.add(new ShadowComponent(ctx.scene, { scale: MINI_SCALE * 0.5, offsetX: 3, offsetY: 12 })).init();
    }
    ctx.entityManager.add(mini);
  }
}
