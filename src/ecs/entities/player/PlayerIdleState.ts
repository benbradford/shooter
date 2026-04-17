import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import { PetAbilityComponent } from '../../components/pet/PetAbilityComponent';
import { WaterEffectComponent } from '../../components/visual/WaterEffectComponent';
import { Direction } from '../../../constants/Direction';
import { handlePunchInput, handlePetAbilityInput } from './PlayerStateHelpers';
import { InteractionComponent } from '../../components/interaction/InteractionComponent';

export class PlayerIdleState implements IState {
  private lastDir: Direction = Direction.Down;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const water = this.entity.get(WaterEffectComponent);
    
    this.lastDir = walk.lastDir;
    const prefix = water?.getIsInWater() ? 'swim' : 'idle';
    anim.animationSystem.play(`${prefix}_${this.lastDir}`);
  }


  onUpdate(_delta: number): void {
    const interaction = this.entity.get(InteractionComponent);
    if (interaction?.isActive || this.entity.tags.has('interaction_active')) return;
    
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const input = this.entity.require(InputComponent);
    const attackCombo = this.entity.require(AttackComboComponent);
    const petAbility = this.entity.require(PetAbilityComponent);
    const water = this.entity.get(WaterEffectComponent);
    
    if (handlePetAbilityInput(input, petAbility, attackCombo, water)) {
      return;
    }
    
    if (handlePunchInput(input, attackCombo, water)) {
      return;
    }
    
    if (walk.lastDir !== this.lastDir) {
      this.lastDir = walk.lastDir;
      const prefix = water?.getIsInWater() ? 'swim' : 'idle';
      anim.animationSystem.play(`${prefix}_${this.lastDir}`);
    }
    
    if (walk.isMoving()) {
      const sm = this.entity.require(StateMachineComponent);
      sm.stateMachine.enter('walk');
    }
  }
}
