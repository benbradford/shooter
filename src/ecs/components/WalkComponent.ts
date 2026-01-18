import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';
import type { TransformComponent } from './TransformComponent';
import type { InputComponent } from './InputComponent';
import { Direction, dirFromDelta } from '../../animation/Direction';

export class WalkComponent implements Component {
  entity!: Entity;
  public speed = 300;
  public lastDir: Direction = Direction.Down;

  constructor(
    private transformComp: TransformComponent,
    private inputComp: InputComponent
  ) {}

  update(delta: number): void {
    const { dx, dy } = this.inputComp.getInputDelta();
    
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      const ndx = dx / len;
      const ndy = dy / len;
      
      this.transformComp.x += ndx * this.speed * (delta / 1000);
      this.transformComp.y += ndy * this.speed * (delta / 1000);
      
      this.lastDir = dirFromDelta(dx, dy);
    }
  }

  onDestroy(): void {}

  isMoving(): boolean {
    const { dx, dy } = this.inputComp.getInputDelta();
    return dx !== 0 || dy !== 0;
  }
}
