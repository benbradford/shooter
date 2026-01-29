import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class DamageComponent implements Component {
  entity!: Entity;
  
  constructor(public readonly damage: number) {}
}
