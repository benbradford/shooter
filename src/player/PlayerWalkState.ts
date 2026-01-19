import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { WalkComponent } from '../ecs/components/WalkComponent';
import { AnimationComponent } from '../ecs/components/AnimationComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { InputComponent } from '../ecs/components/InputComponent';

export class PlayerWalkState implements IState {
  private lastAnimKey = '';

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.get(WalkComponent)!;
    const anim = this.entity.get(AnimationComponent)!;
    this.lastAnimKey = `walk_${walk.lastDir}`;
    anim.animationSystem.play(this.lastAnimKey);
  }

  onExit(): void {}

  onUpdate(_delta: number): void {
    // No-op: delta intentionally unused
    const walk = this.entity.get(WalkComponent)!;
    const anim = this.entity.get(AnimationComponent)!;
    const sm = this.entity.get(StateMachineComponent)!;
    const input = this.entity.get(InputComponent)!;
    const { dx, dy } = input.getInputDelta();

    if (dx === 0 && dy === 0 && !walk.isMoving()) {
      sm.stateMachine.enter('idle');
      return;
    }

    // Keep animation at full speed if there's input, otherwise scale with velocity
    if (dx !== 0 || dy !== 0) {
      anim.animationSystem.setTimeScale(1);
    } else {
      const velocityMagnitude = walk.getVelocityMagnitude();
      const speedRatio = velocityMagnitude / walk.speed;
      anim.animationSystem.setTimeScale(speedRatio);
    }

    const newKey = `walk_${walk.lastDir}`;
    if (newKey !== this.lastAnimKey) {
      this.lastAnimKey = newKey;
      anim.animationSystem.play(newKey);
    }
  }
}
