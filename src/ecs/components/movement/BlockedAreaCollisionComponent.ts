import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from './GridPositionComponent';
import { testAABBvsPolygon } from '../../../math/SATCollision';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';

export type BlockedAreaCollisionProps = {
  blockedAreaManager: BlockedAreaManager;
};

export class BlockedAreaCollisionComponent implements Component {
  entity!: Entity;
  private readonly blockedAreaManager: BlockedAreaManager;
  private hasWarned = false;

  constructor(props: BlockedAreaCollisionProps) {
    this.blockedAreaManager = props.blockedAreaManager;
  }

  update(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    const box = gridPos.collisionBox;

    const aabb = {
      x: transform.x + box.offsetX - box.width / 2,
      y: transform.y + box.offsetY - box.height / 2,
      width: box.width,
      height: box.height,
    };

    const polygons = this.blockedAreaManager.getForLayer(gridPos.currentLayer);

    for (const polygon of polygons) {
      const mtv = testAABBvsPolygon(aabb, polygon);
      if (mtv) {
        transform.x += mtv.x;
        transform.y += mtv.y;
        aabb.x += mtv.x;
        aabb.y += mtv.y;

        if (!this.hasWarned) {
          this.hasWarned = true;
          console.warn(`[BlockedArea] Entity pushed out of polygon ${polygon.id}`);
        }
      }
    }
  }
}
