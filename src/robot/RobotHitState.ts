import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { HitFlashComponent } from '../ecs/components/visual/HitFlashComponent';

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

    const stateMachine = this.entity.get(StateMachineComponent);
    const health = this.entity.get(HealthComponent);

    if (!stateMachine) return;

    // Check if dead
    if (health && health.getHealth() <= 0) {
      stateMachine.stateMachine.enter('death');
      return;
    }

    // After hit duration, return to stalking
    if (this.elapsedMs >= this.hitDuration) {
      stateMachine.stateMachine.enter('stalking');
    }
  }
}
