import type { InputComponent } from '../../components/input/InputComponent';
import type { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import type { PetAbilityComponent } from '../../components/pet/PetAbilityComponent';
import type { WaterEffectComponent } from '../../components/visual/WaterEffectComponent';
import { CachedFlag } from '../../../systems/state/CachedFlag';

// Module-level cached flags — shared across player state classes.
// Lifetime is program lifetime (no cleanup needed).
const canPunchFlag = new CachedFlag('canPunch');
export const canPushFlag = new CachedFlag('canPush');

export function handlePunchInput(
  input: InputComponent,
  attackCombo: AttackComboComponent,
  waterEffect?: WaterEffectComponent
): boolean {
  // Can't punch while swimming or jumping into water
  if (waterEffect && (waterEffect.getIsInWater() || waterEffect.isHopping())) {
    return false;
  }
  
  const isPressed = input.isAttackPressed();
  attackCombo.checkAttackReleased(isPressed);

  if (isPressed) {
    if (input.tryNPCInteraction()) {
      return true;
    }
    if (canPunchFlag.get()) {
      attackCombo.tryStartPunch();
    }
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
  // Can't use pet ability while swimming or jumping into water
  if (waterEffect && (waterEffect.getIsInWater() || waterEffect.isHopping())) {
    return false;
  }
  
  if (input.isPetActionPressed() && petAbility.canUseAbility() && !attackCombo.isPunching()) {
    if (!petAbility.isAbilityHeld()) {
      petAbility.setAbilityHeld(true);
      petAbility.setAbilityHeldByKeyboard(true);
      petAbility.tryAbility();
    }
    return true;
  }

  if (!input.isPetActionPressed() && petAbility.isAbilityHeldByKeyboard()) {
    petAbility.setAbilityHeld(false);
    petAbility.setAbilityHeldByKeyboard(false);
  }

  return false;
}

