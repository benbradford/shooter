import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class DifficultyComponent<T extends string = string> implements Component {
  entity!: Entity;

  constructor(public difficulty: T) {}
}
