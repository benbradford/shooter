import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { Pathfinder } from '../../../systems/Pathfinder';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import type { PathFollower } from '../../systems/movement/PathFollower';

export type DestinationMoveResult = 'arrived' | 'moving' | 'use_pathfinding';

export class EscortPathfinding {
  private readonly pathfinder: Pathfinder;

  constructor(
    private readonly grid: GridReader,
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly pathFollower: PathFollower,
  ) {
    this.pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());
  }

  syncLayerWithPlayer(): void {
    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const escortGridPos = this.entity.get(GridPositionComponent);
    if (playerGridPos && escortGridPos) {
      escortGridPos.currentLayer = playerGridPos.currentLayer;
    }
  }

  getPlayerLayer(): number {
    return this.playerEntity.get(GridPositionComponent)?.currentLayer ?? 0;
  }

  recalculatePathToPlayer(): void {
    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const goalCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    const path = this.pathfinder.findPath(startCell.col, startCell.row, goalCell.col, goalCell.row, this.getPlayerLayer(), false, true);
    this.pathFollower.setPath(path);
  }

  recalculatePathToDestination(destinationCol: number, destinationRow: number): { fallback: boolean } {
    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);

    let path = this.pathfinder.findPath(
      startCell.col, startCell.row,
      destinationCol, destinationRow,
      this.getPlayerLayer(), false, true
    );

    path ??= this.findPathToAdjacentCell(this.pathfinder, startCell, destinationCol, destinationRow);

    if (!path) {
      return { fallback: true };
    }

    this.pathFollower.setPath(path);
    return { fallback: false };
  }

  checkDestinationReachable(destinationCol: number, destinationRow: number, reachDistance: number): boolean {
    const transform = this.entity.require(TransformComponent);
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const path = this.pathfinder.findPath(
      startCell.col, startCell.row,
      destinationCol, destinationRow,
      this.getPlayerLayer(), false, true
    );
    if (path && path.length <= reachDistance) {
      this.pathFollower.setPath(path);
      return true;
    }
    return false;
  }

  getDestinationWorldPos(destinationCol: number, destinationRow: number): { x: number; y: number } {
    return {
      x: destinationCol * this.grid.cellSize + this.grid.cellSize / 2,
      y: destinationRow * this.grid.cellSize + this.grid.cellSize / 2,
    };
  }

  moveDirectlyToward(
    destX: number, destY: number, speedPxPerSec: number, delta: number, arrivalThresholdPx: number,
  ): { result: DestinationMoveResult; direction: Direction } {
    const transform = this.entity.require(TransformComponent);
    const dx = destX - transform.x;
    const dy = destY - transform.y;
    const dist = Math.hypot(dx, dy);

    if (dist < arrivalThresholdPx) {
      transform.x = destX;
      transform.y = destY;
      return { result: 'arrived', direction: Direction.None };
    }

    if (dist >= this.grid.cellSize * 1.5) {
      return { result: 'use_pathfinding', direction: Direction.None };
    }

    const moveDist = speedPxPerSec * (delta / 1000);
    if (moveDist >= dist) {
      transform.x = destX;
      transform.y = destY;
    } else {
      transform.x += (dx / dist) * moveDist;
      transform.y += (dy / dist) * moveDist;
    }
    const dir = dirFromDelta(dx, dy);
    return { result: 'moving', direction: dir };
  }

  private findPathToAdjacentCell(
    pathfinder: Pathfinder,
    startCell: { col: number; row: number },
    destinationCol: number,
    destinationRow: number,
  ): Array<{ col: number; row: number }> | null {
    const offsets = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];
    let bestPath: Array<{ col: number; row: number }> | null = null;
    for (const { dc, dr } of offsets) {
      const path = pathfinder.findPath(
        startCell.col, startCell.row,
        destinationCol + dc, destinationRow + dr,
        this.getPlayerLayer(), false, true
      );
      if (path && (!bestPath || path.length < bestPath.length)) {
        bestPath = path;
      }
    }
    return bestPath;
  }
}
