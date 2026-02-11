import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import type { Grid } from '../../../systems/grid/Grid';

/**
 * ProjectileComponent - Handles bullet movement and layer-based collision
 * 
 * DEFINITIVE BULLET COLLISION RULES:
 * See docs/grid-and-collision.md#projectile-layer-rules-definitive
 * 
 * Summary:
 * - Walls never block bullets
 * - Before stairs: blocked by platforms above player start layer
 * - After stairs UP: pass through same layer, blocked by different layers
 * - After stairs DOWN: no special restrictions
 */

export type ProjectileProps = {
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  grid: Grid;
  startLayer: number;
  fromTransition: boolean;
  scene?: Phaser.Scene;
  onWallHit?: (x: number, y: number) => void;
  onMaxDistance?: (x: number, y: number) => void;
}

export class ProjectileComponent implements Component {
  entity!: Entity;
  public readonly dirX: number;
  public readonly dirY: number;
  private readonly speed: number;
  private readonly maxDistance: number;
  private readonly grid: Grid;
  private readonly onWallHit?: (x: number, y: number) => void;
  private readonly onMaxDistance?: (x: number, y: number) => void;
  
  private distanceTraveled: number = 0;
  private currentLayer: number;
  private readonly playerStartLayer: number;
  private hasTraversedStairs: boolean = false;
  private wentUpThroughStairs: boolean = false;

  constructor(props: ProjectileProps) {
    this.dirX = props.dirX;
    this.dirY = props.dirY;
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.grid = props.grid;
    this.onWallHit = props.onWallHit;
    this.onMaxDistance = props.onMaxDistance;
    
    this.playerStartLayer = props.startLayer;
    this.currentLayer = props.fromTransition ? props.startLayer + 1 : props.startLayer;
    this.hasTraversedStairs = props.fromTransition;
  }

  // eslint-disable-next-line complexity
  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    
    const movePx = this.speed * (delta / 1000);
    transform.x += this.dirX * movePx;
    transform.y += this.dirY * movePx;
    this.distanceTraveled += movePx;

    if (this.distanceTraveled >= this.maxDistance) {
      this.onMaxDistance?.(transform.x, transform.y);
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
      this.onWallHit?.(transform.x, transform.y);
      this.entity.destroy();
    }
  }
}
