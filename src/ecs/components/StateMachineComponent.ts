import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { StateMachine } from '../../utils/state/StateMachine';

export class StateMachineComponent implements Component {
  entity!: Entity;

  constructor(public readonly stateMachine: StateMachine) {}

  update(delta: number): void {
    this.stateMachine.update(delta);
  }

  onDestroy(): void {}
}
