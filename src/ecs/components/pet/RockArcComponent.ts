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
  onLand: (x: number, y: number) => void;
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
  private readonly onLand: (x: number, y: number) => void;
  private isStopped = false;
  private hasLanded = false;
  private passedThroughStairs = false;

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
  }

  update(delta: number): void {
    if (this.hasLanded) return;

    const transform = this.entity.require(TransformComponent);
    const movePx = this.speed * (delta / 1000);

    // Move forward if not stopped by wall
    if (!this.isStopped) {
      const nextX = transform.x + this.dirX * movePx;
      const nextY = transform.y + this.dirY * movePx;

      // Skip wall checks for first 40px to escape player's cell
      const shouldCheckWalls = this.distanceTraveled > 40;

      if (shouldCheckWalls) {
        if (this.blockedAreaManager?.isPointInside(nextX, nextY, 0)) {
          this.isStopped = true;
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
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = -arcOffset;
    }

    // Land when arc completes
    if (progress >= 1) {
      this.hasLanded = true;
      if (sprite) sprite.visualOffsetYPx = LAND_DROP_PX;
      this.onLand(transform.x, transform.y);
    }
  }
}
