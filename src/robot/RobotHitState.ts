import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { KnockbackComponent } from '../ecs/components/KnockbackComponent';

export class RobotHitState implements IState {
  private readonly entity: Entity;
  private readonly hitDuration: number = 1000; // 1 second (reduced from 2)
  private elapsed: number = 0;
  private readonly flashInterval: number = 100; // Flash every 100ms
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
      sprite.sprite.setTint(0xff0000); // Red tint
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
    if (this.flashTimer >= this.flashInterval) {
      this.flashTimer = 0;
      this.isRed = !this.isRed;
      if (this.isRed) {
        sprite.sprite.setTint(0xff0000);
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

    // After 2 seconds, return to stalking
    if (this.elapsed >= this.hitDuration) {
      stateMachine.stateMachine.enter('stalking');
    }
  }
}
