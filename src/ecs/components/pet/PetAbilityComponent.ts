import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { PetManager } from '../../../systems/PetManager';
import { PET_REGISTRY } from '../../entities/pet/PetConfig';
import { PetFollowComponent } from './PetFollowComponent';
import { DogBarkAbility } from './DogBarkAbility';
import { AttackComboComponent } from '../combat/AttackComboComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';

export class PetAbilityComponent implements Component {
  entity!: Entity;
  private cooldownMs = 0;
  
  update(delta: number): void {
    if (this.cooldownMs > 0) {
      this.cooldownMs -= delta;
    }
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
    if (this.cooldownMs > 0) return false;
    
    if (config.id === 'dog') {
      const petEntity = petManager.getActivePetEntity();
      const barkAbility = petEntity?.get(DogBarkAbility);
      if (!barkAbility || barkAbility.isActive()) return false;
      const target = barkAbility.getNearestEnemyInRange();
      if (!target) return false;
      barkAbility.activate(target);
      this.cooldownMs = config.abilityCooldownMs;
      return true;
    }
    
    this.cooldownMs = config.abilityCooldownMs;
    console.log(`[PET] ${config.id} ability activated!`);
    return true;
  }
  
  canUseAbility(): boolean {
    if (this.cooldownMs > 0) return false;
    
    const petManager = PetManager.getInstance();
    if (!petManager.isActive()) return false;
    
    const punch = this.entity.get(AttackComboComponent);
    if (punch?.isPunching()) return false;
    
    const water = this.entity.get(WaterEffectComponent);
    if (water?.getIsInWater()) return false;
    
    const follow = petManager.getActivePetEntity()?.get(PetFollowComponent);
    if (follow?.getIsTooFar()) return false;
    
    const petId = petManager.getSelectedPetId();
    if (petId === 'dog') {
      const petEntity = petManager.getActivePetEntity();
      const barkAbility = petEntity?.get(DogBarkAbility);
      if (!barkAbility || barkAbility.isActive()) return false;
      if (!barkAbility.getNearestEnemyInRange()) return false;
    }
    
    return true;
  }
  
  getCooldownRatio(): number {
    const petId = PetManager.getInstance().getSelectedPetId();
    if (!petId) return 0;
    
    const config = PET_REGISTRY[petId];
    return this.cooldownMs / config.abilityCooldownMs;
  }
}
