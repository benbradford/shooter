import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';

export class RobotHitState implements IState {
  private readonly entity: Entity;
  private readonly hitDuration: number;
  private elapsedMs: number = 0;

  constructor(entity: Entity, hitDuration: number) {
    this.entity = entity;
    this.hitDuration = hitDuration;
  }

  onEnter(): void {
    this.elapsedMs = 0;

    const hitFlash = this.entity.get(HitFlashComponent);
    if (hitFlash) {
      hitFlash.flash(this.hitDuration);
    }
  }

  onExit(): void {
    const hitFlash = this.entity.get(HitFlashComponent);
    if (hitFlash) {
      hitFlash.stop();
    }
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    const stateMachine = this.entity.require(StateMachineComponent);
    const health = this.entity.require(HealthComponent);

    if (health.getHealth() <= 0) {
      stateMachine.stateMachine.enter('death');
      return;
    }

    if (this.elapsedMs >= this.hitDuration) {
      stateMachine.stateMachine.enter('stalking');
    }
  }
}
