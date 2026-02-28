import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import { SlideAbilityComponent } from '../../components/abilities/SlideAbilityComponent';
import { WaterEffectComponent } from '../../components/visual/WaterEffectComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { handlePunchInput, handleSlideInput } from './PlayerStateHelpers';

export class PlayerWalkState implements IState {
  private lastAnimKey = '';

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const water = this.entity.get(WaterEffectComponent);
    const health = this.entity.require(HealthComponent);

    let prefix = 'walk';
    if (water?.getIsInWater()) prefix = 'swim';
    else if (health.isOverhealed()) prefix = 'run';
    this.lastAnimKey = `${prefix}_${walk.lastDir}`;
    anim.animationSystem.play(this.lastAnimKey);
  }


  onUpdate(_delta: number): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const sm = this.entity.require(StateMachineComponent);
    const input = this.entity.require(InputComponent);
    const attackCombo = this.entity.require(AttackComboComponent);
    const slide = this.entity.require(SlideAbilityComponent);
    const water = this.entity.get(WaterEffectComponent);
    const health = this.entity.require(HealthComponent);

    if (handleSlideInput(input, slide, attackCombo, water)) {
      return;
    }

    if (handlePunchInput(input, attackCombo, water)) {
      return;
    }

    const { dx, dy } = input.getInputDelta();

    if (dx === 0 && dy === 0 && !walk.isMoving()) {
      sm.stateMachine.enter('idle');
      return;
    }

    let prefix = 'walk';
    if (water?.getIsInWater()) prefix = 'swim';
    else if (health.isOverhealed()) prefix = 'run';
    const newKey = `${prefix}_${walk.lastDir}`;
    if (newKey !== this.lastAnimKey) {
      this.lastAnimKey = newKey;
      anim.animationSystem.play(newKey);
    }
  }
}
