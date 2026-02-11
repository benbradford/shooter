import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';

export type RockProjectileComponentProps = {
  targetX: number;
  targetY: number;
  speed: number;
  maxDistance: number;
  grid: Grid;
  playerStartLayer: number;
  onHit: (enemy: Entity) => void;
  onComplete: () => void;
}

export class RockProjectileComponent implements Component {
  entity!: Entity;
  private readonly targetX: number;
  private readonly targetY: number;
  private readonly speed: number;
  private readonly maxDistance: number;
  private readonly grid: Grid;
  private readonly playerStartLayer: number;
  private readonly onHit: (enemy: Entity) => void;
  private readonly onComplete: () => void;
  private distanceTraveled: number = 0;
  private readonly dirX: number;
  private readonly dirY: number;
  private hasHit: boolean = false;
  private currentLayer: number;
  private hasTraversedStairs: boolean = false;
  private wentUpThroughStairs: boolean = false;

  constructor(startX: number, startY: number, props: RockProjectileComponentProps) {
    this.targetX = props.targetX;
    this.targetY = props.targetY;
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.grid = props.grid;
    this.playerStartLayer = props.playerStartLayer;
    this.onHit = props.onHit;
    this.onComplete = props.onComplete;
    this.currentLayer = props.playerStartLayer;

    const dx = this.targetX - startX;
    const dy = this.targetY - startY;
    const length = Math.hypot(dx, dy);
    this.dirX = dx / length;
    this.dirY = dy / length;
  }

  // eslint-disable-next-line complexity
  update(delta: number): void {
    if (this.hasHit) return;

    const transform = this.entity.require(TransformComponent);
    
    const moveDistance = this.speed * (delta / 1000);
    transform.x += this.dirX * moveDistance;
    transform.y += this.dirY * moveDistance;
    
    this.distanceTraveled += moveDistance;

    if (this.distanceTraveled >= this.maxDistance) {
      this.onComplete();
      this.entity.destroy();
      return;
    }

    const cell = this.grid.worldToCell(transform.x, transform.y);
    const cellData = this.grid.getCell(cell.col, cell.row);
    if (!cellData) return;

    if (this.grid.isTransition(cellData)) {
      this.hasTraversedStairs = true;
      return;
    }

    const cellLayer = this.grid.getLayer(cellData);
    
    if (this.grid.isWall(cellData)) return;
    
    let shouldBlock = false;
    
    if (this.hasTraversedStairs) {
      if (cellLayer !== this.currentLayer) {
        if (cellLayer > this.currentLayer) {
          this.wentUpThroughStairs = true;
          this.currentLayer = cellLayer;
        } else if (cellLayer < this.currentLayer) {
          if (this.wentUpThroughStairs) {
            shouldBlock = true;
          } else {
            this.currentLayer = cellLayer;
          }
        }
      }
      
      if (this.wentUpThroughStairs && cellLayer > this.currentLayer) {
        shouldBlock = true;
      }
    } else if (cellLayer >= 1) {
      shouldBlock = cellLayer > this.playerStartLayer;
    }
    
    if (shouldBlock) {
      this.onComplete();
      this.entity.destroy();
      return;
    }

    const targetDistance = Math.hypot(this.targetX - transform.x, this.targetY - transform.y);
    if (targetDistance < 10) {
      this.onComplete();
      this.entity.destroy();
    }
  }

  handleHit(enemy: Entity): void {
    if (this.hasHit) return;
    this.hasHit = true;
    this.onHit(enemy);
    this.entity.destroy();
  }

  onDestroy(): void {
    // No cleanup needed
  }
}
