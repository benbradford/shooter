import type { IState } from '../../../utils/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { InputComponent } from '../../components/input/InputComponent';

export class PlayerWalkState implements IState {
  private lastAnimKey = '';

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    
    this.lastAnimKey = `walk_${walk.lastDir}`;
    anim.animationSystem.play(this.lastAnimKey);
  }


  onUpdate(_delta: number): void {
    // No-op: delta intentionally unused
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const sm = this.entity.require(StateMachineComponent);
    const input = this.entity.require(InputComponent);
    
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
