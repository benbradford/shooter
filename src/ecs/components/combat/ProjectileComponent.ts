import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import type { Grid, CellData } from '../../../systems/grid/Grid';

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
    this.currentLayer = props.fromTransition ? props.startLayer + 1 : props.startLayer;
    this.scene = props.scene;
    this.onWallHit = props.onWallHit;
    this.onMaxDistance = props.onMaxDistance;
  }

  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const distance = this.speed * (delta / 1000);

    const steps = Math.ceil(distance / (this.grid.cellSize / 2));
    const stepDistance = distance / steps;

    for (let i = 0; i < steps; i++) {
      const cell = this.grid.worldToCell(transform.x, transform.y);
      const cellData = this.grid.getCell(cell.col, cell.row);

      if (!cellData) {
        this.entity.destroy();
        return;
      }

      if (this.grid.isTransition(cellData)) {
        this.currentLayer = Math.max(this.currentLayer, this.grid.getLayer(cellData) + 1);
      }

      if (this.shouldCheckWallCollision(cellData)) {
        this.handleWallCollision(transform, cell);
        return;
      }

      transform.x += this.dirX * stepDistance;
      transform.y += this.dirY * stepDistance;
      this.distanceTraveled += stepDistance;
    }

    if (this.distanceTraveled >= this.maxDistance) {
      this.onMaxDistance?.(transform.x, transform.y);
      this.entity.destroy();
    }
  }

  private shouldCheckWallCollision(cellData: CellData): boolean {
    if (!this.blockedByWalls || this.grid.isTransition(cellData)) return false;
    return this.grid.getLayer(cellData) > this.currentLayer;
  }

  private handleWallCollision(transform: TransformComponent, _cell: { col: number; row: number }): void {
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
