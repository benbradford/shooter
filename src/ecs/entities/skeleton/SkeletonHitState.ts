import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';

const HIT_DURATION_MS = 300;

export class SkeletonHitState implements IState {
  private elapsedMs = 0;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    this.elapsedMs = 0;
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= HIT_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('walk');
    }
  }
}
