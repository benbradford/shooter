import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { KnockbackComponent } from '../ecs/components/movement/KnockbackComponent';
import { dirFromDelta, directionToAnimationName } from '../constants/Direction';

const HIT_DURATION_MS = 300;

export class ThrowerHitState implements IState {
  private elapsedMs: number = 0;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    this.elapsedMs = 0;
    
    const knockback = this.entity.get(KnockbackComponent);
    if (knockback) {
      const dir = dirFromDelta(knockback.velocityX, knockback.velocityY);
      const dirName = directionToAnimationName(dir);
      const sprite = this.entity.require(SpriteComponent);
      sprite.sprite.play(`thrower_idle_${dirName}`);
    }
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= HIT_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('running');
    }
  }
}
