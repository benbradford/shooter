import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { CollisionBox } from '../combat/CollisionComponent';

export class GridPositionComponent implements Component {
  entity!: Entity;

  public currentCell: { col: number; row: number };
  public previousCell: { col: number; row: number };
  public currentLayer: number = 0;

  public collisionBox: CollisionBox;

  constructor(
    col: number,
    row: number,
    collisionBox: CollisionBox
  ) {
    this.currentCell = { col, row };
    this.previousCell = { col, row };
    this.collisionBox = collisionBox;
  }

}
