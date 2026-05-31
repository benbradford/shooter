import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';

const HIT_DURATION_MS = 300;

export class BeetleHitState implements IState {
  private elapsedMs = 0;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    this.elapsedMs = 0;
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) sprite.sprite.anims.pause();
  }

  onExit(): void {
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) sprite.sprite.anims.resume();
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    const knockback = this.entity.get(KnockbackComponent);
    if (knockback?.isActive) return;

    if (this.elapsedMs >= HIT_DURATION_MS) {
      this.entity.require(StateMachineComponent).stateMachine.enter('wander');
    }
  }
}
