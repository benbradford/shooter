import type { Entity } from '../../Entity';
import type { GridReader, CellCoord, WorldCoord } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { InputComponent } from '../input/InputComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';

export type PendingJump = {
  landCol: number;
  landRow: number;
  dx: number;
  dy: number;
  isFallJump: boolean;
  isPlatformJump: boolean;
};

export class JumpDetector {
  private prevTransformX = 0;
  private prevTransformY = 0;
  private readonly _tmpCell: CellCoord = { col: 0, row: 0 };
  private readonly _tmpWorld: WorldCoord = { x: 0, y: 0 };

  constructor(
    private readonly grid: GridReader,
    private readonly hasScene: boolean
  ) {}

  updatePrevPosition(entity: Entity): void {
    const t = entity.get(TransformComponent);
    if (t) {
      this.prevTransformX = t.x;
      this.prevTransformY = t.y;
    }
  }

  detect(entity: Entity): PendingJump | null {
    const transform = entity.get(TransformComponent);
    if (!transform) return null;

    let moveX = 0;
    let moveY = 0;
    const walk = entity.get(WalkComponent);
    if (walk) {
      if (this.hasScene) {
        const input = entity.get(InputComponent);
        if (!input?.hasInput()) return null;
      }
      moveX = walk.lastMoveX;
      moveY = walk.lastMoveY;
    } else {
      moveX = transform.x - this.prevTransformX;
      moveY = transform.y - this.prevTransformY;
    }
    if (moveX === 0 && moveY === 0) return null;

    const gridPos = entity.get(GridPositionComponent);
    const offsetX = gridPos?.collisionBox.offsetX ?? 0;
    const offsetY = gridPos?.collisionBox.offsetY ?? 0;
    const cx = transform.x + offsetX;
    const cy = transform.y + offsetY;

    const fromCell = this.grid.worldToCellInto(cx, cy, this._tmpCell);
    const fromCellData = this.grid.getCell(fromCell.col, fromCell.row);
    if (!fromCellData) return null;

    let dx = 0;
    let dy = 0;
    if (Math.abs(moveX) > Math.abs(moveY)) {
      dx = moveX > 0 ? 1 : -1;
    } else {
      dy = moveY > 0 ? 1 : -1;
    }

    if (this.hasScene) {
      const cellWorld = this.grid.cellToWorldInto(fromCell.col, fromCell.row, this._tmpWorld);
      const EDGE_PROXIMITY_PX = 18;
      if (dx > 0 && (cellWorld.x + this.grid.cellSize) - cx > EDGE_PROXIMITY_PX) return null;
      if (dx < 0 && cx - cellWorld.x > EDGE_PROXIMITY_PX) return null;
      if (dy > 0 && (cellWorld.y + this.grid.cellSize) - cy > EDGE_PROXIMITY_PX) return null;
      if (dy < 0 && cy - cellWorld.y > EDGE_PROXIMITY_PX) return null;
    }

    const toCol = fromCell.col + dx;
    const toRow = fromCell.row + dy;
    const toCell = this.grid.getCell(toCol, toRow);
    if (!toCell) return null;

    if (toCell.properties.has('void')) {
      return this.resolveVoidJump(fromCell.col, fromCell.row, toCol, toRow);
    }

    if (fromCellData.properties.has('platform') && !this.grid.isTransition(toCell)) {
      const isWallOrLower = this.grid.isWall(toCell) || this.grid.getLayer(toCell) < this.grid.getLayer(fromCellData);
      if (isWallOrLower) {
        return this.resolvePlatformJump(fromCell.col, fromCell.row, toCol, toRow);
      }
    }

    return null;
  }

  private resolveVoidJump(fromCol: number, fromRow: number, toCol: number, toRow: number): PendingJump | null {
    if (fromCol !== toCol && fromRow !== toRow) return null;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const landCol = toCol + dx;
    const landRow = toRow + dy;

    const fromCell = this.grid.getCell(fromCol, fromRow);
    if (!fromCell) return null;

    const landCell = this.grid.getCell(landCol, landRow);
    if (this.isLandingSafe(landCell, fromCell)) {
      return { landCol, landRow, dx, dy, isFallJump: false, isPlatformJump: false };
    }
    if (!this.hasScene) return null;
    return { landCol: toCol, landRow: toRow, dx, dy, isFallJump: true, isPlatformJump: false };
  }

  private resolvePlatformJump(fromCol: number, fromRow: number, toCol: number, toRow: number): PendingJump | null {
    if (fromCol !== toCol && fromRow !== toRow) return null;

    const dx = toCol - fromCol;
    const dy = toRow - fromRow;

    const fromCell = this.grid.getCell(fromCol, fromRow);
    const toCell = this.grid.getCell(toCol, toRow);
    if (!fromCell || !toCell) return null;

    if (this.grid.isTransition(toCell)) return null;

    let landCol: number;
    let landRow: number;
    if (this.grid.isWall(toCell)) {
      landCol = toCol + dx;
      landRow = toRow + dy;
    } else {
      const farCol = toCol + dx;
      const farRow = toRow + dy;
      const farCell = this.grid.getCell(farCol, farRow);
      if (farCell && farCell.properties.has('platform') && farCell.layer <= fromCell.layer
        && !this.grid.isWall(farCell) && !this.grid.isTransition(farCell)) {
        landCol = farCol;
        landRow = farRow;
      } else {
        landCol = toCol;
        landRow = toRow;
      }
    }

    const landCell = this.grid.getCell(landCol, landRow);
    if (!landCell) return null;
    if (this.grid.isTransition(landCell)) return null;

    for (const occupant of landCell.occupants) {
      if (occupant.get(GridCellBlocker)) return null;
    }

    if (landCell.properties.has('void')) {
      if (!this.hasScene) return null;
      return { landCol, landRow, dx, dy, isFallJump: true, isPlatformJump: true };
    } else if (this.isValidPlatformLanding(landCell)) {
      return { landCol, landRow, dx, dy, isFallJump: false, isPlatformJump: true };
    }
    return null;
  }

  private isLandingSafe(landCell: ReturnType<GridReader['getCell']>, fromCell: NonNullable<ReturnType<GridReader['getCell']>>): boolean {
    return !!landCell
      && landCell.layer === fromCell.layer
      && !landCell.properties.has('void')
      && !landCell.properties.has('wall')
      && !landCell.properties.has('blocked')
      && !(landCell.properties.has('platform') && landCell.layer > fromCell.layer)
      && ![...landCell.occupants].some(o => o.get(GridCellBlocker));
  }

  private isValidPlatformLanding(landCell: NonNullable<ReturnType<GridReader['getCell']>>): boolean {
    if (landCell.properties.has('wall') || landCell.properties.has('blocked')) return false;
    return true;
  }
}
