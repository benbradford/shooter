import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class FireballPropertiesComponent implements Component {
  entity!: Entity;
  speed: number;
  duration: number;

  constructor(speed: number, duration: number) {
    this.speed = speed;
    this.duration = duration;
  }

}
