import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid, CellCoord } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import { WalkComponent } from './WalkComponent';
import { GridCellBlocker } from './GridCellBlocker';
import { BugHopComponent } from './BugHopComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { KnockbackComponent } from './KnockbackComponent';
import { GridMovementValidator } from './GridMovementValidator';


export class GridCollisionComponent implements Component {
  entity!: Entity;
  private previousX: number = 0;
  private previousY: number = 0;
  private occupiedCells: Set<number> = new Set();
  private swapOccupiedCells: Set<number> = new Set();
  enabled = true;
  blockedByPushable: Entity | null = null;

  private readonly validator: GridMovementValidator;

  // Pre-allocated temp objects for zero-alloc worldToCell calls in hot paths
  private readonly _tmpCells: readonly [CellCoord, CellCoord, CellCoord, CellCoord, CellCoord, CellCoord] = [
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
    { col: 0, row: 0 },
  ];

  constructor(private readonly grid: Grid) {
    this.validator = new GridMovementValidator(grid);
  }

  private static encodeCellKey(col: number, row: number): number {
    return col * 10000 + row;
  }

  private static decodeCellKey(key: number): { col: number; row: number } {
    return { col: Math.floor(key / 10000), row: key % 10000 };
  }

  getGrid(): Grid {
    return this.grid;
  }

  syncPreviousPosition(x: number, y: number): void {
    this.previousX = x;
    this.previousY = y;
  }

  // eslint-disable-next-line complexity
  update(_delta: number): void {
    if (!this.enabled) return;
    this.blockedByPushable = null;
    this.validator.blockedByPushable = null;

    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);

    const hop = this.entity.get(BugHopComponent);
    if (hop?.isActive()) {
      this.previousX = transform.x;
      this.previousY = transform.y;
      return;
    }

    const stateMachine = this.entity.get(StateMachineComponent);
    if (stateMachine?.stateMachine.getCurrentKey() === 'attack') {
      this.previousX = transform.x;
      this.previousY = transform.y;
      return;
    }

    if (this.previousX === 0 && this.previousY === 0) {
      this.previousX = transform.x;
      this.previousY = transform.y;
    }

    const hopJustEnded = hop && !hop.isActive() && hop.justEnded();
    if (hopJustEnded) {
      this.previousX = transform.x;
      this.previousY = transform.y;
      const cell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      if (cell) {
        gridPos.currentLayer = this.grid.getLayer(cell);
      }
      return;
    }

    const newX = transform.x;
    const newY = transform.y;

    if (this.validator.checkCollision(this.entity, newX, newY, this.previousX, this.previousY, gridPos, this._tmpCells)) {
      this.blockedByPushable = this.validator.blockedByPushable;

      const xOnlyBlocked = this.validator.checkCollision(this.entity, newX, this.previousY, this.previousX, this.previousY, gridPos, this._tmpCells);
      const yOnlyBlocked = this.validator.checkCollision(this.entity, this.previousX, newY, this.previousX, this.previousY, gridPos, this._tmpCells);

      if (this.entity.tags.has('pet')) {
        const moveDist = Math.hypot(newX - this.previousX, newY - this.previousY);
        const revertDist = Math.hypot(transform.x - this.previousX, transform.y - this.previousY);
        if (revertDist > 30) {
          console.warn(`[PET BLOCKED] new=(${newX.toFixed(0)},${newY.toFixed(0)}) prev=(${this.previousX.toFixed(0)},${this.previousY.toFixed(0)}) moveDist=${moveDist.toFixed(0)} revert=${revertDist.toFixed(0)} layer=${gridPos.currentLayer} xB=${xOnlyBlocked} yB=${yOnlyBlocked}`);
        }
      }

      const walk = this.entity.get(WalkComponent);
      const knockback = this.entity.get(KnockbackComponent);

      if (xOnlyBlocked && yOnlyBlocked) {
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
        knockback?.stop();
      } else if (yOnlyBlocked) {
        transform.y = this.previousY;
        walk?.resetVelocity(false, true);
      } else if (xOnlyBlocked) {
        transform.x = this.previousX;
        walk?.resetVelocity(true, false);
      } else {
        transform.x = this.previousX;
        transform.y = this.previousY;
        walk?.resetVelocity(true, true);
        knockback?.stop();
      }
    }

    // Sync blockedByPushable from validator (set during canMoveTo)
    this.blockedByPushable ??= this.validator.blockedByPushable;

    // Proactive pushable detection: probe 1px beyond collision box edge
    if (!this.blockedByPushable && (newX !== this.previousX || newY !== this.previousY)) {
      const dx = newX - this.previousX;
      const dy = newY - this.previousY;
      const boxLeft = transform.x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
      const boxTop = transform.y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
      const boxRight = boxLeft + gridPos.collisionBox.width;
      const boxBottom = boxTop + gridPos.collisionBox.height;
      const centerX = (boxLeft + boxRight) / 2;
      const centerY = (boxTop + boxBottom) / 2;

      let probeX = centerX;
      let probeY = centerY;
      if (Math.abs(dx) > Math.abs(dy)) {
        probeX = dx > 0 ? boxRight + 1 : boxLeft - 1;
      } else {
        probeY = dy > 0 ? boxBottom + 1 : boxTop - 1;
      }
      const probeCell = this.grid.worldToCellInto(probeX, probeY, this._tmpCells[0]);
      const probeCellData = this.grid.getCell(probeCell.col, probeCell.row);
      if (probeCellData) {
        for (const occupant of probeCellData.occupants) {
          if (occupant.get(GridCellBlocker)) {
            this.blockedByPushable = occupant;
            break;
          }
        }
      }
    }

    const boxLeft = transform.x + gridPos.collisionBox.offsetX - gridPos.collisionBox.width / 2;
    const boxTop = transform.y + gridPos.collisionBox.offsetY - gridPos.collisionBox.height / 2;
    const boxRight = boxLeft + gridPos.collisionBox.width;
    const boxBottom = boxTop + gridPos.collisionBox.height;

    const topLeftCell = this.grid.worldToCellInto(boxLeft, boxTop, this._tmpCells[1]);
    const bottomRightCell = this.grid.worldToCellInto(boxRight - 1, boxBottom - 1, this._tmpCells[2]);

    const newOccupiedCells = this.swapOccupiedCells;
    newOccupiedCells.clear();
    for (let row = topLeftCell.row; row <= bottomRightCell.row; row++) {
      for (let col = topLeftCell.col; col <= bottomRightCell.col; col++) {
        newOccupiedCells.add(GridCollisionComponent.encodeCellKey(col, row));
      }
    }

    this.occupiedCells.forEach(key => {
      if (!newOccupiedCells.has(key)) {
        const { col, row } = GridCollisionComponent.decodeCellKey(key);
        this.grid.removeOccupant(col, row, this.entity);
      }
    });

    newOccupiedCells.forEach(key => {
      if (!this.occupiedCells.has(key)) {
        const { col, row } = GridCollisionComponent.decodeCellKey(key);
        this.grid.addOccupant(col, row, this.entity);
      }
    });

    // Swap sets: swapOccupiedCells becomes occupiedCells, old occupiedCells becomes swap buffer
    this.swapOccupiedCells = this.occupiedCells;
    this.occupiedCells = newOccupiedCells;

    // Update currentCell based on entity center (transform position).
    // Using transform position rather than collision box center ensures symmetric
    // cell transitions in all directions and matches the player's visual position.
    const centerX = transform.x + gridPos.collisionBox.offsetX;
    const centerY = transform.y;
    const centerCell = this.grid.worldToCellInto(centerX, centerY, this._tmpCells[3]);

    gridPos.previousCell.col = gridPos.currentCell.col;
    gridPos.previousCell.row = gridPos.currentCell.row;
    gridPos.currentCell.col = centerCell.col;
    gridPos.currentCell.row = centerCell.row;

    // Update currentLayer based on collision box center (where the feet are).
    // Layer determines collision rules, so it should follow the collision box.
    const feetY = transform.y + gridPos.collisionBox.offsetY;
    const layerCell = this.grid.worldToCellInto(centerX, feetY, this._tmpCells[4]);
    const layerCellData = this.grid.getCell(layerCell.col, layerCell.row);

    if (layerCellData) {
      gridPos.currentLayer = this.grid.getLayer(layerCellData);
    }

    this.previousX = transform.x;
    this.previousY = transform.y;

    this.grid.renderCollisionBox(boxLeft, boxTop, gridPos.collisionBox.width, gridPos.collisionBox.height);
  }

  onDestroy(): void {
    this.occupiedCells.forEach(key => {
      const { col, row } = GridCollisionComponent.decodeCellKey(key);
      this.grid.removeOccupant(col, row, this.entity);
    });
    this.occupiedCells.clear();
    this.validator.destroy();
  }
}
