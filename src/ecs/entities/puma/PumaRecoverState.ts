import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { dirFromDelta } from '../../../constants/Direction';
import { getPumaAnimKey } from './PumaAnimations';

const RECOVER_DURATION_MS = 500;

export class PumaRecoverState implements IState {
  private elapsedMs = 0;
  private velocityX = 0;
  private velocityY = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    
    const sprite = this.entity.require(SpriteComponent);

    this.velocityX = (this.entity as unknown as { jumpVelocityX: number }).jumpVelocityX || 0;
    this.velocityY = (this.entity as unknown as { jumpVelocityY: number }).jumpVelocityY || 0;

    const direction = dirFromDelta(this.velocityX, this.velocityY);
    const animKey = getPumaAnimKey('run', direction);
    sprite.sprite.play(animKey);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    const transform = this.entity.require(TransformComponent);
    const stateMachine = this.entity.require(StateMachineComponent);
    const sprite = this.entity.require(SpriteComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    const decayFactor = 1 - (this.elapsedMs / RECOVER_DURATION_MS);
    
    if (decayFactor > 0) {
      transform.x += this.velocityX * decayFactor * (delta / 1000);
      transform.y += this.velocityY * decayFactor * (delta / 1000);

      const dx = playerTransform.x - transform.x;
      const dy = playerTransform.y - transform.y;
      const direction = dirFromDelta(dx, dy);
      const animKey = getPumaAnimKey('run', direction);
      
      if (sprite.sprite.anims.currentAnim?.key !== animKey) {
        sprite.sprite.play(animKey);
      }
    }

    if (this.elapsedMs >= RECOVER_DURATION_MS) {
      stateMachine.stateMachine.enter('threatening');
    }
  }
}
