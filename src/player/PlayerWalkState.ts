import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { WalkComponent } from '../ecs/components/WalkComponent';
import { AnimationComponent } from '../ecs/components/AnimationComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';

export class PlayerWalkState implements IState {
  private lastAnimKey = '';

  constructor(private entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.get(WalkComponent)!;
    const anim = this.entity.get(AnimationComponent)!;
    this.lastAnimKey = `walk_${walk.lastDir}`;
    anim.animationSystem.play(this.lastAnimKey);
  }

  onExit(): void {}

  onUpdate(delta: number): void {
    const walk = this.entity.get(WalkComponent)!;
    const anim = this.entity.get(AnimationComponent)!;
    const sm = this.entity.get(StateMachineComponent)!;

    if (!walk.isMoving()) {
      sm.stateMachine.enter('idle');
      return;
    }

    const newKey = `walk_${walk.lastDir}`;
    if (newKey !== this.lastAnimKey) {
      this.lastAnimKey = newKey;
      anim.animationSystem.play(newKey);
    }
  }
}
