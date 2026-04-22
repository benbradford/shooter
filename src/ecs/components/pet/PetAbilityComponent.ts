import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { PetManager } from '../../../systems/PetManager';
import { PET_REGISTRY } from '../../entities/pet/PetConfig';
import { PetFollowComponent } from './PetFollowComponent';
import { DogBarkAbility } from './DogBarkAbility';
import { RockThrowAbility } from './RockThrowAbility';
import { AttackComboComponent } from '../combat/AttackComboComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';

export class PetAbilityComponent implements Component {
  entity!: Entity;
  private readonly cooldowns = new Map<string, number>();
  private abilityHeld = false;
  private abilityHeldByKeyboard = false;
  
  update(delta: number): void {
    for (const [key, value] of this.cooldowns) {
      if (value > 0) {
        this.cooldowns.set(key, value - delta);
      }
    }
  }

  isAbilityHeld(): boolean {
    return this.abilityHeld;
  }

  setAbilityHeld(held: boolean): void {
    this.abilityHeld = held;
  }

  startCooldown(): void {
    const petId = PetManager.getInstance().getSelectedPetId();
    if (petId) {
      this.cooldowns.set(petId, PET_REGISTRY[petId].abilityCooldownMs);
    }
  }

  isAbilityHeldByKeyboard(): boolean {
    return this.abilityHeldByKeyboard;
  }

  setAbilityHeldByKeyboard(held: boolean): void {
    this.abilityHeldByKeyboard = held;
  }
  
  tryAbility(): boolean {
    const petManager = PetManager.getInstance();
    if (!petManager.isActive()) return false;
    
    const punch = this.entity.get(AttackComboComponent);
    if (punch?.isPunching()) return false;
    
    const water = this.entity.get(WaterEffectComponent);
    if (water?.getIsInWater()) return false;
    
    const follow = petManager.getActivePetEntity()?.get(PetFollowComponent);
    if (follow?.getIsTooFar()) return false;
    
    const petId = petManager.getSelectedPetId();
    if (!petId) return false;
    
    const config = PET_REGISTRY[petId];
    if ((this.cooldowns.get(petId) ?? 0) > 0) return false;
    
    if (config.id === 'dog') {
      const petEntity = petManager.getActivePetEntity();
      const barkAbility = petEntity?.get(DogBarkAbility);
      if (!barkAbility || barkAbility.isActive()) return false;
      const target = barkAbility.getNearestEnemyInRange();
      barkAbility.activate(target);
      this.cooldowns.set(petId, config.abilityCooldownMs);
      return true;
    }

    if (config.id === 'rock') {
      const petEntity = petManager.getActivePetEntity();
      const throwAbility = petEntity?.get(RockThrowAbility);
      if (!throwAbility || throwAbility.isActive()) return false;
      throwAbility.activate();
      // Cooldown set by RockThrowAbility.returnToIdle(), not here
      return true;
    }
    
    this.cooldowns.set(petId, config.abilityCooldownMs);
    console.log(`[PET] ${config.id} ability activated!`);
    return true;
  }
  
  canUseAbility(): boolean {
    const petManager = PetManager.getInstance();
    if (!petManager.isActive()) return false;

    const petId = petManager.getSelectedPetId();
    if (!petId) return false;
    if ((this.cooldowns.get(petId) ?? 0) > 0) return false;
    
    const water = this.entity.get(WaterEffectComponent);
    if (water?.getIsInWater()) return false;
    
    const follow = petManager.getActivePetEntity()?.get(PetFollowComponent);
    if (follow?.getIsTooFar()) return false;
    
    if (petId === 'dog') {
      const petEntity = petManager.getActivePetEntity();
      const barkAbility = petEntity?.get(DogBarkAbility);
      if (!barkAbility || barkAbility.isActive()) return false;
    }
    if (petId === 'rock') {
      const petEntity = petManager.getActivePetEntity();
      const throwAbility = petEntity?.get(RockThrowAbility);
      if (throwAbility?.isActive()) return true; // Button stays active during throw (for hold detection)
      if (!throwAbility) return false;
    }
    
    return true;
  }
  
  getCooldownRatio(): number {
    const petId = PetManager.getInstance().getSelectedPetId();
    if (!petId) return 0;
    
    const config = PET_REGISTRY[petId];
    const remaining = this.cooldowns.get(petId) ?? 0;
    return remaining / config.abilityCooldownMs;
  }
}
