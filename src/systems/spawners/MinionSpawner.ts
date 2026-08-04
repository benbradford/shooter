import type GameScene from '../../scenes/GameScene';
import { registerSpawner, type SpawnArgs } from './SpawnRegistry';
import { Entity } from '../../ecs/Entity';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../../ecs/components/core/SpriteComponent';
import { GridPositionComponent } from '../../ecs/components/movement/GridPositionComponent';
import { createMinionAnimations } from '../../ecs/entities/minion/MinionAnimations';
import { Depth } from '../../constants/DepthConstants';

const CELL_SIZE_PX = 64;
const HALF_CELL_PX = CELL_SIZE_PX / 2;
const MINION_GRID_COLLISION_BOX = { offsetX: 10, offsetY: 20, width: 28, height: 16 };
const FALL_DURATION_MS = 1300;
const SHADOW_WIDTH_PX = 15;
const SHADOW_HEIGHT_PX = 6;
const SHADOW_START_SCALE = 0.2;
const SHADOW_END_SCALE = 1;
const SHADOW_START_ALPHA = 0.1;
const SHADOW_END_ALPHA = 0.4;

type CellArg = { col: number; row: number };

function parseCellArg(arg: unknown): CellArg {
  const obj = arg as Record<string, number>;
  return { col: obj.col ?? obj[1] ?? 0, row: obj.row ?? obj[2] ?? 0 };
}

async function minionSpawner(scene: GameScene, entityId: string, args: SpawnArgs): Promise<void> {
  const startCell = parseCellArg(args.startCell ?? args.start_cell);

  createMinionAnimations(scene);

  const grid = scene.getGrid();
  const worldPos = grid.cellToWorld(startCell.col, startCell.row);
  const targetX = worldPos.x + HALF_CELL_PX;
  const targetY = worldPos.y + HALF_CELL_PX;

  // Start from top of visible screen
  const camera = scene.cameras.main;
  const startY = camera.scrollY - 40;

  // Shadow at landing spot
  const shadow = scene.add.ellipse(targetX, targetY + 9, SHADOW_WIDTH_PX, SHADOW_HEIGHT_PX, 0x000000);
  shadow.setAlpha(SHADOW_START_ALPHA);
  shadow.setScale(SHADOW_START_SCALE);
  shadow.setDepth(Depth.shadow);

  // Grow shadow as minion falls
  scene.tweens.add({
    targets: shadow,
    scaleX: SHADOW_END_SCALE,
    scaleY: SHADOW_END_SCALE,
    alpha: SHADOW_END_ALPHA,
    duration: FALL_DURATION_MS,
    ease: 'Sine.easeIn',
  });

  const entity = new Entity(entityId);
  entity.tags.add('enemy');
  entity.tags.add('interaction_active');

  const transform = entity.add(new TransformComponent(targetX, startY, 0, 0.5));
  const sprite = entity.add(new SpriteComponent(scene, 'minion', transform));
  sprite.sprite.setDepth(Depth.enemy);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, MINION_GRID_COLLISION_BOX));

  scene.entityManager.add(entity);

  // Play spawn (falling) animation while tweening down
  sprite.sprite.play('minion_spawn');

  await new Promise<void>(resolve => {
    scene.tweens.add({
      targets: transform,
      y: targetY,
      duration: FALL_DURATION_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => resolve(),
    });
  });

  // Land: destroy shadow, switch to idle north
  shadow.destroy();
  sprite.sprite.play('minion_idle_north');
}

registerSpawner('minion', minionSpawner);
