import type { Component } from '../Component';
import type { Entity } from '../Entity';

export class GridPositionComponent implements Component {
  entity!: Entity;
  
  public currentCell: { col: number; row: number };
  public previousCell: { col: number; row: number };
  
  // Collision box offset from entity center
  public collisionBox: {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  };

  constructor(
    col: number,
    row: number,
    collisionBox = { offsetX: 0, offsetY: 16, width: 32, height: 16 }
  ) {
    this.currentCell = { col, row };
    this.previousCell = { col, row };
    this.collisionBox = collisionBox;
  }

  update(_delta: number): void {
    // No-op: delta intentionally unused
  }

  onDestroy(): void {}
}
