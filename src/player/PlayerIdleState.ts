import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { WalkComponent } from '../ecs/components/WalkComponent';
import { AnimationComponent } from '../ecs/components/AnimationComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';

export class PlayerIdleState implements IState {
  constructor(private entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.get(WalkComponent)!;
    const anim = this.entity.get(AnimationComponent)!;
    anim.animationSystem.play(`idle_${walk.lastDir}`);
  }

  onExit(): void {}

  onUpdate(delta: number): void {
    const walk = this.entity.get(WalkComponent)!;
    if (walk.isMoving()) {
      const sm = this.entity.get(StateMachineComponent)!;
      sm.stateMachine.enter('walk');
    }
  }
}
