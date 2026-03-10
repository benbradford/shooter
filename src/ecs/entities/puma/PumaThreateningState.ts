import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { dirFromDelta } from '../../../constants/Direction';
import { getPumaAnimKey } from './PumaAnimations';

export class PumaThreateningState implements IState {
  private elapsedMs = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly config: { angryDurationMs: number }
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const direction = dirFromDelta(dx, dy);

    const animKey = getPumaAnimKey('angry', direction);
    sprite.sprite.play(animKey);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const direction = dirFromDelta(dx, dy);

    const animKey = getPumaAnimKey('angry', direction);
    if (!sprite.sprite.anims.isPlaying || sprite.sprite.anims.currentAnim?.key !== animKey) {
      sprite.sprite.play(animKey);
    }

    if (this.elapsedMs >= this.config.angryDurationMs) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('chasing');
    }
  }
}
