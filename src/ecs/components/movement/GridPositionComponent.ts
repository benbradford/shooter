import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { CollisionBox } from '../combat/CollisionComponent';

export class GridPositionComponent implements Component {
  entity!: Entity;

  public currentCell: { col: number; row: number };
  public previousCell: { col: number; row: number };
  public currentLayer: number = 0;

  private readonly collisionBoxStack: CollisionBox[];

  get collisionBox(): CollisionBox {
    return this.collisionBoxStack[this.collisionBoxStack.length - 1];
  }

  constructor(
    col: number,
    row: number,
    collisionBox: CollisionBox
  ) {
    this.currentCell = { col, row };
    this.previousCell = { col, row };
    this.collisionBoxStack = [collisionBox];
  }

  pushCollisionBox(box: CollisionBox): void {
    this.collisionBoxStack.push(box);
  }

  popCollisionBox(): void {
    if (this.collisionBoxStack.length > 1) {
      this.collisionBoxStack.pop();
    }
  }

}
