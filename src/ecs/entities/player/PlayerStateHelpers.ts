import type { InputComponent } from '../../components/input/InputComponent';
import type { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import type { SlideAbilityComponent } from '../../components/abilities/SlideAbilityComponent';

export function handlePunchInput(
  input: InputComponent,
  attackCombo: AttackComboComponent
): boolean {
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
  slide: SlideAbilityComponent
): boolean {
  if (slide.isActive()) {
    return true;
  }

  if (input.isSlidePressed() && slide.canSlide()) {
    slide.trySlide();
    return true;
  }

  return false;
}
