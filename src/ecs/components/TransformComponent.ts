import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';

export class TransformComponent implements Component {
  entity!: Entity;

  constructor(
    public x: number,
    public y: number,
    public rotation: number = 0,
    public scale: number = 1
  ) {}

  update(delta: number): void {}

  onDestroy(): void {}
}
