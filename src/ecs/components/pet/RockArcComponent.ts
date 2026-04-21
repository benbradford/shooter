import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import type { Grid } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';

export type RockArcProps = {
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  arcHeight: number;
  grid: Grid;
  blockedAreaManager?: BlockedAreaManager;
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
  private readonly grid: Grid;
  private readonly blockedAreaManager?: BlockedAreaManager;
  private readonly onLand: (x: number, y: number) => void;
  private isStopped = false;
  private hasLanded = false;

  constructor(props: RockArcProps) {
    this.dirX = props.dirX;
    this.dirY = props.dirY;
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.arcHeight = props.arcHeight;
    this.grid = props.grid;
    this.blockedAreaManager = props.blockedAreaManager;
    this.onLand = props.onLand;
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

        if (!this.isStopped) {
          const cell = this.grid.worldToCell(nextX, nextY);
          const cellData = this.grid.getCell(cell.col, cell.row);
          const isBlocked = cellData && (
            cellData.properties.has('blocked') ||
            cellData.properties.has('wall')
          );
          if (isBlocked) {
            this.isStopped = true;
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
    const arcOffset = Math.sin(progress * Math.PI) * this.arcHeight;
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = -arcOffset;
    }

    // Land when arc completes
    if (progress >= 1) {
      this.hasLanded = true;
      if (sprite) sprite.visualOffsetYPx = 0;
      this.onLand(transform.x, transform.y);
    }
  }
}
