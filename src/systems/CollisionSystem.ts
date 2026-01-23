import type { Entity } from '../ecs/Entity';
import { CollisionComponent } from '../ecs/components/CollisionComponent';
import { TransformComponent } from '../ecs/components/TransformComponent';

export class CollisionSystem {
  private readonly scene: Phaser.Scene;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugEnabled: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (enabled && !this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(10000);
    }
  }

  update(entities: Entity[]): void {
    // Clear debug graphics
    if (this.debugGraphics) {
      this.debugGraphics.clear();
    }

    // Get entities with collision component
    const collidables = entities.filter(e => e.has(CollisionComponent) && !e.markedForRemoval);

    // Check each pair once
    for (let i = 0; i < collidables.length; i++) {
      const entityA = collidables[i];
      const collisionA = entityA.get(CollisionComponent)!;
      const transformA = entityA.get(TransformComponent);
      if (!transformA) continue;

      // Debug render collision box
      if (this.debugEnabled && this.debugGraphics) {
        this.renderCollisionBox(transformA, collisionA);
      }

      for (let j = i + 1; j < collidables.length; j++) {
        const entityB = collidables[j];
        const collisionB = entityB.get(CollisionComponent)!;
        const transformB = entityB.get(TransformComponent);
        if (!transformB) continue;

        // Check if they should collide
        if (!this.shouldCollide(entityA, entityB, collisionA, collisionB)) continue;

        // Check if boxes overlap
        if (this.boxesOverlap(transformA, collisionA, transformB, collisionB)) {
          collisionA.onHit(entityB);
          collisionB.onHit(entityA);
        }
      }
    }
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
