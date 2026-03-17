import type { InputComponent } from '../../components/input/InputComponent';
import type { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import type { PetAbilityComponent } from '../../components/pet/PetAbilityComponent';
import type { WaterEffectComponent } from '../../components/visual/WaterEffectComponent';

export function handlePunchInput(
  input: InputComponent,
  attackCombo: AttackComboComponent,
  waterEffect?: WaterEffectComponent
): boolean {
  // Can't punch while swimming or hopping
  if (waterEffect && (waterEffect.getIsInWater() || waterEffect.isHopping())) {
    return false;
  }
  
  const isPressed = input.isAttackPressed();
  attackCombo.checkAttackReleased(isPressed);

  if (isPressed) {
    if (input.tryNPCInteraction()) {
      return true;
    }
    attackCombo.tryStartPunch();
    return true;
  }

  if (attackCombo.isPunching()) {
    return true;
  }

  return false;
}

export function handlePetAbilityInput(
  input: InputComponent,
  petAbility: PetAbilityComponent,
  attackCombo: AttackComboComponent,
  waterEffect?: WaterEffectComponent
): boolean {
  // Can't use pet ability while swimming or hopping
  if (waterEffect && (waterEffect.getIsInWater() || waterEffect.isHopping())) {
    return false;
  }
  
  if (input.isPetActionPressed() && petAbility.canUseAbility() && !attackCombo.isPunching()) {
    petAbility.tryAbility();
    return true;
  }

  return false;
}

