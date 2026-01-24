import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import type { Grid } from '../../../utils/Grid';

const GRACE_DISTANCE_PX = 64;

export interface ProjectileProps {
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  grid: Grid;
  blockedByWalls?: boolean;
  startLayer?: number;
  fromTransition?: boolean;
  scene?: Phaser.Scene;
  onWallHit?: (x: number, y: number) => void;
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
  private readonly scene?: Phaser.Scene;
  private readonly onWallHit?: (x: number, y: number) => void;

  constructor(props: ProjectileProps) {
    this.dirX = props.dirX;
    this.dirY = props.dirY;
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.grid = props.grid;
    this.blockedByWalls = props.blockedByWalls ?? true;
    this.currentLayer = props.startLayer ?? 0;
    this.fromTransition = props.fromTransition ?? false;
    this.scene = props.scene;
    this.onWallHit = props.onWallHit;
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

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
    
    if (this.blockedByWalls && this.distanceTraveled >= GRACE_DISTANCE_PX) {
      if (!cellData.isTransition) {
        const shouldBlock = this.fromTransition 
          ? cellData.layer > this.currentLayer + 1
          : cellData.layer > this.currentLayer;
        
        if (shouldBlock) {
          const cellWorld = this.grid.cellToWorld(cell.col, cell.row);
          const cellBottomY = cellWorld.y + this.grid.cellSize;
          const bottomThreshold = cellBottomY - (this.grid.cellSize * 0.2);
          
          if (transform.y < bottomThreshold) {
            if (this.onWallHit) {
              this.onWallHit(transform.x, transform.y);
            } else if (this.scene) {
              const emitter = this.scene.add.particles(transform.x, transform.y, 'smoke', {
                speed: { min: 40, max: 100 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.8, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 300,
                quantity: 8,
                tint: 0xffff00,
                blendMode: 'ADD'
              });
              emitter.setDepth(1000);
              this.scene.time.delayedCall(300, () => emitter.destroy());
            }
            this.entity.destroy();
            return;
          }
        }
      }
    }
    
    if (this.distanceTraveled >= this.maxDistance) {
      this.entity.destroy();
    }
  }

  onDestroy(): void {}
}
