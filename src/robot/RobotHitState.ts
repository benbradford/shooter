import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';

// Hit state configuration
const HIT_FLASH_INTERVAL_MS = 100; // milliseconds
const HIT_TINT_COLOR = 0xff8888; // lighter red

export class RobotHitState implements IState {
  private readonly entity: Entity;
  private readonly hitDuration: number;
  private elapsedMs: number = 0;
  private flashTimerMs: number = 0;
  private isRed: boolean = false;

  constructor(entity: Entity, hitDuration: number) {
    this.entity = entity;
    this.hitDuration = hitDuration;
  }

  onEnter(): void {
    this.elapsedMs = 0;
    this.flashTimerMs = 0;
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
    this.elapsedMs += delta;
    this.flashTimerMs += delta;

    const stateMachine = this.entity.get(StateMachineComponent);
    const sprite = this.entity.get(SpriteComponent);
    const health = this.entity.get(HealthComponent);

    if (!stateMachine || !sprite) return;

    // Flash red
    if (this.flashTimerMs >= HIT_FLASH_INTERVAL_MS) {
      this.flashTimerMs = 0;
      this.isRed = !this.isRed;
      if (this.isRed) {
        sprite.sprite.setTint(HIT_TINT_COLOR);
      } else {
        sprite.sprite.clearTint();
      }
    }

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
