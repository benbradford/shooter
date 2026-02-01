import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { Direction } from '../../../constants/Direction';

export class PlayerIdleState implements IState {
  private lastDir: Direction = Direction.Down;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    
    this.lastDir = walk.lastDir;
    anim.animationSystem.play(`idle_${this.lastDir}`);
  }


  onUpdate(_delta: number): void {
    // No-op: delta intentionally unused
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    
    // Update idle direction if it changed (from input in WalkComponent)
    if (walk.lastDir !== this.lastDir) {
      this.lastDir = walk.lastDir;
      anim.animationSystem.play(`idle_${this.lastDir}`);
    }
    
    if (walk.isMoving()) {
      const sm = this.entity.get(StateMachineComponent);
      if (sm) {
        sm.stateMachine.enter('walk');
      }
    }
  }
}
