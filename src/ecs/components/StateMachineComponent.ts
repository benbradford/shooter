import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';
import { StateMachine } from '../../utils/state/StateMachine';

export class StateMachineComponent implements Component {
  entity!: Entity;

  constructor(public stateMachine: StateMachine) {}

  update(delta: number): void {
    this.stateMachine.update(delta);
  }

  onDestroy(): void {}
}
