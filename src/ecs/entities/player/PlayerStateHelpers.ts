import type { InputComponent } from '../../components/input/InputComponent';
import type { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import type { SlideAbilityComponent } from '../../components/abilities/SlideAbilityComponent';
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
    attackCombo.tryStartPunch();
    return true;
  }

  if (attackCombo.isPunching()) {
    return true;
  }

  return false;
}

export function handleSlideInput(
  input: InputComponent,
  slide: SlideAbilityComponent,
  attackCombo: AttackComboComponent,
  waterEffect?: WaterEffectComponent
): boolean {
  // Can't slide while swimming or hopping
  if (waterEffect && (waterEffect.getIsInWater() || waterEffect.isHopping())) {
    return false;
  }
  
  if (slide.isActive()) {
    return true;
  }

  if (input.isSlidePressed() && slide.canSlide() && !attackCombo.isPunching()) {
    slide.trySlide();
    return true;
  }

  return false;
}
