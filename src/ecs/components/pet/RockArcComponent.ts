import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import type { GridReader } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';

export type RockArcProps = {
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  arcHeight: number;
  grid: GridReader;
  blockedAreaManager?: BlockedAreaManager;
  startLayer: number;
  startedOnStairs: boolean;
  startX: number;
  startY: number;
  onLand: (x: number, y: number, landOffsetY: number) => void;
};

export class RockArcComponent implements Component {
  entity!: Entity;
  private distanceTraveled = 0;
  private readonly dirX: number;
  private readonly dirY: number;
  private readonly speed: number;
  private readonly maxDistance: number;
  private readonly arcHeight: number;
  private readonly grid: GridReader;
  private readonly blockedAreaManager?: BlockedAreaManager;
  private readonly startLayer: number;
  private readonly onLand: (x: number, y: number, landOffsetY: number) => void;
  private isStopped = false;
  private hasLanded = false;
  private passedThroughStairs = false;
  private readonly skipDistance: number;
  private maxDropPx = 25;

  constructor(props: RockArcProps) {
    this.dirX = props.dirX;
    this.dirY = props.dirY;
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.arcHeight = props.arcHeight;
    this.grid = props.grid;
    this.blockedAreaManager = props.blockedAreaManager;
    this.startLayer = props.startLayer;
    this.onLand = props.onLand;
    this.passedThroughStairs = props.startedOnStairs;

    // Default 40px skip. If throwing non-upward and starting inside a higher-layer cell, extend to clear it
    const SKIP_DEFAULT_PX = 40;
    const SKIP_EXTENDED_PX = 80;
    if (props.dirY >= 0) {
      const startCell = this.grid.worldToCell(props.startX, props.startY);
      const startCellData = this.grid.getCell(startCell.col, startCell.row);
      const startCellLayer = startCellData?.layer ?? 0;
      this.skipDistance = startCellLayer > this.startLayer ? SKIP_EXTENDED_PX : SKIP_DEFAULT_PX;
    } else {
      this.skipDistance = SKIP_DEFAULT_PX;
    }
  }

  private computeMaxDrop(transform: TransformComponent): void {
    const LAND_DROP_PX = 25;
    const currentCell = this.grid.worldToCell(transform.x, transform.y);
    const cellBelow = this.grid.worldToCell(transform.x, transform.y + LAND_DROP_PX);
    if (cellBelow.row !== currentCell.row) {
      const cellBelowData = this.grid.getCell(cellBelow.col, cellBelow.row);
      const cellBelowLayer = cellBelowData?.layer ?? 0;
      const wouldEnterBlocker = cellBelowData && cellBelowLayer > this.startLayer && (
        cellBelowData.properties.has('blocked') ||
        cellBelowData.properties.has('wall') ||
        cellBelowData.properties.has('platform')
      );
      if (wouldEnterBlocker) {
        const cellTopY = cellBelow.row * this.grid.cellSize;
        this.maxDropPx = Math.max(0, cellTopY - transform.y - 2);
      }
    }
  }

  update(delta: number): void {
    if (this.hasLanded) return;

    const transform = this.entity.require(TransformComponent);
    const movePx = this.speed * (delta / 1000);

    // Move forward if not stopped by wall
    if (!this.isStopped) {
      const nextX = transform.x + this.dirX * movePx;
      const nextY = transform.y + this.dirY * movePx;

      // Skip wall checks initially to escape player's cell
      // If rock starts inside a higher-layer cell (hand offset into wall above), extend skip
      const shouldCheckWalls = this.distanceTraveled > this.skipDistance;

      if (shouldCheckWalls) {
        if (this.blockedAreaManager?.isPointInside(nextX, nextY, 0)) {
          this.isStopped = true;
          this.computeMaxDrop(transform);
        }

        if (!this.isStopped && !this.passedThroughStairs) {
          const cell = this.grid.worldToCell(nextX, nextY);
          const cellData = this.grid.getCell(cell.col, cell.row);
          if (cellData && this.grid.isTransition(cellData)) {
            this.passedThroughStairs = true;
          } else {
            const cellLayer = cellData?.layer ?? 0;
            const isBlocked = cellData && cellLayer > this.startLayer && (
              cellData.properties.has('blocked') ||
              cellData.properties.has('wall') ||
              cellData.properties.has('platform')
            );
            if (isBlocked) {
              this.isStopped = true;
              this.computeMaxDrop(transform);
            }
          }
        }
      }

      if (!this.isStopped) {
        transform.x = nextX;
        transform.y = nextY;
      }
    }

    // Arc always continues regardless of wall hit
    this.distanceTraveled += movePx;
    const progress = Math.min(this.distanceTraveled / this.maxDistance, 1);
    // Rock starts elevated (in player's hand) and lands at ground level (25px lower)
    const LAND_DROP_PX = 25;
    const sineArc = Math.sin(progress * Math.PI) * this.arcHeight;
    const arcOffset = sineArc - LAND_DROP_PX * progress;
    let visualY = -arcOffset;

    // Clamp visual offset so rock never visually enters a blocked cell below
    if (this.isStopped && visualY > 0) {
      visualY = Math.min(visualY, this.maxDropPx);
    }

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = visualY;
    }

    // Land when arc completes
    if (progress >= 1) {
      this.hasLanded = true;
      const landOffsetY = this.isStopped ? this.maxDropPx : LAND_DROP_PX;
      if (sprite) sprite.visualOffsetYPx = landOffsetY;
      this.onLand(transform.x, transform.y, landOffsetY);
    }
  }
}
