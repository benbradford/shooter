import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class TransformComponent implements Component {
  entity!: Entity;

  constructor(
    public x: number,
    public y: number,
    public rotation: number = 0,
    public scale: number = 1
  ) {}

}
