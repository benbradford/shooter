import type { Entity } from '../../Entity';
import type { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { LaserBeamComponent } from '../laser/LaserBeamComponent';

type CrouchPhase = 'crouching_down' | 'holding' | 'standing_up';

const CROUCH_COOLDOWN_MS = 2000;
const SHIVER_AMPLITUDE_PX = 1.5;
const SHIVER_INTERVAL_MS = 40;

export class EscortCrouchBehavior {
  private crouchPhase: CrouchPhase = 'holding';
  private crouchCooldownMs = 0;
  private shiverTimerMs = 0;

  constructor(
    private readonly entity: Entity,
    private readonly entityManager: EntityManager,
    private readonly enemyDetectDistancePx: number,
    private readonly playAnim: (key: string) => void,
  ) {}

  areEnemiesNearby(): boolean {
    const transform = this.entity.require(TransformComponent);
    for (const enemy of this.entityManager.getAll()) {
      if (enemy.isDestroyed || (!enemy.tags.has('enemy') && !enemy.tags.has('laser'))) continue;
      if (enemy.tags.has('laser')) {
        const laser = enemy.get(LaserBeamComponent);
        if (laser && !laser.isActive()) continue;
      }
      const et = enemy.get(TransformComponent);
      if (!et) continue;
      if (Math.hypot(et.x - transform.x, et.y - transform.y) <= this.enemyDetectDistancePx) {
        return true;
      }
    }
    return false;
  }

  startCrouch(): void {
    this.crouchPhase = 'crouching_down';
    this.crouchCooldownMs = 0;
    this.playAnim('crouch_forward');
  }

  /** Returns the state to transition to when crouch is done, or null if still crouching. */
  update(delta: number): 'done' | null {
    const anim = this.entity.require(AnimationComponent);

    if (this.crouchPhase === 'crouching_down') {
      if (anim.animationSystem.isOnLastFrame('crouch_forward')) {
        this.crouchPhase = 'holding';
      }
      return null;
    }

    if (this.crouchPhase === 'holding') {
      this.shiverTimerMs += delta;
      if (this.shiverTimerMs >= SHIVER_INTERVAL_MS) {
        this.shiverTimerMs = 0;
        const sprite = this.entity.require(SpriteComponent);
        sprite.sprite.x += (Math.random() - 0.5) * SHIVER_AMPLITUDE_PX * 2;
      }

      if (this.areEnemiesNearby()) {
        this.crouchCooldownMs = 0;
      } else {
        this.crouchCooldownMs += delta;
        if (this.crouchCooldownMs >= CROUCH_COOLDOWN_MS) {
          this.crouchPhase = 'standing_up';
          this.playAnim('crouch_reverse');
        }
      }
      return null;
    }

    // standing_up
    if (anim.animationSystem.isOnLastFrame('crouch_reverse')) {
      return 'done';
    }
    return null;
  }
}
