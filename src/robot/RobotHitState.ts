import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { KnockbackComponent } from '../ecs/components/KnockbackComponent';

// Hit state configuration
const HIT_DURATION = 1000; // milliseconds
const HIT_FLASH_INTERVAL = 100; // milliseconds
const HIT_TINT_COLOR = 0xff0000; // red

export class RobotHitState implements IState {
  private readonly entity: Entity;
  private elapsed: number = 0;
  private flashTimer: number = 0;
  private isRed: boolean = false;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  onEnter(): void {
    this.elapsed = 0;
    this.flashTimer = 0;
    this.isRed = false;

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.setTint(HIT_TINT_COLOR);
      this.isRed = true;
    }
  }

  onExit(): void {
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.clearTint();
    }
  }

  onUpdate(delta: number): void {
    this.elapsed += delta;
    this.flashTimer += delta;

    const stateMachine = this.entity.get(StateMachineComponent);
    const sprite = this.entity.get(SpriteComponent);
    const health = this.entity.get(HealthComponent);
    const knockback = this.entity.get(KnockbackComponent);

    if (!stateMachine || !sprite) return;

    // Flash red
    if (this.flashTimer >= HIT_FLASH_INTERVAL) {
      this.flashTimer = 0;
      this.isRed = !this.isRed;
      if (this.isRed) {
        sprite.sprite.setTint(HIT_TINT_COLOR);
      } else {
        sprite.sprite.clearTint();
      }
    }

    // Update knockback
    if (knockback) {
      (knockback as KnockbackComponent).update(delta);
    }

    // Check if dead
    if (health && (health as HealthComponent).getHealth() <= 0) {
      stateMachine.stateMachine.enter('death');
      return;
    }

    // After hit duration, return to stalking
    if (this.elapsed >= HIT_DURATION) {
      stateMachine.stateMachine.enter('stalking');
    }
  }
}
