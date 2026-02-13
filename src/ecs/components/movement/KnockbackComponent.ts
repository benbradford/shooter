import type { Entity } from '../../Entity';
import type { Component } from '../../Component';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import type { Grid } from '../../../systems/grid/Grid';

export class KnockbackComponent implements Component {
  entity!: Entity;
  velocityX: number = 0;
  velocityY: number = 0;
  friction: number;
  duration: number;
  elapsed: number = 0;
  isActive: boolean = false;

  constructor(
    friction: number,
    duration: number,
    private readonly grid: Grid
  ) {
    this.friction = friction;
    this.duration = duration;
  }

  applyKnockback(dirX: number, dirY: number, force: number): void {
    if (this.isActive) {
      return;
    }

    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    
    const targetX = transform.x + dirX * 50;
    const targetY = transform.y + dirY * 50;
    const targetCell = this.grid.worldToCell(targetX, targetY);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);
    
    if (cell && cell.layer === gridPos.currentLayer && !this.grid.isWall(cell)) {
      this.velocityX = dirX * force;
      this.velocityY = dirY * force;
      this.elapsed = 0;
      this.isActive = true;
    } else {
      const currentCell = this.grid.worldToCell(transform.x, transform.y);
      const safeX = currentCell.col * this.grid.cellSize + this.grid.cellSize / 2;
      const safeY = currentCell.row * this.grid.cellSize + this.grid.cellSize / 2;
      transform.x = safeX;
      transform.y = safeY;
    }
  }

  stop(): void {
    this.velocityX = 0;
    this.velocityY = 0;
    this.isActive = false;
  }

  update(delta: number): void {
    if (!this.isActive || (this.velocityX === 0 && this.velocityY === 0)) {
      this.isActive = false;
      return;
    }

    this.elapsed += delta;

    const transform = this.entity.require(TransformComponent);

    transform.x += this.velocityX * (delta / 1000);
    transform.y += this.velocityY * (delta / 1000);

    const frictionPerFrame = Math.pow(this.friction, delta / 1000);
    this.velocityX *= frictionPerFrame;
    this.velocityY *= frictionPerFrame;

    if (Math.abs(this.velocityX) < 1 && Math.abs(this.velocityY) < 1 || this.elapsed >= this.duration) {
      this.velocityX = 0;
      this.velocityY = 0;
      this.isActive = false;
    }
  }

  onDestroy(): void {
    // Clean up
  }
}
