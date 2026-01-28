import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import type { Grid } from '../../../utils/Grid';

export type ProjectileProps = {
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  grid: Grid;
  blockedByWalls: boolean;
  startLayer: number;
  fromTransition: boolean;
  scene?: Phaser.Scene;
  onWallHit?: (x: number, y: number) => void;
  onMaxDistance?: (x: number, y: number) => void;
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
  private readonly onMaxDistance?: (x: number, y: number) => void;

  constructor(props: ProjectileProps) {
    this.dirX = props.dirX;
    this.dirY = props.dirY;
    this.speed = props.speed;
    this.maxDistance = props.maxDistance;
    this.grid = props.grid;
    this.blockedByWalls = props.blockedByWalls;
    this.currentLayer = props.startLayer;
    this.fromTransition = props.fromTransition;
    this.scene = props.scene;
    this.onWallHit = props.onWallHit;
    this.onMaxDistance = props.onMaxDistance;
  }

  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);

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

    if (this.shouldCheckWallCollision(cellData)) {
      this.handleWallCollision(transform, cell);
      return;
    }

    if (this.distanceTraveled >= this.maxDistance) {
      const transform = this.entity.require(TransformComponent);
      this.onMaxDistance?.(transform.x, transform.y);
      this.entity.destroy();
    }
  }

  private shouldCheckWallCollision(cellData: { layer: number; isTransition: boolean }): boolean {
    if (!this.blockedByWalls || cellData.isTransition) return false;

    const shouldBlock = this.fromTransition
      ? cellData.layer > this.currentLayer + 1
      : cellData.layer > this.currentLayer;

    return shouldBlock;
  }

  private handleWallCollision(transform: TransformComponent, cell: { col: number; row: number }): void {
    const cellWorld = this.grid.cellToWorld(cell.col, cell.row);
    const cellBottomY = cellWorld.y + this.grid.cellSize;
    const bottomThreshold = cellBottomY - (this.grid.cellSize * 0.8);

    if (transform.y >= bottomThreshold) return;

    if (this.onWallHit) {
      this.onWallHit(transform.x, transform.y);
    } else if (this.scene) {
      this.createWallHitParticles(transform.x, transform.y);
    }
    this.entity.destroy();
  }

  private createWallHitParticles(x: number, y: number): void {
    if (!this.scene) return;

    const emitter = this.scene.add.particles(x, y, 'smoke', {
      speed: { min: 300, max: 500 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 100,
      quantity: 10,
      tint: [0xffff00, 0xff5500],
      blendMode: 'ADD'
    });
    emitter.setDepth(1000);
    this.scene.time.delayedCall(300, () => emitter.destroy());
  }

}
