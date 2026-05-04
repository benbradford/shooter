import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { Depth } from '../../../constants/DepthConstants';
import type { GridReader } from '../../../systems/grid/Grid';

const CHEST_EMPTY_FRAME = { x: 1031, y: 716, width: 410, height: 140 };
const CHEST_CLOSED_MAX_DIM = 384;
const CHEST_SCALE_FACTOR = 1.2;
const EMPTY_OFFSET_Y_PX = 13;

export type CreateOpenedRootChestProps = {
  readonly scene: Phaser.Scene;
  readonly col: number;
  readonly row: number;
  readonly grid: GridReader;
  readonly entityId: string;
};

export function createOpenedRootChestEntity(props: CreateOpenedRootChestProps): Entity {
  const { scene, col, row, grid, entityId } = props;
  const entity = new Entity(entityId);

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const scale = (grid.cellSize / CHEST_CLOSED_MAX_DIM) * CHEST_SCALE_FACTOR;
  const transform = entity.add(new TransformComponent(x, y, 0, scale));

  const texture = scene.textures.get('roots_chest');
  if (!texture.has('rc_chest_empty')) {
    texture.add('rc_chest_empty', 0, CHEST_EMPTY_FRAME.x, CHEST_EMPTY_FRAME.y, CHEST_EMPTY_FRAME.width, CHEST_EMPTY_FRAME.height);
  }

  const sprite = entity.add(new SpriteComponent(scene, 'roots_chest', transform));
  sprite.sprite.setFrame('rc_chest_empty');
  sprite.sprite.setDepth(Depth.breakable);
  sprite.visualOffsetYPx = EMPTY_OFFSET_Y_PX;

  entity.setUpdateOrder([TransformComponent, SpriteComponent]);

  return entity;
}
