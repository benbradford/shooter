import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { dirFromDelta } from '../../../constants/Direction';
import { getThrowerAnimKey } from './ThrowerAnimations';

const HIT_DURATION_MS = 500;

export class ThrowerHitState implements IState {
  private elapsedMs: number = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const dir = dirFromDelta(dx, dy);
    
    const animKey = getThrowerAnimKey('hit', dir);
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.play(animKey);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= HIT_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('running');
    }
  }
}
