import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';

const PLAYER_GRID_COLLISION_BOX_OFFSET_Y = 24;
const PLAYER_GRID_COLLISION_BOX_HEIGHT = 12;

export function getPlayerFeetCell(playerEntity: Entity, grid: { worldToCell: (x: number, y: number) => { col: number; row: number } }): { col: number; row: number } {
  const transform = playerEntity.require(TransformComponent);
  const feetY = transform.y + PLAYER_GRID_COLLISION_BOX_OFFSET_Y + PLAYER_GRID_COLLISION_BOX_HEIGHT / 2;
  return grid.worldToCell(transform.x, feetY);
}
