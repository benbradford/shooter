import type GameScene from '../../scenes/GameScene';
import { registerSpawner, type SpawnArgs } from './SpawnRegistry';
import { Entity } from '../../ecs/Entity';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../../ecs/components/core/SpriteComponent';
import { GridPositionComponent } from '../../ecs/components/movement/GridPositionComponent';
import { NPCIdleComponent } from '../../ecs/entities/npc/NPCIdleComponent';
import { Direction } from '../../constants/Direction';
import { Depth } from '../../constants/DepthConstants';
import { createNPCAnimations } from '../../ecs/entities/npc/NPCAnimations';

const CELL_SIZE_PX = 64;
const HALF_CELL_PX = CELL_SIZE_PX / 2;
const NPC_GRID_COLLISION_BOX = { offsetX: 10, offsetY: 20, width: 28, height: 16 };

type CellArg = { col: number; row: number };

function parseCellArg(arg: unknown): CellArg {
  const obj = arg as Record<string, number>;
  return { col: obj.col ?? obj[1] ?? 0, row: obj.row ?? obj[2] ?? 0 };
}

async function silasSpawner(scene: GameScene, entityId: string, args: SpawnArgs): Promise<void> {
  const startCell = parseCellArg(args.startCell ?? args.start_cell);

  createNPCAnimations(scene, 'silas');

  const grid = scene.getGrid();
  const worldPos = grid.cellToWorld(startCell.col, startCell.row);
  const x = worldPos.x + HALF_CELL_PX;
  const y = worldPos.y + HALF_CELL_PX;

  const entity = new Entity(entityId);
  entity.tags.add('npc');
  entity.tags.add('interaction_active');

  const transform = entity.add(new TransformComponent(x, y, 0, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'silas', transform));
  sprite.sprite.setDepth(Depth.enemy);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, NPC_GRID_COLLISION_BOX));
  entity.add(new NPCIdleComponent(Direction.Down, 'silas', false));

  scene.entityManager.add(entity);
}

registerSpawner('silas', silasSpawner);
