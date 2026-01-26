import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class GridCellBlocker implements Component {
  entity!: Entity;

  update?(_delta: number): void {
    // No update needed - static blocker
  }
}
