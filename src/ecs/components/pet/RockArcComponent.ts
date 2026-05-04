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
  playerFeetY: number;
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
  private readonly playerFeetY: number;

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
    this.playerFeetY = props.playerFeetY;

    const SKIP_DEFAULT_PX = 40;
    this.skipDistance = SKIP_DEFAULT_PX;
  }

  private computeMaxDrop(groundY: number, transform: TransformComponent): void {
    const LAND_DROP_PX = 25;
    const currentCell = this.grid.worldToCell(transform.x, groundY);
    const cellBelow = this.grid.worldToCell(transform.x, groundY + LAND_DROP_PX);
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
        this.maxDropPx = Math.max(0, cellTopY - groundY - 2);
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

      // Ground-projected Y: starts at player's feet and moves with throw direction.
      // This prevents false blocking when the rock's hand-offset position is inside
      // a wall cell above the player, while still correctly blocking on platforms
      // the rock is genuinely moving toward.
      const groundY = this.playerFeetY + this.dirY * (this.distanceTraveled + movePx);

      // Skip wall checks initially to escape player's cell
      const shouldCheckWalls = this.distanceTraveled > this.skipDistance;

      if (shouldCheckWalls) {
        if (this.blockedAreaManager?.isPointInside(nextX, groundY, 0)) {
          this.isStopped = true;
          this.computeMaxDrop(groundY, transform);
        }

        if (!this.isStopped && !this.passedThroughStairs) {
          const cell = this.grid.worldToCell(nextX, groundY);
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
              this.computeMaxDrop(groundY, transform);
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
