import type { Component } from '../Component';
import type { Entity } from '../Entity';

export class DamageComponent implements Component {
  entity!: Entity;
  public readonly damage: number;

  constructor(damage: number) {
    this.damage = damage;
  }

  update(_delta: number): void {}

  onDestroy(): void {}
}
