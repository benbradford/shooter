import { Entity } from '../../Entity';
import { DEPTH_EXHAUSTED_BASE } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import type { Grid } from '../../../systems/grid/Grid';

export type CreateExhaustedBugBaseProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  entityId: string;
}

export function createExhaustedBugBaseEntity(props: CreateExhaustedBugBaseProps): Entity {
  const { scene, col, row, grid, entityId } = props;

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;
  const baseScale = (grid.cellSize / 153) * 1.2 * 2;
  const finalScale = baseScale * 0.3;

  const entity = new Entity(entityId);
  const transform = entity.add(new TransformComponent(x, y, 0, finalScale));
  const sprite = entity.add(new SpriteComponent(scene, 'base_destroyed', transform));
  sprite.sprite.setDepth(DEPTH_EXHAUSTED_BASE);
  entity.setUpdateOrder([TransformComponent, SpriteComponent]);

  return entity;
}
