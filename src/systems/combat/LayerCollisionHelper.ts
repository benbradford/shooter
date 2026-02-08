import type { Entity } from '../../ecs/Entity';
import type { Grid } from '../grid/Grid';
import { GridPositionComponent } from '../../ecs/components/movement/GridPositionComponent';

export function canPlayerHitEnemy(playerEntity: Entity, enemyEntity: Entity, grid: Grid): boolean {
  const playerGridPos = playerEntity.get(GridPositionComponent);
  const enemyGridPos = enemyEntity.get(GridPositionComponent);
  
  if (!playerGridPos || !enemyGridPos) {
    return true;
  }

  const playerCell = grid.worldToCell(
    playerGridPos.currentCell.col * grid.cellSize + grid.cellSize / 2,
    playerGridPos.currentCell.row * grid.cellSize + grid.cellSize / 2
  );
  const playerCellData = grid.getCell(playerCell.col, playerCell.row);
  const isOnStairs = playerCellData ? grid.isTransition(playerCellData) : false;
  
  if (isOnStairs) {
    return true;
  }
  
  return playerGridPos.currentLayer === enemyGridPos.currentLayer;
}
