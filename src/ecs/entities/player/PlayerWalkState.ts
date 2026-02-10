import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';

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
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const sm = this.entity.require(StateMachineComponent);
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
    
    const { dx, dy } = input.getInputDelta();

    if (dx === 0 && dy === 0 && !walk.isMoving()) {
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
