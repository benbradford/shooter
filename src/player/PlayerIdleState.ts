import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { WalkComponent } from '../ecs/components/WalkComponent';
import { AnimationComponent } from '../ecs/components/AnimationComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { Direction } from '../constants/Direction';

export class PlayerIdleState implements IState {
  private lastDir: Direction = Direction.Down;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.get(WalkComponent)!;
    const anim = this.entity.get(AnimationComponent)!;
    this.lastDir = walk.lastDir;
    anim.animationSystem.play(`idle_${this.lastDir}`);
  }

  onExit(): void {}

  onUpdate(_delta: number): void {
    // No-op: delta intentionally unused
    const walk = this.entity.get(WalkComponent)!;
    const anim = this.entity.get(AnimationComponent)!;
    
    // Update idle direction if it changed (from input in WalkComponent)
    if (walk.lastDir !== this.lastDir) {
      console.log(`Idle: direction changed from ${this.lastDir} to ${walk.lastDir}`);
      this.lastDir = walk.lastDir;
      anim.animationSystem.play(`idle_${this.lastDir}`);
    }
    
    if (walk.isMoving()) {
      const sm = this.entity.get(StateMachineComponent)!;
      sm.stateMachine.enter('walk');
    }
  }
}
