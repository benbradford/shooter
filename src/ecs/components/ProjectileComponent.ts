import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';
import type { Grid } from '../../utils/Grid';

export class ProjectileComponent implements Component {
  entity!: Entity;
  private distanceTraveled: number = 0;

  constructor(
    private readonly dirX: number,
    private readonly dirY: number,
    private readonly speed: number,
    private readonly maxDistance: number,
    private readonly grid: Grid,
    private readonly blockedByWalls: boolean = true
  ) {}

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent)!;
    const distance = this.speed * (delta / 1000);
    
    transform.x += this.dirX * distance;
    transform.y += this.dirY * distance;
    
    this.distanceTraveled += distance;
    
    // Check collision with walls
    const cell = this.grid.worldToCell(transform.x, transform.y);
    const cellData = this.grid.getCell(cell.col, cell.row);
    
    if (this.blockedByWalls && (!cellData || cellData.blocksProjectiles)) {
      this.entity.destroy();
      return;
    }
    
    if (this.distanceTraveled >= this.maxDistance) {
      this.entity.destroy();
    }
  }

  onDestroy(): void {}
}
