import type { Entity } from '../ecs/Entity';
import { CollisionComponent } from '../ecs/components/combat/CollisionComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import type { Grid } from './grid/Grid';

export class CollisionSystem {
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugEnabled: boolean = false;

  constructor(scene: Phaser.Scene, grid: Grid) {
    this.scene = scene;
    this.grid = grid;
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (enabled && !this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(10000);
    }
  }

  // eslint-disable-next-line complexity -- Collision detection requires nested loops and multiple condition checks
  update(entities: Entity[]): void {
    // Clear debug graphics
    if (this.debugGraphics) {
      this.debugGraphics.clear();
    }

    // Get entities with collision component
    const collidables = entities.filter(e => e.has(CollisionComponent));

    // Use spatial partitioning for entities with GridPositionComponent
    const gridEntities: Entity[] = [];
    const nonGridEntities: Entity[] = [];

    for (const entity of collidables) {
      if (entity.has(GridPositionComponent)) {
        gridEntities.push(entity);
      } else {
        nonGridEntities.push(entity);
      }
    }

    // Check grid entities against nearby cells only
    for (const entityA of gridEntities) {
      const collisionA = entityA.get(CollisionComponent);
      const transformA = entityA.get(TransformComponent);
      const gridPosA = entityA.get(GridPositionComponent);
      if (!collisionA || !transformA || !gridPosA) continue;

      // Debug render collision box
      if (this.debugEnabled && this.debugGraphics) {
        this.renderCollisionBox(transformA, collisionA);
      }

      // Get nearby cells (current cell + 8 neighbors)
      const nearbyCells = this.getNearbyCells(gridPosA.currentCell.col, gridPosA.currentCell.row);
      const nearbyEntities = new Set<Entity>();

      for (const cell of nearbyCells) {
        const cellData = this.grid.getCell(cell.col, cell.row);
        if (!cellData) continue;

        for (const occupant of cellData.occupants) {
          if (occupant !== entityA) {
            nearbyEntities.add(occupant);
          }
        }
      }

      // Check collisions with nearby entities
      for (const entityB of nearbyEntities) {
        const collisionB = entityB.get(CollisionComponent);
        const transformB = entityB.get(TransformComponent);
        if (!collisionB || !transformB) continue;

        if (!this.shouldCollide(entityA, entityB, collisionA, collisionB)) continue;

        if (this.boxesOverlap(transformA, collisionA, transformB, collisionB)) {
          collisionA.onHit(entityB);
          collisionB.onHit(entityA);
        }
      }
    }

    // Check non-grid entities against all collidables (fallback for projectiles without grid position)
    for (const entityA of nonGridEntities) {
      const collisionA = entityA.get(CollisionComponent);
      const transformA = entityA.get(TransformComponent);
      if (!collisionA || !transformA) continue;

      if (this.debugEnabled && this.debugGraphics) {
        this.renderCollisionBox(transformA, collisionA);
      }

      for (const entityB of collidables) {
        if (entityA === entityB) continue;

        const collisionB = entityB.get(CollisionComponent);
        const transformB = entityB.get(TransformComponent);
        if (!collisionB || !transformB) continue;

        if (!this.shouldCollide(entityA, entityB, collisionA, collisionB)) continue;

        if (this.boxesOverlap(transformA, collisionA, transformB, collisionB)) {
          collisionA.onHit(entityB);
          collisionB.onHit(entityA);
        }
      }
    }
  }

  private getNearbyCells(col: number, row: number): Array<{ col: number; row: number }> {
    const cells: Array<{ col: number; row: number }> = [];

    // Current cell + 8 neighbors
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = col + dc;
        const r = row + dr;
        if (c >= 0 && c < this.grid.cols && r >= 0 && r < this.grid.rows) {
          cells.push({ col: c, row: r });
        }
      }
    }

    return cells;
  }

  private shouldCollide(
    entityA: Entity,
    entityB: Entity,
    collisionA: CollisionComponent,
    collisionB: CollisionComponent
  ): boolean {
    // Check if A can collide with B's tags
    const canAHitB = collisionA.collidesWith.some(tag => entityB.tags.has(tag));
    // Check if B can collide with A's tags
    const canBHitA = collisionB.collidesWith.some(tag => entityA.tags.has(tag));
    return canAHitB || canBHitA;
  }

  private boxesOverlap(
    transformA: TransformComponent,
    collisionA: CollisionComponent,
    transformB: TransformComponent,
    collisionB: CollisionComponent
  ): boolean {
    const boxA = {
      left: transformA.x + collisionA.box.offsetX,
      right: transformA.x + collisionA.box.offsetX + collisionA.box.width,
      top: transformA.y + collisionA.box.offsetY,
      bottom: transformA.y + collisionA.box.offsetY + collisionA.box.height
    };

    const boxB = {
      left: transformB.x + collisionB.box.offsetX,
      right: transformB.x + collisionB.box.offsetX + collisionB.box.width,
      top: transformB.y + collisionB.box.offsetY,
      bottom: transformB.y + collisionB.box.offsetY + collisionB.box.height
    };

    return boxA.left < boxB.right &&
           boxA.right > boxB.left &&
           boxA.top < boxB.bottom &&
           boxA.bottom > boxB.top;
  }

  private renderCollisionBox(transform: TransformComponent, collision: CollisionComponent): void {
    if (!this.debugGraphics) return;

    const x = transform.x + collision.box.offsetX;
    const y = transform.y + collision.box.offsetY;

    this.debugGraphics.lineStyle(2, 0x000000, 1);
    this.debugGraphics.strokeRect(x, y, collision.box.width, collision.box.height);
  }

  destroy(): void {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
  }
}
