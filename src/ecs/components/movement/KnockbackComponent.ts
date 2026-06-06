import type { Entity } from '../../Entity';
import type { Component } from '../../Component';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import type { GridReader } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import { testAABBvsPolygon } from '../../../math/SATCollision';

export class KnockbackComponent implements Component {
  entity!: Entity;
  velocityX: number = 0;
  velocityY: number = 0;
  friction: number;
  duration: number;
  elapsed: number = 0;
  isActive: boolean = false;
  private readonly grid: GridReader;
  private readonly blockedAreaManager?: BlockedAreaManager;

  constructor(
    friction: number,
    duration: number,
    grid: GridReader,
    blockedAreaManager?: BlockedAreaManager
  ) {
    this.friction = friction;
    this.duration = duration;
    this.grid = grid;
    this.blockedAreaManager = blockedAreaManager;
  }

  applyKnockback(dirX: number, dirY: number, force: number): void {
    if (this.isActive) {
      return;
    }

    this.velocityX = dirX * force;
    this.velocityY = dirY * force;
    this.elapsed = 0;
    this.isActive = true;
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
    const moveX = this.velocityX * (delta / 1000);
    const moveY = this.velocityY * (delta / 1000);
    const newX = transform.x + moveX;
    const newY = transform.y + moveY;

    if (this.isPositionBlocked(newX, newY)) {
      this.stop();
      return;
    }

    transform.x = newX;
    transform.y = newY;

    const frictionPerFrame = Math.pow(this.friction, delta / 1000);
    this.velocityX *= frictionPerFrame;
    this.velocityY *= frictionPerFrame;

    if (Math.abs(this.velocityX) < 1 && Math.abs(this.velocityY) < 1 || this.elapsed >= this.duration) {
      this.stop();
    }
  }

  private isPositionBlocked(x: number, y: number): boolean {
    const gridPos = this.entity.get(GridPositionComponent);
    if (!gridPos) return false;

    const targetCell = this.grid.worldToCell(x, y);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);
    if (!cell || cell.layer !== gridPos.currentLayer || this.grid.isWall(cell) || cell.properties.has('blocked') || cell.properties.has('void')) {
      return true;
    }

    if (this.blockedAreaManager) {
      const box = gridPos.collisionBox;
      const aabb = {
        x: x + box.offsetX - box.width / 2,
        y: y + box.offsetY - box.height / 2,
        width: box.width,
        height: box.height,
      };
      const polygons = this.blockedAreaManager.getForLayer(gridPos.currentLayer);
      for (const polygon of polygons) {
        if (testAABBvsPolygon(aabb, polygon)) {
          return true;
        }
      }
    }

    return false;
  }

  onDestroy(): void {
    // Clean up
  }
}
