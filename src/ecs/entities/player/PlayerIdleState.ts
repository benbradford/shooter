import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
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
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const input = this.entity.require(InputComponent);
    const attackCombo = this.entity.get(AttackComboComponent);
    
    if (attackCombo) {
      const isPressed = input.isAttackPressed();
      attackCombo.checkAttackReleased(isPressed);
      
      if (isPressed) {
        attackCombo.tryStartPunch();
        return;
      }

      if (attackCombo.isPunching()) {
        return;
      }
    }
    
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
