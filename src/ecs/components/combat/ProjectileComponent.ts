import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import type { Grid } from '../../../systems/grid/Grid';

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
  private lastStairsCol: number = -1;
  private lastStairsRow: number = -1;

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
      const transitionLayer = this.grid.getLayer(cellData);
      if (transitionLayer > this.currentLayer) {
        this.wentUpThroughStairs = true;
      }
      this.currentLayer = Math.max(this.currentLayer, transitionLayer);
      this.hasTraversedStairs = true;
      this.lastStairsCol = cell.col;
      this.lastStairsRow = cell.row;
      return;
    }

    const cellLayer = this.grid.getLayer(cellData);
    
    if (this.grid.isWall(cellData)) return;
    
    let shouldBlock = false;
    
    if (this.hasTraversedStairs && this.wentUpThroughStairs) {
      if (cellLayer < this.currentLayer) {
        shouldBlock = true;
      } else if (cellLayer === this.currentLayer && cellLayer >= 1) {
        const isAdjacent = this.isAdjacentToLastStairs(cell.col, cell.row);
        shouldBlock = !isAdjacent;
      } else if (cellLayer > this.currentLayer) {
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

  private isAdjacentToLastStairs(col: number, row: number): boolean {
    if (this.lastStairsCol === -1) return false;
    
    const dx = Math.abs(col - this.lastStairsCol);
    const dy = Math.abs(row - this.lastStairsRow);
    
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }
}
