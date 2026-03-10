import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { dirFromDelta } from '../../../constants/Direction';
import { getPumaAnimKey } from './PumaAnimations';

export class PumaStandUpState implements IState {
  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity
  ) {}

  onEnter(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const direction = dirFromDelta(dx, dy);

    const animKey = getPumaAnimKey('standup', direction);
    sprite.sprite.play(animKey);
  }

  onUpdate(_delta: number): void {
    const sprite = this.entity.require(SpriteComponent);
    const stateMachine = this.entity.require(StateMachineComponent);

    if (!sprite.sprite.anims.isPlaying) {
      stateMachine.stateMachine.enter('threatening');
    }
  }
}
