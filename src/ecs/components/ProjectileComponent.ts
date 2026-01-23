import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';
import type { Grid } from '../../utils/Grid';

export interface ProjectileProps {
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  grid: Grid;
  blockedByWalls?: boolean;
  startLayer?: number;
  fromTransition?: boolean;
}

export class ProjectileComponent implements Component {
  entity!: Entity;
  private distanceTraveled: number = 0;
  private currentLayer: number;
  private readonly fromTransition: boolean;
  public readonly dirX: number;
  public readonly dirY: number;
  private readonly speed: number;
  private readonly maxDistance: number;
  private readonly grid: Grid;
  private readonly blockedByWalls: boolean;

  constructor(props: ProjectileProps) {
    this.dirX = props.dirX;
    this.dirY = props.dirY;
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.grid = props.grid;
    this.blockedByWalls = props.blockedByWalls ?? true;
    this.currentLayer = props.startLayer ?? 0;
    this.fromTransition = props.fromTransition ?? false;
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent)!;
    const distance = this.speed * (delta / 1000);
    
    transform.x += this.dirX * distance;
    transform.y += this.dirY * distance;
    
    this.distanceTraveled += distance;
    
    // Check collision with walls (layer-based)
    const cell = this.grid.worldToCell(transform.x, transform.y);
    const cellData = this.grid.getCell(cell.col, cell.row);
    
    if (!cellData) {
      this.entity.destroy();
      return;
    }
    
    // If passing through transition cell, upgrade accessible layer
    if (cellData.isTransition) {
      this.currentLayer = Math.max(this.currentLayer, cellData.layer + 1);
    }
    
    if (this.blockedByWalls) {
      // Transition cells don't block projectiles
      if (!cellData.isTransition) {
        if (this.fromTransition) {
          if (cellData.layer > this.currentLayer + 1) {
            this.entity.destroy();
            return;
          }
        } else if (cellData.layer > this.currentLayer) {
          this.entity.destroy();
          return;
        }
      }
    }
    
    if (this.distanceTraveled >= this.maxDistance) {
      this.entity.destroy();
    }
  }

  onDestroy(): void {}
}
