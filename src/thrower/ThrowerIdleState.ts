import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';

const DETECTION_RANGE_PX = 500;

export class ThrowerIdleState implements IState {
  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity
  ) {}

  onEnter(): void {
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.play('thrower_idle_south');
  }

  onUpdate(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance < DETECTION_RANGE_PX) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('running');
    }
  }
}
