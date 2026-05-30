import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';

const HIT_DURATION_MS = 300;

export class BeetleHitState implements IState {
  private elapsedMs = 0;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    this.elapsedMs = 0;
  }

  onExit(): void {
    // no-op
  }

  update(delta: number): string | void {
    this.elapsedMs += delta;

    // Wait for knockback to finish
    const knockback = this.entity.get(KnockbackComponent);
    if (knockback?.isActive) return;

    if (this.elapsedMs >= HIT_DURATION_MS) {
      return 'wander';
    }
  }
}
